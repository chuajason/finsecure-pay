# Jenkins controller with the tools the pipeline needs on the built-in node:
# Maven + JDK 21, Docker CLI (daemon is the VM's, via mounted socket), kubectl with the
# GKE auth plugin, gcloud, and Trivy. Built and run by jenkins/vm-bootstrap.sh.
FROM jenkins/jenkins:lts-jdk21

USER root
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl gnupg apt-transport-https lsb-release maven git wget \
    # Docker CLI only
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list \
    # Google Cloud CLI + GKE auth plugin + kubectl
    && curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" > /etc/apt/sources.list.d/google-cloud-sdk.list \
    # Trivy
    && curl -fsSL https://aquasecurity.github.io/trivy-repo/deb/public.key | gpg --dearmor -o /usr/share/keyrings/trivy.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/trivy.gpg] https://aquasecurity.github.io/trivy-repo/deb generic main" > /etc/apt/sources.list.d/trivy.list \
    && apt-get update && apt-get install -y --no-install-recommends \
        docker-ce-cli google-cloud-cli google-cloud-cli-gke-gcloud-auth-plugin kubectl trivy \
    && rm -rf /var/lib/apt/lists/*

# Let the jenkins user talk to the mounted Docker socket (GID is fixed by the compose file).
ARG DOCKER_GID=988
RUN groupadd -g ${DOCKER_GID} docker || true && usermod -aG docker jenkins
ENV USE_GKE_GCLOUD_AUTH_PLUGIN=True

# Plugins installed at build time so the controller is reproducible.
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt

USER jenkins
