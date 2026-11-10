#!/usr/bin/env bash
# Stops the bill between working sessions without deleting anything.
# Usage: PROJECT_ID=my-project scripts/gcp-pause.sh            # pause
#        PROJECT_ID=my-project MY_IP=1.2.3.4 scripts/gcp-pause.sh resume
# On resume, MY_IP (your browser's public IP, see https://whatismyip.com) refreshes the Jenkins
# firewall rule, because home IPs change between sessions. Run from Cloud Shell; do not take the
# IP from Cloud Shell itself, that is Google's egress address, not yours.
set -euo pipefail
: "${PROJECT_ID:?set PROJECT_ID}"; ZONE="${ZONE:-asia-southeast1-a}"
CLUSTER=finsecure-gke; NODES=2; NS=finsecure; DEPLOY=finsecure-pay; REPLICAS=2

creds() { gcloud container clusters get-credentials "$CLUSTER" --zone "$ZONE" --project "$PROJECT_ID" --quiet; }

if [ "${1:-}" = "resume" ]; then
  if [ -z "${MY_IP:-}" ]; then
    read -r -p "Your current public IP (from whatismyip.com): " MY_IP
  fi
  GH_HOOKS=$(curl -fsS https://api.github.com/meta | python3 -c 'import json,sys; print(",".join(r for r in json.load(sys.stdin)["hooks"] if ":" not in r))')
  gcloud compute firewall-rules update allow-jenkins-8080 --source-ranges "${MY_IP}/32,${GH_HOOKS}" --project "$PROJECT_ID"
  echo "Jenkins UI now allowed from ${MY_IP}/32 plus GitHub hook ranges."
  gcloud compute instances start jenkins-vm --zone "$ZONE" --project "$PROJECT_ID"
  gcloud container clusters resize "$CLUSTER" --zone "$ZONE" --num-nodes "$NODES" --project "$PROJECT_ID" --quiet
  creds
  kubectl wait --for=condition=Ready nodes --all --timeout=300s
  # Pause scaled the Deployment to 0, so bring it back. If an HPA exists, its minReplicas wins.
  if kubectl -n "$NS" get hpa "$DEPLOY" >/dev/null 2>&1; then
    REPLICAS=$(kubectl -n "$NS" get hpa "$DEPLOY" -o jsonpath='{.spec.minReplicas}')
  fi
  kubectl -n "$NS" scale deployment/"$DEPLOY" --replicas="$REPLICAS"
  kubectl -n "$NS" rollout status deployment/"$DEPLOY" --timeout=300s
  kubectl -n "$NS" get pods
  echo "Jenkins: http://$(gcloud compute instances describe jenkins-vm --zone "$ZONE" --project "$PROJECT_ID" --format='get(networkInterfaces[0].accessConfigs[0].natIP)'):8080 (allow 2 to 3 minutes for Jenkins to start)"
  echo "Monitoring pods take another minute or two: kubectl -n monitoring get pods"
else
  gcloud compute instances stop jenkins-vm --zone "$ZONE" --project "$PROJECT_ID"
  # The PodDisruptionBudget (minAvailable 1) blocks the node drain while a pod is still running,
  # so the Deployment is scaled to 0 first. The Deployment and its history stay in place.
  creds
  kubectl -n "$NS" scale deployment/"$DEPLOY" --replicas=0
  kubectl -n "$NS" wait --for=delete pod -l app="$DEPLOY" --timeout=120s || true
  gcloud container clusters resize "$CLUSTER" --zone "$ZONE" --num-nodes 0 --project "$PROJECT_ID" --quiet
  echo "Paused. Remaining cost: disks and 2 static IPs only. Resume with: PROJECT_ID=$PROJECT_ID MY_IP=<your ip> scripts/gcp-pause.sh resume"
fi
