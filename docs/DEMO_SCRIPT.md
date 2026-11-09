# FinSecure Pay: recording script (target 12 minutes, hard limit 15)

One recording, presentation and demo together. Screen share with the slide deck open, a browser
with tabs for GitHub, Jenkins, Grafana and Gmail, and one Cloud Shell window with two tabs.
Speak to the slide, then switch to the live tab when the script says so.

## Before pressing record (15 minutes earlier)

```bash
cd ~/finsecure-pay && git pull -q
PROJECT_ID=finsecure-pay-514214 MY_IP=<your IP from whatismyip.com> scripts/gcp-pause.sh resume
```

Wait until both are true:

```bash
kubectl -n finsecure get pods            # 2/2 Running, READY 1/1 each
kubectl -n monitoring get pods           # all Running
```

Open and sign in: Jenkins http://34.126.137.15:8080, Grafana http://34.177.101.0 (dashboard
FinSecure Pay, time range Last 15 minutes, refresh 10s), GitHub repo, Gmail. In Cloud Shell tab 2
start the Prometheus port-forward and leave it:

```bash
kubectl -n monitoring port-forward svc/monitoring-kube-prometheus-prometheus 9090:9090
```

In Cloud Shell tab 1, warm the dashboard so it is not empty on camera:

```bash
scripts/load.sh http://35.197.154.237 120 20
```

Check `curl -s http://35.197.154.237/health` shows the current version. Note it; you will refer
to it as "the version before this recording".

## 0:00 Slide 1, overview (45 s)

"FinSecure Pay is a transaction validation API for a fintech. The business problem is the one
in the brief: manual deployments, weak visibility, no consistent security checks. I built the
whole path from a Git push to a monitored, alerting production service on Google Kubernetes
Engine, with Jenkins as the pipeline and security gates that block the release rather than
report after the fact. Everything you see is live; I am going to start a real pipeline run
now so it finishes while I talk."

## 0:45 Start the live pipeline run (30 s)

Option A (preferred, shows the webhook): edit a file on GitHub in the browser. Open
`docs/DEMO_LOG.md` in the repo, click the pencil, add one line `Recording run: <date>`, Commit
changes directly to main. Say "I am committing a one-line change on GitHub; the webhook will
start Jenkins."

Option B (fallback): Jenkins, Build with Parameters, ROLLBACK unticked, Build. Say "I am
starting it by hand here; the webhook path is in the build history, builds #2, #3, #6 and #7
were all webhook-started."

Switch to Jenkins. Point at the new build appearing in the Builds list. "That is build #N
starting from the webhook. It takes about 6 minutes. Back to the slides."

## 1:15 Slide 2, application and Git (60 s)

"Spring Boot 4 on Java 21. One endpoint that matters, POST /validate, with 8 rules whose limits
come from a Kubernetes ConfigMap, not the code. GET /health reports version and start time and
whether the secret is present, without printing it. 15 JUnit tests. Actuator exposes probes and
Prometheus metrics. The repo is public at github.com/chuajason/finsecure-pay and the commit
history is the real history of this project, including the mistakes."

Switch to GitHub briefly, scroll the commit list, point at a failure and its fix. Back to slides.

## 2:15 Slide 3, container and Kubernetes (75 s)

"Multi-stage Dockerfile, layered jar so the dependency layer is cached, Temurin 21 JRE on
Alpine, non-root user 10001, read-only root filesystem, all capabilities dropped. On GKE: 2
replicas, rolling update with maxUnavailable 0, startup, readiness and liveness probes on
Actuator, a PodDisruptionBudget, a LoadBalancer Service. The one thing I got wrong first time:
I created the user by name, and Kubernetes refused to start the pod with
CreateContainerConfigError because runAsNonRoot cannot verify a named user. Numeric uid fixed
it. That is on the slide."

Switch to Cloud Shell tab 1:

```bash
kubectl -n finsecure get pods,svc
curl -s http://35.197.154.237/health; echo
```

"Two pods, external IP, health UP with the version before this recording."

## 3:30 Slide 4, CI/CD pipeline (90 s)

"Ten stages. The order matters: nothing is pushed to the registry or deployed until the tests
and two security scans have passed. Version tag is pom version, build number and short SHA, so
every image traces back to a commit. Deploy annotates the Kubernetes revision with the build
number, waits for rollout status, and if the rollout fails it rolls back automatically.
There is also a ROLLBACK parameter for a deliberate one-click rollback."

Switch to Jenkins. The live build should be mid-pipeline. Show the Stage View with the full
history: "#1 first success, #2 failed at Test on a deliberately failing test and never reached
Deploy, #3 release 1.1.0 with a zero-downtime rollout, #4 a one-click rollback, #6 blocked by
the security gate, #7 the remediation. And the current one running now."

Click build #2, show the Test stage red and later stages skipped. "Failed tests do not deploy."

## 5:00 Slide 5, DevSecOps (90 s)

"Three checks in the pipeline. SpotBugs for code quality, fails on high priority bugs. Trivy on
the repository: dependencies, Dockerfile and Kubernetes misconfiguration, secrets. Trivy on the
built image. Policy: any CRITICAL fails the build before push. I proved it by adding
log4j-core 2.14.1, the Log4Shell version. The build stopped at Security Checks in 16 seconds,
with the CVE table in the console, and production was untouched. Removing it made the next build
green."

