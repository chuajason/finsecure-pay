#!/usr/bin/env bash
# Creates everything in Google Cloud for the capstone. Run from Cloud Shell or any
# machine with gcloud logged in. Idempotent enough to re-run.
# Usage: PROJECT_ID=my-project scripts/gcp-setup.sh
set -euo pipefail
: "${PROJECT_ID:?set PROJECT_ID}"
ZONE="${ZONE:-asia-southeast1-a}"
CLUSTER="${CLUSTER:-finsecure-gke}"
VM="${VM:-jenkins-vm}"

gcloud config set project "$PROJECT_ID"
gcloud services enable container.googleapis.com compute.googleapis.com

echo "== GKE cluster (zonal, 2 x e2-medium, free control plane tier for one zonal cluster)"
gcloud container clusters describe "$CLUSTER" --zone "$ZONE" >/dev/null 2>&1 || \
gcloud container clusters create "$CLUSTER" --zone "$ZONE" \
  --num-nodes 2 --machine-type e2-medium --disk-size 30 --disk-type pd-standard \
  --release-channel regular --enable-ip-alias --no-enable-basic-auth \
  --workload-pool="$PROJECT_ID.svc.id.goog" --logging=SYSTEM,WORKLOAD --monitoring=SYSTEM

echo "== Service account for the Jenkins VM (least privilege: deploy to GKE only)"
SA="jenkins-deployer@$PROJECT_ID.iam.gserviceaccount.com"
gcloud iam service-accounts describe "$SA" >/dev/null 2>&1 || \
gcloud iam service-accounts create jenkins-deployer --display-name "Jenkins deployer"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$SA" --role roles/container.developer --quiet >/dev/null

echo "== Jenkins VM (e2-medium, Ubuntu 24.04)"
gcloud compute instances describe "$VM" --zone "$ZONE" >/dev/null 2>&1 || \
gcloud compute instances create "$VM" --zone "$ZONE" --machine-type e2-medium \
  --image-family ubuntu-2404-lts-amd64 --image-project ubuntu-os-cloud --boot-disk-size 30GB \
  --service-account "$SA" --scopes cloud-platform --tags jenkins

echo "== Firewall: Jenkins UI and webhook on 8080"
gcloud compute firewall-rules describe allow-jenkins-8080 >/dev/null 2>&1 || \
gcloud compute firewall-rules create allow-jenkins-8080 --allow tcp:8080 --target-tags jenkins --source-ranges 0.0.0.0/0

echo
echo "Jenkins VM external IP: $(gcloud compute instances describe "$VM" --zone "$ZONE" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')"
echo "Next: gcloud compute ssh $VM --zone $ZONE   then run jenkins/vm-bootstrap.sh"
