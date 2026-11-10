// Builds docs/FinSecure_Pay_Design_Document.docx from the architecture PNG. Run with NODE_PATH=/opt/npm-tools/node_modules.
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, ImageRun,
  AlignmentType, ShadingType, Footer, PageNumber, TableLayoutType, PageOrientation, ExternalHyperlink } = require('docx');

const PNG = fs.readFileSync('docs/architecture.png');
const DATE = '10 November 2026';
const REPO = 'https://github.com/chuajason/finsecure-pay';

const SA = [], SB = [], SC = [];
let cur = SA;
const push = p => cur.push(p);
const H1 = t => push(new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 100 } }));
const H2 = t => push(new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 } }));
function runs(t) { const o = []; t.split('**').forEach((s, i) => { if (s) o.push(new TextRun({ text: s, size: 21, bold: i % 2 === 1 })); }); return o; }
const P = (t, o = {}) => push(new Paragraph({ children: runs(t), spacing: { after: 120 }, ...o }));
const BUL = t => push(new Paragraph({ children: runs(t), bullet: { level: 0 }, spacing: { after: 60 } }));
const CAP = t => push(new Paragraph({ children: [new TextRun({ text: t, size: 19, italics: true })], alignment: AlignmentType.CENTER, spacing: { after: 160 } }));
function LINK(label, url) { return new ExternalHyperlink({ link: url, children: [new TextRun({ text: label, size: 21, style: 'Hyperlink' })] }); }
function CODE(text) {
  const lines = text.split('\n');
  lines.forEach((ln, i) => push(new Paragraph({ children: [new TextRun({ text: ln === '' ? ' ' : ln, font: 'Consolas', size: 17 })],
    spacing: { after: i === lines.length - 1 ? 160 : 0, line: 240 }, indent: { left: 360 }, keepLines: true,
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F2F2' } })));
}
const B = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const borders = { top: B, bottom: B, left: B, right: B };
function cell(t, w, head = false, fill) {
  return new TableCell({ width: { size: w, type: WidthType.DXA }, borders, shading: fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: String(t).split('\n').map(line => new Paragraph({ children: [new TextRun({ text: line, size: 19, bold: head })], spacing: { after: 30 } })) });
}
function TABLE(header, rows, widths) {
  push(new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, widths[i], true, 'E7E6E6')) }),
      ...rows.map(r => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, widths[i])) }))] }));
  push(new Paragraph({ spacing: { after: 100 } }));
}

// ---------------- Section A: portrait ----------------
push(new Paragraph({ children: [new TextRun({ text: 'FinSecure Pay: Design Document', size: 36, bold: true, font: 'Calibri Light', color: '2F5496' })], spacing: { after: 60 } }));
push(new Paragraph({ children: [new TextRun({ text: 'Capstone: Automating a Cloud-Native DevOps Pipeline', size: 24, font: 'Calibri Light', color: '2F5496' })], spacing: { after: 240 } }));
[['Name', 'Jason Chua'], ['Programme', 'NUS DevOps and DevSecOps'], ['Date', DATE]].forEach(([k, v]) =>
  push(new Paragraph({ children: [new TextRun({ text: k + ': ', size: 21, bold: true }), new TextRun({ text: v, size: 21 })], spacing: { after: 40 } })));
push(new Paragraph({ children: [new TextRun({ text: 'Repository: ', size: 21, bold: true }), LINK(REPO, REPO)], spacing: { after: 40 } }));
push(new Paragraph({ children: [new TextRun({ text: 'Image: ', size: 21, bold: true }), LINK('hub.docker.com/r/chuajason/finsecure-pay', 'https://hub.docker.com/r/chuajason/finsecure-pay')], spacing: { after: 40 } }));
push(new Paragraph({ children: [new TextRun({ text: 'Evidence: ', size: 21, bold: true }), LINK('docs/evidence in the repository (54 screenshots, named by task)', REPO + '/tree/main/docs/evidence')], spacing: { after: 200 } }));

