#!/usr/bin/env bash
# Deletes everything after the demo is recorded and the submission is in.
set -euo pipefail
: "${PROJECT_ID:?set PROJECT_ID}"; ZONE="${ZONE:-asia-southeast1-a}"
gcloud container clusters delete finsecure-gke --zone "$ZONE" --project "$PROJECT_ID" --quiet || true
gcloud compute instances delete jenkins-vm --zone "$ZONE" --project "$PROJECT_ID" --quiet || true
gcloud compute firewall-rules delete allow-jenkins-8080 --project "$PROJECT_ID" --quiet || true
echo "Check for leftover load balancer forwarding rules and disks:"
gcloud compute forwarding-rules list --project "$PROJECT_ID"
gcloud compute disks list --project "$PROJECT_ID"