Switch to Jenkins build #6, Console Output, scroll to the Trivy table with CVE-2021-44228
CRITICAL. Then Manage Jenkins, Credentials: "Docker Hub and Gmail credentials live here, masked.
The application secret is a Kubernetes Secret created by hand and never in Git; the pipeline
refuses to deploy if it is missing. The Jenkins VM authenticates to GKE through a service account
with the container developer role only, no key files."

"Worth saying: the same scanning found 16 CRITICAL findings in my own first image, in Tomcat
and Spring, which is what pushed me from Spring Boot 3.4 to 4.1 with patched Tomcat and Jackson.
The gate did its job on me before it did it on the demo."

## 6:30 Slide 6, monitoring, alerting, logging (120 s)

"kube-prometheus-stack via Helm. A ServiceMonitor scrapes Actuator. Grafana dashboard with 6
panels: request rate by status, approved against rejected, p95 and p50 latency, rejection share,
available replicas, JVM heap per pod. Four Prometheus rules: service down, rejection rate above
50 percent for 2 minutes, p95 above 500 ms, fewer than 2 replicas. Alertmanager emails Gmail,
only for the finsecure namespace so the cluster's built-in noise stays out of the inbox. Logs go
to Cloud Logging through GKE's agent, so I can query across pods that no longer exist."

Switch to Grafana, dashboard. Point out the live panels. Then Alerting, Alert rules, search
finsecure: 4 rules. Then Gmail: open the [FIRING:1] FinSecurePayHighRejectionRate email, show
"Rejection rate is 84.57% over the last 2 minutes", then the [RESOLVED] email 4 minutes later.
"I triggered that with a load generator at 80 percent invalid transactions. Pending after a
minute, firing 2 minutes later, email 30 seconds after that, resolved when the load stopped."

Then Cloud Logging, Logs Explorer with the saved query (namespace finsecure, REJECTED): "2,248
rejected transactions in the hour, and the histogram shows the same spike the alert fired on."

## 8:30 Slide 7, AI use case (90 s)

"The AI use case is anomaly detection on the same Prometheus metrics the alerts use. The problem:
threshold alerts only catch what I anticipated. An Isolation Forest over request rate, rejected
share and p95 learns what normal looks like and flags windows that do not fit, with no threshold
configured. Inputs are three PromQL series at 15-second resolution. It flagged the start of the
80 percent run within 30 seconds, where the static rule needed 2 minutes. Limitations are real:
with a 60-minute window a 6-minute incident becomes 10 percent of the training data and stops
looking rare, so it flagged the edges of the incident rather than the whole plateau. It also
cannot explain itself, so it is a triage signal for a human, not an action. Integration path:
run it as a CronJob that writes a Prometheus metric, and alert on that metric through the same
Alertmanager."

Switch to Cloud Shell tab 1:

```bash
python3 ai/anomaly_watch.py --prometheus http://localhost:9090 --minutes 60
```

Read the flagged windows aloud. Show `ai/anomaly_watch.png` on the slide.

## 10:00 Back to Jenkins: the live build has finished (60 s)

Switch to Jenkins. The build started at 0:45 should be green. Show the Stage View, then:

```bash
curl -s http://35.197.154.237/health; echo
kubectl -n finsecure rollout history deployment/finsecure-pay | tail -3
```

"Version changed to the build I pushed at the start of this recording, two pods never dropped
below two ready, and the Kubernetes revision carries the Jenkins build number. That is the
end-to-end path, live."

## 11:00 Slide 8, test results and recovery (45 s)

Walk the test table on the slide: 8 rows, each with the build number or screenshot that proves
it. "Delete a pod, recreated in 35 seconds. Rollback, revision 5 is the old template re-applied."

## 11:45 Slide 9, lessons learned and future work (45 s)

"Four lessons. Security gates cost me a day on my own image before I ever reached the demo, and
that is the point of having them. Named users break runAsNonRoot; use numeric ids. Spring Boot
does not publish histogram buckets unless asked, so my p95 panel was empty until I fixed it
through the pipeline. And a wrong Gmail app password fails silently from the alert's point of
view; I only found it in Alertmanager's logs. Future work: a staging namespace with a promotion
gate, Workload Identity instead of a VM service account, HTTPS with a managed certificate,
Horizontal Pod Autoscaler, and the anomaly watcher as a CronJob with its own alert."

## 12:30 Slide 10, links (15 s)

"Repository, Docker Hub image, evidence folder with every screenshot, and this recording.
Thank you."

Stop recording.

## After recording

```bash
PROJECT_ID=finsecure-pay-514214 scripts/gcp-pause.sh
```

Upload the video, put its link on slide 10 and in the design document, then after submission:

```bash
PROJECT_ID=finsecure-pay-514214 scripts/gcp-teardown.sh
```

## If something goes wrong on camera

- Build not started by webhook: use Build with Parameters. Say so; the webhook evidence is in
  the history.
- Build still running at 10:00: show build #3 and #5 history instead and say the live one is
  still in Deploy; cut back to it at the end if time allows.
- Grafana empty: the warm-up load was skipped; run `scripts/load.sh http://35.197.154.237 60 20`
  during slide 4 and come back to it.
- Any command fails: read the error aloud, say what you would check, move on. Graders have seen
  live demos before.
