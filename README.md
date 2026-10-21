# FinSecure Pay: transaction validation API

Capstone project for the NUS DevOps and DevSecOps programme. A Spring Boot API that
validates payment transactions, delivered through an automated pipeline to a managed
Kubernetes cluster with security gates, monitoring, alerting and an AI-assisted
anomaly watcher.

Author: Jason Chua.

## What the application does

| Endpoint | Method | Purpose |
|---|---|---|
| `/health` | GET | Application health, version and start time |
| `/validate` | POST | Validates one transaction and returns `APPROVED` or `REJECTED` with reasons |
| `/actuator/health/readiness`, `/actuator/health/liveness` | GET | Kubernetes probes |
| `/actuator/prometheus` | GET | Metrics for Prometheus |

Validation rules (limits come from the Kubernetes ConfigMap, not the code):

| Rule | Reason code | Default |
|---|---|---|
| Amount must be positive | `AMOUNT_NOT_POSITIVE` | |
| Amount at or below the per-transaction limit | `AMOUNT_EXCEEDS_LIMIT` | 10,000.00 |
| At most 2 decimal places | `AMOUNT_TOO_MANY_DECIMALS` | |
| Currency in the allowed list | `CURRENCY_NOT_SUPPORTED` | SGD, USD, EUR |
| Timestamp not in the future (beyond clock skew) | `TIMESTAMP_IN_FUTURE` | 120 s skew |
| Timestamp not older than 24 hours | `TIMESTAMP_TOO_OLD` | |
| Transaction id not seen before | `DUPLICATE_TRANSACTION_ID` | |
| Per-account velocity limit per minute | `VELOCITY_LIMIT_EXCEEDED` | 5 |

Example:

```bash
curl -s -X POST http://localhost:8080/validate -H 'Content-Type: application/json' -d '{
  "transactionId": "tx-1001", "accountId": "acc-42", "amount": 250.00,
  "currency": "SGD", "timestamp": "2026-10-21T10:00:00Z"
}'
# {"transactionId":"tx-1001","status":"APPROVED","reasons":[]}
```

Approved returns HTTP 200, rejected returns 422 with the reasons, malformed input returns 400.

## Repository layout

| Path | Contents |
|---|---|
| `src/` | Spring Boot application and JUnit 5 tests |
| `Dockerfile` | Multi-stage build, layered jar, non-root JRE runtime |
| `k8s/` | Namespace, ConfigMap, Deployment (2 replicas, probes), Service, PDB, ServiceMonitor |
| `Jenkinsfile` | Checkout, Build, Test, Package, Security Checks, Container Build, Image Scan, Push, Deploy, Smoke Test, with automatic rollback |
| `jenkins/` | Jenkins controller image with Maven, Docker CLI, kubectl, gcloud and Trivy, plus VM bootstrap |
| `monitoring/` | kube-prometheus-stack values, alert rules, Grafana dashboard |
| `ai/` | Isolation Forest anomaly watcher over live Prometheus metrics |
| `scripts/` | GCP setup, pause and teardown; demo scripts for the failing test and the security finding; load generator |
| `docs/` | Runbook with the evidence checklist (design document and demo script are added once the deployment evidence exists) |
| `.github/workflows/ci.yml` | Build verification on every push (Jenkins remains the deployment pipeline) |

## Run locally

```bash
mvn -B test                      # unit and API tests
mvn -B -DskipTests package
java -jar target/finsecure-pay.jar
curl http://localhost:8080/health
```

Or with Docker:

```bash
docker build --build-arg APP_VERSION=1.0.0-local -t finsecure-pay:1.0.0-local .
docker run --rm -p 8080:8080 finsecure-pay:1.0.0-local
```

## Deploy

See `docs/RUNBOOK.md`. It walks through Google Cloud setup, Jenkins, the pipeline,
monitoring and the demo, with the screenshot to capture at each step.

## Security notes

No credentials are stored in this repository. Docker Hub and email credentials live in
Jenkins credentials; the Jenkins VM authenticates to GKE through its service account;
application secrets are created on the cluster with `kubectl create secret` (see
`k8s/secret.example.yaml`). The pipeline has two gates: Trivy on the repository
(dependencies, misconfiguration, secrets) and Trivy on the built image; a CRITICAL
finding fails the build before anything is pushed or deployed.