H1('1 What I built and why');
P('FinSecure Pay is a small transaction validation API standing in for the fintech in the brief. A client posts a transaction and gets back APPROVED or REJECTED with reason codes. The business problem is not the validation logic, which is 8 rules in one class; it is that the company deploys by hand, finds out about problems from customers, and has no consistent security checks. So the project is the delivery system around the application: every push to GitHub is built, tested, scanned and deployed to a managed Kubernetes cluster by Jenkins, and the running service is measured, alerted on and logged. I ran it on real cloud infrastructure rather than a local cluster so that the LoadBalancer, the managed control plane and the logging path were real rather than simulated.');
P('Everything here was deployed and exercised. The Jenkins history, builds #1 to #10, is the record: a first success, a failing test stopped at Test, a zero-downtime release, a one-click rollback, a Log4Shell dependency blocked at the gate, its remediation, and a metrics fix that went through the pipeline. The mistakes are kept in, because the troubleshooting is the useful part.');

H1('2 Architecture');
P('Figure 1 on the next page shows the deployed system. Four groups: source and verification on GitHub; the Jenkins pipeline on a Compute Engine VM; the runtime on a GKE cluster with two namespaces; and the observers (Gmail, Cloud Logging and the AI watcher). The numbered arrows follow one change from a developer push to a monitored, alerting service. Table 1 records the main tool choices and what I weighed against them. The core test cases from the brief, with what happened and the evidence file for each, are in the companion document FinSecure_Pay_Test_Evidence.docx.');
TABLE(['Area', 'Choice', 'Considered', 'Why this one'], [
  ['Application', 'Spring Boot 4.1.1, Java 21', 'Spring Boot 3.4 (my first version)', 'Trivy found 16 CRITICAL CVEs in my Boot 3.4 image; Boot 3.5 still carried WebMVC CRITICALs fixed only in Framework 7. Boot 4 with Tomcat 11.0.25 and Jackson 3.1.7 pinned above the BOM scans clean.'],
  ['Container', 'Multi-stage Dockerfile, layered jar, Temurin 21 JRE on Alpine', 'Distroless, Jib, single-stage build', 'Cached dependency layer, 95 MB compressed, patchable with apk upgrade, numeric uid 10001. Distroless would remove the shell but make debugging harder in a 2 week project.'],
  ['Kubernetes', 'GKE, zonal, 2 x e2-standard-2', 'Local kind or k3s (allowed by the course), GKE Autopilot', 'A real control plane, LoadBalancer and Cloud Logging. Zonal keeps the control plane in the free tier; the environment pauses to near zero cost between sessions.'],
  ['CI/CD', 'Jenkins LTS on a VM, Docker CLI with the host socket, declarative Jenkinsfile', 'Jenkins on the cluster, GitHub Actions only', 'Required by the brief. Outside the cluster, so the deployer is separate from what it deploys and can be paused on its own. Actions mirrors compile, test and scan only.'],
  ['Registry', 'Docker Hub (public)', 'Artifact Registry', 'Publicly pullable for the evaluator. Artifact Registry would be the choice with Workload Identity in one project.'],
  ['Security scanning', 'Trivy (filesystem and image), SpotBugs', 'Snyk, Grype, OWASP Dependency-Check', 'One tool, no account, covers dependencies, OS packages, Dockerfile, Kubernetes misconfiguration and secrets. SpotBugs adds a code-quality gate.'],
  ['Monitoring', 'kube-prometheus-stack via Helm', 'Google Cloud Monitoring, hand-installed Prometheus', 'One Helm release; rules and scrape targets are CRDs, so alerting lives in Git as YAML.'],
  ['Logging', 'GKE Cloud Logging', 'Loki (loki-stack chart)', 'loki-stack is deprecated. GKE ships stdout to Cloud Logging with nothing to run, and queries span pods that no longer exist.'],
], [1300, 2100, 1900, 3726]);
CAP('Table 1. Tool choices and the alternatives I weighed.');

