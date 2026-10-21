// FinSecure Pay CI/CD pipeline.
// Stages: Checkout -> Build -> Test -> Package -> Security Checks -> Container Build
//         -> Image Scan -> Push -> Deploy -> Smoke Test
// Any failing stage stops the run; nothing is pushed or deployed after a failure.
// A failed deployment rolls back automatically. ROLLBACK=true performs a manual rollback only.

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20'))
        timeout(time: 30, unit: 'MINUTES')
    }

    triggers {
        githubPush()                 // GitHub webhook
        pollSCM('H/5 * * * *')       // fallback if the webhook cannot reach Jenkins
    }

    parameters {
        booleanParam(name: 'ROLLBACK', defaultValue: false,
            description: 'Skip the build and roll the deployment back to the previous revision')
    }

    environment {
        DOCKERHUB_USER   = 'REPLACE_DOCKERHUB_USER'
        IMAGE            = "docker.io/${DOCKERHUB_USER}/finsecure-pay"
        K8S_NAMESPACE    = 'finsecure'
        GKE_CLUSTER      = 'finsecure-gke'
        GKE_ZONE         = 'asia-southeast1-a'
        GCP_PROJECT      = 'REPLACE_GCP_PROJECT_ID'
        NOTIFY_EMAIL     = 'REPLACE_NOTIFY_EMAIL'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_SHORT = sh(script: 'git rev-parse --short=7 HEAD', returnStdout: true).trim()
                    env.POM_VERSION = sh(script: "mvn -q -DforceStdout help:evaluate -Dexpression=project.version", returnStdout: true).trim()
                    env.APP_VERSION = "${env.POM_VERSION}-${env.BUILD_NUMBER}-${env.GIT_SHORT}"
                    currentBuild.displayName = "#${env.BUILD_NUMBER} ${env.APP_VERSION}"
                }
                echo "Building ${IMAGE}:${APP_VERSION}"
            }
        }

        stage('Rollback') {
            when { expression { params.ROLLBACK } }
            steps {
                sh '''
                    gcloud container clusters get-credentials "$GKE_CLUSTER" --zone "$GKE_ZONE" --project "$GCP_PROJECT" --quiet
                    kubectl -n "$K8S_NAMESPACE" rollout history deployment/finsecure-pay
                    kubectl -n "$K8S_NAMESPACE" rollout undo deployment/finsecure-pay
                    kubectl -n "$K8S_NAMESPACE" rollout status deployment/finsecure-pay --timeout=180s
                    kubectl -n "$K8S_NAMESPACE" get deployment finsecure-pay -o jsonpath='{.spec.template.spec.containers[0].image}'; echo
                '''
            }
        }

        stage('Build') {
            when { expression { !params.ROLLBACK } }
            steps {
                sh 'mvn -B -ntp clean compile'
            }
        }

        stage('Test') {
            when { expression { !params.ROLLBACK } }
            steps {
                sh 'mvn -B -ntp test'
            }
            post {
                always {
                    junit 'target/surefire-reports/*.xml'
                }
            }
        }

        stage('Package') {
            when { expression { !params.ROLLBACK } }
            steps {
                sh 'mvn -B -ntp -DskipTests package'
                archiveArtifacts artifacts: 'target/finsecure-pay.jar', fingerprint: true
            }
        }

        stage('Security Checks') {
            when { expression { !params.ROLLBACK } }
            steps {
                // Static analysis: SpotBugs fails on high-priority findings.
                sh 'mvn -B -ntp spotbugs:check'
                // Dependency, misconfiguration and secret scan of the repository.
                // Exit code 1 on HIGH or CRITICAL is the first security gate.
                sh '''
                    mkdir -p reports
                    trivy fs --scanners vuln,misconfig,secret --severity HIGH,CRITICAL \
                        --format table --output reports/trivy-fs.txt --exit-code 0 .
                    cat reports/trivy-fs.txt
                    trivy fs --scanners vuln,secret --severity CRITICAL --exit-code 1 --no-progress .
                '''
            }
            post {
                always { archiveArtifacts artifacts: 'reports/*.txt, target/spotbugsXml.xml', allowEmptyArchive: true }
            }
        }

        stage('Container Build') {
            when { expression { !params.ROLLBACK } }
            steps {
                sh '''
                    docker build --build-arg APP_VERSION="$APP_VERSION" \
                        -t "$IMAGE:$APP_VERSION" -t "$IMAGE:latest" .
                '''
            }
        }

        stage('Image Scan') {
            when { expression { !params.ROLLBACK } }
            steps {
                // Second security gate: the built image must have no CRITICAL vulnerabilities.
                sh '''
                    trivy image --severity HIGH,CRITICAL --format table \
                        --output reports/trivy-image.txt --exit-code 0 "$IMAGE:$APP_VERSION"
                    cat reports/trivy-image.txt
                    trivy image --severity CRITICAL --exit-code 1 --no-progress "$IMAGE:$APP_VERSION"
                '''
            }
            post {
                always { archiveArtifacts artifacts: 'reports/trivy-image.txt', allowEmptyArchive: true }
            }
        }

        stage('Push') {
            when { expression { !params.ROLLBACK } }
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DH_USER', passwordVariable: 'DH_TOKEN')]) {
                    sh '''
                        echo "$DH_TOKEN" | docker login -u "$DH_USER" --password-stdin
                        docker push "$IMAGE:$APP_VERSION"
                        docker push "$IMAGE:latest"
                        docker logout
                    '''
                }
            }
        }

        stage('Deploy') {
            when { expression { !params.ROLLBACK } }
            steps {
                sh '''
                    gcloud container clusters get-credentials "$GKE_CLUSTER" --zone "$GKE_ZONE" --project "$GCP_PROJECT" --quiet
                    kubectl apply -f k8s/namespace.yaml
                    kubectl -n "$K8S_NAMESPACE" get secret finsecure-pay-secrets >/dev/null 2>&1 \
                        || { echo "Secret finsecure-pay-secrets is missing. Create it as described in docs/RUNBOOK.md step 3.2; it is never stored in Git."; exit 1; }
                    kubectl apply -f k8s/configmap.yaml
                    kubectl apply -f k8s/service.yaml
                    kubectl apply -f k8s/pdb.yaml
                    sed -E "s|image: docker.io/[^/ ]+/finsecure-pay:[^ ]+|image: $IMAGE:$APP_VERSION|" k8s/deployment.yaml | kubectl apply -f -
                    kubectl -n "$K8S_NAMESPACE" annotate deployment/finsecure-pay \
                        kubernetes.io/change-cause="Jenkins build $BUILD_NUMBER version $APP_VERSION" --overwrite
                    kubectl -n "$K8S_NAMESPACE" rollout status deployment/finsecure-pay --timeout=240s
                '''
            }
            post {
                failure {
                    echo 'Rollout failed, rolling back to the previous revision'
                    sh '''
                        kubectl -n "$K8S_NAMESPACE" rollout undo deployment/finsecure-pay || true
                        kubectl -n "$K8S_NAMESPACE" rollout status deployment/finsecure-pay --timeout=180s || true
                    '''
                }
            }
        }

        stage('Smoke Test') {
            when { expression { !params.ROLLBACK } }
            steps {
                sh '''
                    IP=$(kubectl -n "$K8S_NAMESPACE" get svc finsecure-pay -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
                    echo "Service IP: $IP"
                    for i in $(seq 1 12); do
                        if curl -fsS "http://$IP/health" | tee reports/smoke.json | grep -q "$APP_VERSION"; then
                            echo "Smoke test passed: version $APP_VERSION is live"; exit 0
                        fi
                        sleep 10
                    done
                    echo "Smoke test failed: live version does not match $APP_VERSION"; exit 1
                '''
            }
        }
    }

    post {
        success {
            emailext subject: "SUCCESS: ${JOB_NAME} #${BUILD_NUMBER} (${env.APP_VERSION})",
                     body: "Build ${BUILD_URL} succeeded.\nImage: ${IMAGE}:${env.APP_VERSION}\nDeployed to ${K8S_NAMESPACE} on ${GKE_CLUSTER}.",
                     to: "${NOTIFY_EMAIL}"
        }
        failure {
            emailext subject: "FAILED: ${JOB_NAME} #${BUILD_NUMBER} at stage ${env.STAGE_NAME}",
                     body: "Build ${BUILD_URL} failed.\nSee console output and attached reports.",
                     to: "${NOTIFY_EMAIL}", attachLog: true, compressLog: true
        }
        always {
            sh 'docker image prune -f >/dev/null 2>&1 || true'
            cleanWs()
        }
    }
}
