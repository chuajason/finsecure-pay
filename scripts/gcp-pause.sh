#!/usr/bin/env bash
# Stops the bill between working sessions without deleting anything.
# Usage: PROJECT_ID=my-project scripts/gcp-pause.sh   |   scripts/gcp-pause.sh resume
set -euo pipefail
: "${PROJECT_ID:?set PROJECT_ID}"; ZONE="${ZONE:-asia-southeast1-a}"
if [ "${1:-}" = "resume" ]; then
  gcloud compute instances start jenkins-vm --zone "$ZONE" --project "$PROJECT_ID"
  gcloud container clusters resize finsecure-gke --zone "$ZONE" --num-nodes 2 --project "$PROJECT_ID" --quiet
else
  gcloud compute instances stop jenkins-vm --zone "$ZONE" --project "$PROJECT_ID"
  gcloud container clusters resize finsecure-gke --zone "$ZONE" --num-nodes 0 --project "$PROJECT_ID" --quiet
fi