H1('3 Pipeline design');
P('The Jenkinsfile is declarative with 10 stages, in this order: Checkout, Build, Test, Package, Security Checks, Container Build, Image Scan, Push, Deploy, Smoke Test. The order is the design decision. Nothing reaches the registry until unit tests, SpotBugs and the repository Trivy scan have passed, and nothing reaches the cluster until the built image has also been scanned. A failing stage stops the run; later stages show as not executed. The version tag is the pom version, the build number and the short commit SHA, so every image on Docker Hub traces to one commit and one build. Deploy substitutes that tag into the Deployment manifest, annotates the Kubernetes revision with the build number, and waits for rollout status with a timeout; if the rollout fails, the post step runs rollout undo. A ROLLBACK parameter skips every build stage and runs rollout undo on demand, which is what build #4 did. GitHub starts builds through a webhook, with SCM polling every 5 minutes as a fallback, and every run ends with an email that attaches the console log and scan reports.');
P('GitHub Actions is deliberately not a second deployer: it runs compile, tests, SpotBugs and both Trivy scans with the same CRITICAL policy, so a broken commit is visible before Jenkins picks it up.');

H1('4 Security considerations');
P('Three gates run in the pipeline. SpotBugs fails on high-priority bugs. Trivy scans the repository for vulnerable dependencies, Dockerfile and Kubernetes misconfiguration and committed secrets, and fails on any CRITICAL. Trivy then scans the built image with the same policy. I tested the gate by adding log4j-core 2.14.1, the Log4Shell release: build #6 stopped at Security Checks in 16 seconds with CVE-2021-44228 and CVE-2021-45046 in the console table, production stayed on the previous version, and removing the dependency made build #7 green. One Dockerfile finding, DS-0031 for the USE_GKE_GCLOUD_AUTH_PLUGIN flag, is a documented exception in .trivyignore with the reason recorded.');
P('No credential is in Git. Docker Hub and Gmail credentials are Jenkins credentials and only ever appear masked. The Jenkins VM reaches GKE through its Compute Engine service account with roles/container.developer and nothing else, so there is no key file to leak. The application secret is a Kubernetes Secret created once by hand; the Deployment marks it required and the Deploy stage checks it exists before applying anything, so a missing secret fails the build rather than starting a pod without it. The health endpoint reports whether the secret is configured, never its value. The container runs as uid 10001 with a read-only root filesystem, all capabilities dropped, no privilege escalation and the runtime default seccomp profile. The Jenkins UI port is open only to my own address and GitHub\'s published webhook ranges, and the resume script refreshes that rule because home addresses change.');
P('Three limits of this demonstration deployment should be stated plainly rather than left for a reader to find. The API, Jenkins and Grafana are served over HTTP; for a fintech, TLS with a managed certificate, authenticated access and a narrower network exposure are production baselines, not improvements, and they are listed as such in section 8. Jenkins builds images through the VM\'s Docker socket, which Docker documents as equivalent to root on that host; it is acceptable on a single-purpose VM that only I can reach, and a rootless or isolated builder such as Kaniko or BuildKit is the production answer. The FINSECURE_API_KEY secret demonstrates secret handling (injection, required-by-deploy, never printed); /validate does not yet authenticate callers with it, so the evidence proves the secret path, not access control.');

H1('5 Recovery considerations');
P('Recovery is designed in at three levels. The Deployment runs 2 replicas with a RollingUpdate of maxSurge 1 and maxUnavailable 0, so a new pod must pass its startup and readiness probes before an old one is removed; the pod watch during the 1.1.0 rollout (build #3) never showed fewer than 2 ready pods. Liveness probes restart a hung JVM and a PodDisruptionBudget keeps 1 pod available through voluntary disruptions such as a node drain; it does not protect against direct pod deletion or a zone outage, and the cluster is zonal, so this is continuity through planned change, not a high-availability claim. Deleting a pod by hand had it recreated and ready in 35 seconds. At the pipeline level, a failed rollout triggers an automatic rollout undo, and the ROLLBACK parameter gives a deliberate one-click return to the previous revision; build #4 took production from 1.1.0 back to 1.0.0 in 82 seconds and the revision history records the Jenkins build that produced each template. At the infrastructure level everything is declarative: the cluster, VM, firewall and service account are created by scripts/gcp-setup.sh, the monitoring stack by one Helm command with values in Git, and the whole environment can be paused and resumed between sessions.');

