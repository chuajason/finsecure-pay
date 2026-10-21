#!/usr/bin/env bash
# Run ONCE on the fresh Jenkins VM (Ubuntu 24.04) after SSH-ing in:
#   curl -fsSL https://raw.githubusercontent.com/csijc/finsecure-pay/main/jenkins/vm-bootstrap.sh | bash
# Installs Docker, clones the repo, builds the Jenkins controller image and starts it.
set -euo pipefail
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker "$USER"
export DOCKER_GID
DOCKER_GID=$(getent group docker | cut -d: -f3)
echo "Docker group id: $DOCKER_GID"
cd "$HOME"
[ -d finsecure-pay ] || git clone https://github.com/csijc/finsecure-pay.git
cd finsecure-pay/jenkins
sudo DOCKER_GID="$DOCKER_GID" docker compose up -d --build
echo
echo "Jenkins is starting. In about a minute, open http://$(curl -s -H 'Metadata-Flavor: Google' http://169.254.169.254/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip):8080"
echo "Initial admin password:"
sleep 45
sudo docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
