# Runbook and evidence checklist

Status: Phases 1 to 7 were completed on 9 and 10 November 2026. The screenshots
collected at each step are in `docs/evidence/`, named by task (T1 to T7). This runbook is
kept as the record of how the environment was built and as the procedure to rebuild it.
What remains is the recording (`docs/DEMO_SCRIPT.md`) and, after submission, the teardown.

Work through the phases in order. Each step says what to run and what to capture.
Expect about 6 to 8 hours of hands-on time across several sessions. Pause the cloud
resources between sessions with `scripts/gcp-pause.sh`.

Placeholders to replace once, in these files: `Jenkinsfile` (DOCKERHUB_USER,
GCP_PROJECT, NOTIFY_EMAIL) and `k8s/deployment.yaml` (REPLACE_DOCKERHUB_USER, which
Jenkins substitutes at deploy time anyway). The email addresses in
`monitoring/kube-prometheus-stack-values.yaml` are set; passwords are passed at install time.

## Things that went wrong, and the fix

- Pod stuck in `CreateContainerConfigError`, "container has runAsNonRoot and image has non-numeric user (app)": the image created its user by name. Fixed by `adduser -u 10001` in the Dockerfile and `runAsUser: 10001` in the pod securityContext (commit 780c928).
- GitHub Actions red with 16 CRITICAL CVEs in the image (Tomcat 10.1.40, Spring WebMVC 6.2.x): upgraded Spring Boot 3.4.5 to 4.1.1 and pinned `tomcat.version` 11.0.25 and `jackson-bom.version` 3.1.7. The gate was right.
- Grafana p95 panel "No data": Spring Boot does not publish histogram buckets by default. Fixed with `management.metrics.distribution.percentiles-histogram.http.server.requests: true` (build #8).
- Alert fired, no email: Alertmanager log showed `535 Username and Password not accepted`. The Gmail app password was wrong. `helm upgrade` with the right password delivered the queued email within a minute.
- Chart alerts (Watchdog, KubeSchedulerDown, KubeProxyDown) were routed to email: the default route receiver is now `null`; only `namespace=finsecure` reaches Gmail.
- `git pull` refused in Cloud Shell with divergent branches: a local commit duplicated one pushed from elsewhere. `git fetch && git reset --hard origin/main`.

---

## Phase 1: Application and Git (Task 1)

1.1 Clone the repository and run the tests locally (Java 21 and Maven, or use the Docker build).

```bash
git clone https://github.com/chuajason/finsecure-pay.git && cd finsecure-pay
mvn -B test
```

Capture **T1-tests.png**: terminal showing `Tests run: 15, Failures: 0`.

1.2 Run the app and hit both endpoints.

```bash
mvn -B -DskipTests package && java -jar target/finsecure-pay.jar
# second terminal
curl -s http://localhost:8080/health
curl -s -X POST http://localhost:8080/validate -H 'Content-Type: application/json' \
  -d '{"transactionId":"tx-1","accountId":"acc-1","amount":250.00,"currency":"SGD","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
curl -s -X POST http://localhost:8080/validate -H 'Content-Type: application/json' \
  -d '{"transactionId":"tx-2","accountId":"acc-1","amount":99999.00,"currency":"JPY","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
```

Capture **T1-endpoints.png**: the three responses (health, APPROVED, REJECTED with two reasons).

1.3 Capture **T1-github.png**: the repository page with the commit history, and **T1-actions.png**: the green `build-verify` run under Actions.

---

## Phase 2: Container (Task 2)

```bash
docker build --build-arg APP_VERSION=1.0.0 -t <dockerhub-user>/finsecure-pay:1.0.0 .
docker run -d --name fsp -p 8080:8080 <dockerhub-user>/finsecure-pay:1.0.0
curl -s http://localhost:8080/health
docker ps --filter name=fsp
docker login
docker push <dockerhub-user>/finsecure-pay:1.0.0
docker rm -f fsp
```

Capture **T2-build.png** (build output ending in the tag), **T2-run-health.png** (`docker ps` plus the health response showing version 1.0.0), **T2-dockerhub.png** (the tag on hub.docker.com).

---

## Phase 3: Google Cloud and Kubernetes (Task 3)

3.1 In Google Cloud Shell (console.cloud.google.com, terminal icon top right), with a project selected and billing enabled:

```bash
git clone https://github.com/chuajason/finsecure-pay.git && cd finsecure-pay
PROJECT_ID=$(gcloud config get-value project) scripts/gcp-setup.sh
```

About 6 minutes. Note the Jenkins VM IP it prints.

3.2 Deploy the first version by hand, before Jenkins, so you understand each object.

```bash
gcloud container clusters get-credentials finsecure-gke --zone asia-southeast1-a
sed -i 's/REPLACE_DOCKERHUB_USER/<dockerhub-user>/' k8s/deployment.yaml
kubectl apply -f k8s/namespace.yaml
kubectl -n finsecure create secret generic finsecure-pay-secrets --from-literal=FINSECURE_API_KEY="$(openssl rand -hex 16)"
kubectl apply -f k8s/configmap.yaml -f k8s/service.yaml -f k8s/pdb.yaml -f k8s/deployment.yaml
kubectl -n finsecure rollout status deployment/finsecure-pay
kubectl -n finsecure get pods -o wide
kubectl -n finsecure get svc finsecure-pay        # wait until EXTERNAL-IP is assigned
```

Capture **T3-pods.png** (2 pods Running and READY 1/1), **T3-svc.png** (Service with external IP), and **T3-external.png**: `curl http://<EXTERNAL-IP>/health` from Cloud Shell and the same URL in your browser. The response includes `apiKeyConfigured: true`, which proves the Secret was injected without showing its value. The Deployment marks the Secret as required, so a missing Secret keeps pods from starting rather than silently running without it.

3.3 Probes and config evidence:

```bash
kubectl -n finsecure describe pod <one-pod-name> | grep -A3 -E "Liveness|Readiness|Startup"
kubectl -n finsecure get configmap finsecure-pay-config -o yaml
```

Capture **T3-probes.png** and **T3-configmap.png**.

3.4 Automatic recovery:

```bash
kubectl -n finsecure get pods -w     # leave running in one terminal
kubectl -n finsecure delete pod <one-pod-name>   # in another
```

Capture **T3-recovery.png**: the watch output showing the old pod Terminating and a new one Pending, ContainerCreating, Running, with 2 pods back within about a minute.

---

## Phase 4: Jenkins pipeline (Task 4)

4.1 Bootstrap Jenkins on the VM (from Cloud Shell):

```bash
gcloud compute ssh jenkins-vm --zone asia-southeast1-a
# on the VM:
curl -fsSL https://raw.githubusercontent.com/chuajason/finsecure-pay/main/jenkins/vm-bootstrap.sh | bash
```

About 8 minutes (it builds the controller image). It prints the URL and the initial admin password.

4.2 Open `http://<VM-IP>:8080`, paste the password, choose **Select plugins to install** and keep the defaults (the needed ones are already baked in), create your admin user.

4.3 Credentials: Manage Jenkins, Credentials, System, Global:
- Username with password, ID `dockerhub-creds`: your Docker Hub username and an **access token** (hub.docker.com, Account settings, Personal access tokens, Read and Write).

4.4 Email: Manage Jenkins, System, **Extended E-mail Notification**: SMTP server `smtp.gmail.com`, port 587, Use TLS, credentials = your Gmail address plus a Gmail **app password** (Google Account, Security, 2-Step Verification, App passwords). Set the default recipients to your address. Also fill **E-mail Notification** (the basic one) the same way and use "Test configuration". Capture **T6-jenkins-email-test.png**.

4.5 Pipeline job: New Item, name `finsecure-pay`, type **Pipeline**. Under Pipeline: Definition "Pipeline script from SCM", SCM Git, URL `https://github.com/chuajason/finsecure-pay.git`, branch `*/main`, script path `Jenkinsfile`. Tick **GitHub hook trigger for GITScm polling**. Save.

4.6 GitHub webhook: repository Settings, Webhooks, Add: Payload URL `http://<VM-IP>:8080/github-webhook/`, content type `application/json`, just the push event. GitHub shows a green tick after the ping.

4.7 First run: click **Build Now**. Capture **T4-pipeline-success.png** (stage view, all green) and **T4-console-deploy.png** (console lines for the Deploy and Smoke Test stages showing the rollout and the live version).

4.8 Failed test must not deploy:

```bash
scripts/demo-failing-test.sh break      # commits and pushes
```

Jenkins triggers from the webhook. Capture **T4-failed-test.png**: stage view red at Test with Deploy never run, plus the test report showing `DemoFailingTest.controlledFailure`. Confirm with `curl http://<EXTERNAL-IP>/health` that the previous version is still live. Then:

```bash
scripts/demo-failing-test.sh fix
```

4.9 New version rollout: edit `pom.xml` version `1.0.0` to `1.1.0`, commit, push. Capture **T4-rollout.png**: console output of `rollout status` plus `curl /health` showing `1.1.0-<build>-<sha>`.

```bash
kubectl -n finsecure rollout history deployment/finsecure-pay
```

4.10 Rollback: run the job with **Build with Parameters**, ROLLBACK ticked. Capture **T4-rollback.png**: console showing `rollout undo`, and `curl /health` showing the 1.0.0 build again. Then run a normal build so 1.1.0 is live for the rest of the demo.

---

## Phase 5: Security gates (Task 5)

5.1 Normal run evidence: from the last successful build, open the archived artefacts `reports/trivy-fs.txt` and `reports/trivy-image.txt`, and the SpotBugs step in the console. Capture **T5-scan-reports.png**.

5.2 Blocked release:

```bash
scripts/demo-security-finding.sh break      # adds log4j-core 2.14.1
```

Capture **T5-blocked.png**: stage view red at Security Checks, Container Build and later stages not run, console showing `CVE-2021-44228 CRITICAL`. Then:

```bash
scripts/demo-security-finding.sh fix
```

Capture **T5-remediated.png**: the next build green with the Trivy table showing 0 CRITICAL.

5.3 Secrets evidence. Capture **T5-secrets.png** showing all of these together:

- the Jenkins credentials page (values masked);
- `kubectl -n finsecure get secret finsecure-pay-secrets` (name and DATA count only) next to the `/health` response showing `apiKeyConfigured: true`;
- the `reports/trivy-fs.txt` secret scan section from the last build showing no secrets found in the repository.

The words password and token do appear in the repository as variable names (`passwordVariable`, `smtp_auth_password`); the evidence is that no literal values do.

---

## Phase 6: Monitoring, alerting, logging (Task 6)

6.1 Install the stack (from Cloud Shell):

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
kubectl create namespace monitoring
read -s -p "Grafana admin password: " GRAFANA_PW; echo
read -s -p "Gmail app password (16 chars, no spaces): " SMTP_PW; echo
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack -n monitoring \
  -f monitoring/kube-prometheus-stack-values.yaml \
  --set grafana.adminPassword="$GRAFANA_PW" \
  --set alertmanager.config.global.smtp_auth_password="$SMTP_PW"
kubectl apply -f k8s/servicemonitor.yaml -f monitoring/prometheus-rules.yaml -f monitoring/grafana-dashboard-configmap.yaml
kubectl -n monitoring get svc monitoring-grafana     # external IP for Grafana
```

Do not commit the edited values file with your email in it if you prefer; the placeholders are fine in Git.

6.2 Open Grafana (admin / your password). Dashboards, FinSecure Pay. Generate traffic so the panels fill:

```bash
scripts/load.sh http://<EXTERNAL-IP> 300 20     # 5 minutes, 20 percent rejected
```

Capture **T6-dashboard.png** with at least request rate, validation outcomes and p95 latency showing live data. Also Explore, data source Prometheus, query `up{job="finsecure-pay"}` for **T6-metrics.png**.

6.3 Alert configuration: Grafana, Alerting, Alert rules (or Prometheus UI, Alerts) showing the four `FinSecurePay*` rules. Capture **T6-alert-rules.png**.

6.4 Trigger an alert deliberately:

```bash
scripts/load.sh http://<EXTERNAL-IP> 360 80     # 80 percent rejected for 6 minutes
```

After about 3 to 4 minutes `FinSecurePayHighRejectionRate` goes Pending then Firing (the rule uses a 2 minute rate and must hold for 2 more minutes; Alertmanager then waits 30 seconds before the email). Capture **T6-alert-firing.png** (Prometheus Alerts page, state FIRING) and **T6-alert-email.png** (the Alertmanager email in your inbox). Alternatively scale to zero for the critical alert: `kubectl -n finsecure scale deployment finsecure-pay --replicas=0`, wait 2 minutes, capture, then scale back to 2.

6.5 Jenkins notification: the emails from 4.7 and 4.8. Capture **T6-jenkins-email.png** (a SUCCESS and a FAILED email).

6.6 Logging:

```bash
kubectl -n finsecure logs deployment/finsecure-pay --tail=20
kubectl -n finsecure logs -l app=finsecure-pay --since=5m | grep REJECTED | head
```

Capture **T6-logs-kubectl.png**. Centralised logging uses GKE's built-in Cloud Logging (the cluster was created with workload logging on, which is the cloud-native option the brief allows). In the Google Cloud console open Logs Explorer and run:

```
resource.type="k8s_container"
resource.labels.namespace_name="finsecure"
textPayload=~"REJECTED"
```

Capture **T6-logs-cloud.png** showing the structured entries with pod name, timestamp and the rejection reasons. This is the troubleshooting path documented in the design document: `kubectl logs` for a single pod right now, Logs Explorer for all pods over time.

---

## Phase 7: AI use case (Task 7)

```bash
kubectl -n monitoring port-forward svc/monitoring-kube-prometheus-prometheus 9090:9090 &
pip install -r ai/requirements.txt
python ai/anomaly_watch.py --prometheus http://localhost:9090 --minutes 120 --plot
```

Run it after the alert demo in 6.4 so the 80 percent rejection window is in the data (use `--minutes 60` if the demo was within the hour). Capture **T7-anomaly-output.png** (terminal with the anomaly windows) and download `ai/anomaly_watch.png` with `cloudshell download ai/anomaly_watch.png` as **T7-anomaly-plot.png**.

---

## Demo recording (10 to 15 minutes)

Follow `docs/DEMO_SCRIPT.md`: a timed script of about 12 minutes that walks the 10 slides in `docs/FinSecure_Pay_Capstone.pptx`, starts one live pipeline run at the beginning (by editing `docs/DEMO_LOG.md` on GitHub) and returns to it at the end, with live cuts to Jenkins, Cloud Shell, Grafana, Gmail and Logs Explorer in between.

---

## Cost control

Between sessions, from Cloud Shell:

```bash
export PROJECT_ID=$(gcloud config get-value project)
scripts/gcp-pause.sh                              # stop the VM, scale the app to 0, scale nodes to zero
MY_IP=<your public IP> scripts/gcp-pause.sh resume   # refresh the Jenkins firewall for your current IP, then bring everything back (about 5 to 8 minutes)
```

Pause scales the Deployment to 0 before resizing the node pool, because the PodDisruptionBudget (minAvailable 1) otherwise blocks the drain of the last pod and the resize hangs. Resume reverses it: nodes back to 2, waits for them to be Ready, scales the Deployment to 2 (or the HPA minimum if one exists) and waits for the rollout. If resume is interrupted, finish by hand with `kubectl -n finsecure scale deployment/finsecure-pay --replicas=2` and `kubectl -n finsecure rollout status deployment/finsecure-pay`.

Get the IP from whatismyip.com in your browser, not from Cloud Shell. Static addresses do not change: Jenkins http://34.126.137.15:8080, app http://35.197.154.237, Grafana http://34.177.101.0.

After submission: `scripts/gcp-teardown.sh` with `PROJECT_ID` still exported, then check Billing for anything still running. The Jenkins firewall rule allows port 8080 only from your public IP and from GitHub's webhook ranges, and is deleted by the teardown.