H1('6 Monitoring, alerting and logging');
P('A ServiceMonitor scrapes Spring Boot Actuator\'s Prometheus endpoint from both pods. The Grafana dashboard has 6 panels: request rate by HTTP status, approved against rejected per second, p95 and p50 latency on /validate, rejected share over 2 minutes, available replicas and JVM heap per pod. Four Prometheus rules are defined as a PrometheusRule resource (Table 2) and Alertmanager routes only alerts with namespace=finsecure to email, so the chart\'s built-in alerts about GKE\'s managed control plane (KubeSchedulerDown, KubeProxyDown, Watchdog) go to a null receiver instead of my inbox. That is a lab choice to keep the demonstration inbox clean; in production those platform alerts would go to a separate route and team, not be discarded.');
TABLE(['Alert', 'Condition', 'For', 'Severity'], [
  ['FinSecurePayDown', 'no finsecure-pay target is up', '1 min', 'critical'],
  ['FinSecurePayHighRejectionRate', 'rejected share of validations above 50 percent (2 min rate)', '2 min', 'warning'],
  ['FinSecurePayHighLatency', 'p95 latency on /validate above 500 ms', '3 min', 'warning'],
  ['FinSecurePayReplicasLow', 'available replicas below 2', '2 min', 'warning'],
], [2600, 3800, 900, 1726]);
CAP('Table 2. Alert rules in monitoring/prometheus-rules.yaml.');
P('I triggered the rejection alert with the load generator at 80 percent invalid transactions. The rule went Pending after about a minute, Firing 2 minutes later, and the email arrived 30 seconds after that with the live value in it: "Rejection rate is 84.57% over the last 2 minutes". A RESOLVED email followed 4 minutes after the load stopped. For logging, the application writes one structured line per validation to stdout with the transaction id, account, result and reason codes; kubectl logs shows them per pod and Cloud Logging aggregates them, where a query for REJECTED in the finsecure namespace returned 2,248 entries for the hour and a histogram with the same spike the alert fired on.');

H1('7 AI use case: anomaly detection on the service metrics');
P('**The problem and why AI fits.** The four alert rules only catch what I anticipated and only at thresholds I guessed. A rejection rate of 45 percent for an hour would never fire, and a sudden drop in traffic would not either. Unsupervised anomaly detection learns what normal looks like from the metrics themselves and flags windows that do not fit, without a threshold per signal. It is appropriate here because the signals are already collected, the volume is small, and the cost of a false positive is a human glance at a dashboard, not an automated action.');
P('**Inputs.** Three PromQL series from the same Prometheus the alerts use, at 15 second resolution over a 60 minute window: request rate, rejected share and p95 latency. The watcher (ai/anomaly_watch.py) pulls them with query_range, fits a scikit-learn Isolation Forest with 3 percent contamination, and prints the flagged windows with the signal that moved most. No labels, logs or prompts are needed; a language model is not involved.');
P('**Benefits.** Run against tonight\'s data it flagged 3 windows out of 148 (a 60 minute window at 15 second steps would hold 241 if the series were continuous; Prometheus returns no points where a rate has no samples, and the pods had been replaced by builds #9 and #10 partway through the hour, so the watcher saw 148): the quiet gap while the security gate blocked build #6, the ramp of the second load run, and the first 30 seconds of the 80 percent run with rejected share at 0.88. The static rule needed 2 minutes of sustained breach for the same event.');
P('**Limitations and governance.** A 6 minute incident in a 60 minute window becomes 10 percent of the training data, so the model learned the plateau as normal and flagged only its edges; a longer baseline or a model trained on a known-good window fixes that at the cost of adapting more slowly. The driver attribution is a largest-change heuristic and labelled request rate as the cause on a window that was plainly about rejections. Isolation Forest cannot explain itself, so its output is a triage signal for a person, never an input to an automated remediation, and its false positive rate should be reviewed before anyone is paged on it. Because it reads only aggregate metrics it handles no transaction data, which reduces the privacy exposure; the application logs in Cloud Logging do carry account and transaction identifiers, so access control and retention on that store still matter. One evening of traffic with one induced incident is a proof of concept, not evidence of a reliable detection advantage; that needs weeks of baseline and more than one kind of incident.');
P('**Integration.** The natural next step is a Kubernetes CronJob in the monitoring namespace that runs the watcher every 5 minutes and exposes an anomaly score as a Prometheus metric through the Pushgateway or a small exporter. A fifth PrometheusRule on that score then reuses the existing Alertmanager route and email, so the AI signal arrives through the same path as the threshold alerts and the on-call person sees one inbox.');

