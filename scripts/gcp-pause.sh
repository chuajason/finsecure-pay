#!/usr/bin/env bash
# Stops the bill between working sessions without deleting anything.
# Usage: PROJECT_ID=my-project scripts/gcp-pause.sh            # pause
#        PROJECT_ID=my-project MY_IP=1.2.3.4 scripts/gcp-pause.sh resume
# On resume, MY_IP (your browser's public IP, see https://whatismyip.com) refreshes the Jenkins
# firewall rule, because home IPs change between sessions. Run from Cloud Shell; do not take the
# IP from Cloud Shell itself, that is Google's egress address, not yours.
set -euo pipefail
: "${PROJECT_ID:?set PROJECT_ID}"; ZONE="${ZONE:-asia-southeast1-a}"
if [ "${1:-}" = "resume" ]; then
  if [ -z "${MY_IP:-}" ]; then
    read -r -p "Your current public IP (from whatismyip.com): " MY_IP
  fi
  GH_HOOKS=$(curl -fsS https://api.github.com/meta | python3 -c 'import json,sys; print(",".join(r for r in json.load(sys.stdin)["hooks"] if ":" not in r))')
  gcloud compute firewall-rules update allow-jenkins-8080 --source-ranges "${MY_IP}/32,${GH_HOOKS}" --project "$PROJECT_ID"
  echo "Jenkins UI now allowed from ${MY_IP}/32 plus GitHub hook ranges."
  gcloud compute instances start jenkins-vm --zone "$ZONE" --project "$PROJECT_ID"
  gcloud container clusters resize finsecure-gke --zone "$ZONE" --num-nodes 2 --project "$PROJECT_ID" --quiet
  echo "Jenkins: http://$(gcloud compute instances describe jenkins-vm --zone "$ZONE" --project "$PROJECT_ID" --format='get(networkInterfaces[0].accessConfigs[0].natIP)'):8080 (allow 2 to 3 minutes for Jenkins to start)"
  echo "Pods come back in 3 to 5 minutes: kubectl -n finsecure get pods -w"
else
  gcloud compute instances stop jenkins-vm --zone "$ZONE" --project "$PROJECT_ID"
  gcloud container clusters resize finsecure-gke --zone "$ZONE" --num-nodes 0 --project "$PROJECT_ID" --quiet
  echo "Paused. Remaining cost: disks and 2 static IPs only. Resume with: PROJECT_ID=$PROJECT_ID MY_IP=<your ip> scripts/gcp-pause.sh resume"
fi
