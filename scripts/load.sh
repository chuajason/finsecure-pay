#!/usr/bin/env bash
# Sends a mix of valid and invalid transactions to the API. Used for dashboard traffic,
# for triggering the high-rejection-rate alert, and as input for the AI anomaly watcher.
# Usage: scripts/load.sh <base-url> [seconds] [reject-ratio 0-100]
set -euo pipefail
BASE="${1:?base url, e.g. http://34.1.2.3}"; SECS="${2:-60}"; REJ="${3:-20}"
end=$((SECONDS+SECS)); n=0; ok=0; bad=0
while [ $SECONDS -lt $end ]; do
  n=$((n+1))
  if [ $((RANDOM % 100)) -lt "$REJ" ]; then amount="99999.00"; else amount="$((RANDOM % 900 + 10)).50"; fi
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/validate" -H 'Content-Type: application/json' \
    -d "{\"transactionId\":\"load-$$-$n\",\"accountId\":\"acc-$((RANDOM % 50))\",\"amount\":$amount,\"currency\":\"SGD\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}")
  if [ "$code" = "200" ]; then ok=$((ok+1)); else bad=$((bad+1)); fi
  sleep 0.2
done
echo "sent=$n approved=$ok rejected_or_error=$bad"