H1('8 Lessons learned and future improvements');
BUL('**Security gates bite the author first.** My own first image had 16 CRITICAL findings. A gate that cannot be argued with forced a framework upgrade I would otherwise have deferred.');
BUL('**Named users break runAsNonRoot.** Kubernetes refused my first pod with CreateContainerConfigError because the image user was a name, not a number. Numeric uid 10001 in both the Dockerfile and the pod securityContext fixed it.');
BUL('**Spring Boot publishes no histogram buckets by default.** The p95 panel and the latency alert were silently empty until I enabled percentiles-histogram for http.server.requests. The fix went through the pipeline as build #8, which was a better demo than if it had worked first time.');
BUL('**A wrong Gmail app password fails quietly.** The alert fired but no email came; only Alertmanager\'s log showed the 535 rejection. A Helm upgrade with the right password delivered the email within a minute.');
BUL('**Per-pod state is a limitation.** Duplicate and velocity checks live in memory in each pod, so a repeated transaction id can slip through if the two requests land on different pods. Production would use Redis or a database, and I note it rather than hide it.');
P('Future improvements, in the order I would do them: a staging namespace with a promotion step between it and production; HTTPS with a managed certificate on the LoadBalancer and TLS in front of Jenkins and Grafana; least-privilege IAM and Kubernetes RBAC for the Jenkins VM service account (Workload Identity Federation applies if CI later moves into the cluster; for a Compute Engine VM the attached service account is already the keyless method); a rootless image builder; a Horizontal Pod Autoscaler on request rate; the anomaly watcher as a CronJob with its own alert; and a shared store for the validator state.');

// ---------------- Section B: landscape figure ----------------
cur = SB;
push(new Paragraph({ children: [new ImageRun({ type: 'png', data: PNG, transformation: { width: 1020, height: 606 } })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }));
CAP('Figure 1. FinSecure Pay end-to-end architecture as deployed. Numbered arrows follow one change from push to a monitored, alerting service. A full-resolution PNG and the SVG source are in docs/ in the repository.');

// ---------------- Companion document: test evidence table ----------------
cur = SC;
push(new Paragraph({ children: [new TextRun({ text: 'FinSecure Pay: Test Evidence', size: 36, bold: true, font: 'Calibri Light', color: '2F5496' })], spacing: { after: 60 } }));
push(new Paragraph({ children: [new TextRun({ text: 'Companion to the Design Document. Jason Chua, ' + DATE + '. Evidence files are in ', size: 21 }), LINK('docs/evidence', REPO + '/tree/main/docs/evidence'), new TextRun({ text: ' in the repository.', size: 21 })], spacing: { after: 200 } }));
H1('Core test cases and where the evidence is');
TABLE(['Test case', 'Expected result', 'What happened', 'Evidence (docs/evidence)'], [
  ['Run unit tests', 'Required unit tests pass', '15 tests, 0 failures, in Cloud Shell, GitHub Actions and every Jenkins build', 'T1-tests.png, T1-actions-steps.png'],
  ['Introduce a controlled failing test', 'Pipeline fails, no deployment', 'Build #2 red at Test; Package to Smoke Test not executed; /health still 1.0.0-1-026fe3d; FAILED email', 'T4-failed-test.png, T4-health-unchanged-after-fail.png, T6-jenkins-email-failed.png'],
  ['Run the container and access /health', 'Healthy response', 'docker run locally and the LoadBalancer both return status UP with version and apiKeyConfigured', 'T2-run-health.png, T3-external-health.png'],
  ['Inspect the Kubernetes deployment', 'At least 2 pods Running and Ready', '2/2 pods 1/1 Ready behind Service 35.197.154.237', 'T3-pods-svc.png'],
  ['Deploy a new image or version', 'Rollout completes', 'Build #3 released 1.1.0; new pods Ready before old pods terminated; revision annotated with the build', 'T4-rollout.png, T4-rollout-history.png, T4-pipeline-success-release.png'],
  ['Delete or restart one pod', 'Pod recreated automatically', 'Replacement pod Running and Ready in 35 seconds', 'T3-recovery.png'],
  ['Introduce a controlled critical finding', 'Security gate blocks the release', 'Build #6 stopped at Security Checks on log4j-core 2.14.1 (CVE-2021-44228 CRITICAL); build #7 green after removal', 'T5-blocked.png, T5-scan-reports.png, T5-build6-console.txt'],
  ['Trigger a monitoring condition', 'Alert fires and notification received', 'FinSecurePayHighRejectionRate Pending, Firing, email at 84.57 percent, then RESOLVED email', 'T6-alert-pending.png, T6-alert-firing.png, T6-alert-email.png, T6-email-inbox-lifecycle.png'],
  ['Rollback (additional)', 'Previous version restored', 'Build #4 with ROLLBACK=true returned to 1.0.0-1-026fe3d in 82 seconds', 'T4-rollback-stageview.png, T4-rollback-health.png'],
], [1900, 1700, 3300, 2126]);
CAP('Table 3. Core test cases from the brief mapped to what happened and the evidence files.');

const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '7F7F7F' })] })] });
const portrait = { page: { size: { width: 11906, height: 16838 }, margin: { top: 1100, bottom: 1100, left: 1300, right: 1300 } } };
const landscape = { page: { size: { width: 16838, height: 11906, orientation: PageOrientation.LANDSCAPE }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } };
const doc = new Document({
  creator: 'Jason Chua', title: 'FinSecure Pay Design Document',
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, font: 'Calibri Light', color: '2F5496' }, paragraph: { spacing: { before: 300, after: 100 }, keepNext: true } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 25, font: 'Calibri Light', color: '2F5496' }, paragraph: { spacing: { before: 200, after: 80 }, keepNext: true } },
    ] },
  sections: [
    { properties: portrait, footers: { default: footer }, children: SA },
    { properties: landscape, footers: { default: footer }, children: SB },
  ],
});
const evidenceDoc = new Document({ creator: 'Jason Chua', title: 'FinSecure Pay Test Evidence',
  styles: { default: { document: { run: { font: 'Calibri', size: 21 } } }, paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, font: 'Calibri Light', color: '2F5496' }, paragraph: { spacing: { before: 300, after: 100 }, keepNext: true } }] },
  sections: [{ properties: portrait, footers: { default: footer }, children: SC }] });
Packer.toBuffer(doc).then(b => { fs.writeFileSync('docs/FinSecure_Pay_Design_Document.docx', b); console.log('written', b.length); });
Packer.toBuffer(evidenceDoc).then(b => { fs.writeFileSync('docs/FinSecure_Pay_Test_Evidence.docx', b); console.log('written evidence', b.length); });
