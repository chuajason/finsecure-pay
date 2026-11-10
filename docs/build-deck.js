// Builds docs/FinSecure_Pay_Capstone.pptx (10 slides). Run from the repo root with node.
const pptxgen = require('pptxgenjs');
const sharp = require('sharp');
const path = require('path');
const { applyTheme } = require(process.env.PPTX_SKILL + '/scripts/apply_theme.js');

const E = 'docs/evidence/', S = 'docs/slides-img/';
const REPO = 'https://github.com/chuajason/finsecure-pay';
const THEME = { name: 'FinSecure', headFontFace: 'Calibri', bodyFontFace: 'Calibri',
  colors: { dk1: '1F2937', lt1: 'FFFFFF', dk2: '0F2A47', lt2: 'F3F6FA', accent1: '0F766E', accent2: 'B45309', accent3: '2F5496',
    accent4: '6B7280', accent5: 'C0392B', accent6: '2E7D32', hlink: '0F766E', folHlink: '0F766E' } };

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';            // 13.33 x 7.5
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
pres.author = 'Jason Chua'; pres.title = 'FinSecure Pay: Automating a Cloud-Native DevOps Pipeline';
const C = pres.SchemeColor;

pres.defineSlideMaster({ title: 'DARK', background: { color: THEME.colors.dk2 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.7, y: 2.2, w: 11.9, h: 1.4, fontSize: 40, bold: true, color: C.background1, margin: 0, valign: 'bottom', align: 'left' } } },
    { placeholder: { options: { name: 'body', type: 'body', x: 0.7, y: 3.75, w: 11.9, h: 2.6, fontSize: 18, color: C.background2, margin: 0, valign: 'top' } } },
  ] });
pres.defineSlideMaster({ title: 'CONTENT', background: { color: THEME.colors.lt1 },
  objects: [
    { placeholder: { options: { name: 'title', type: 'title', x: 0.6, y: 0.35, w: 12.1, h: 0.8, fontSize: 30, bold: true, color: C.text2, margin: 0, valign: 'middle', align: 'left' } } },
    { text: { text: 'FinSecure Pay capstone, Jason Chua', options: { x: 0.6, y: 7.05, w: 6, h: 0.3, fontSize: 10, color: C.accent4, margin: 0 } } },
  ], slideNumber: { x: 12.3, y: 7.05, w: 0.5, h: 0.3, fontSize: 10, color: C.accent4 } });

const meta = {};
async function dims(f) { if (!meta[f]) { const m = await sharp(f).metadata(); meta[f] = [m.width, m.height]; } return meta[f]; }
// Place an image inside a box, preserving aspect ratio, with a thin frame and optional caption below.
async function shot(slide, file, x, y, w, h, caption) {
  const [iw, ih] = await dims(file); const r = Math.min(w / iw, h / ih); const dw = iw * r, dh = ih * r;
  const dx = x + (w - dw) / 2, dy = y;
  slide.addShape(pres.ShapeType.rect, { x: dx - 0.04, y: dy - 0.04, w: dw + 0.08, h: dh + 0.08, fill: { color: C.background1 }, line: { color: 'C9CED6', width: 0.75 }, shadow: { type: 'outer', blur: 4, offset: 1.5, angle: 60, color: '000000', opacity: 0.18 } });
  slide.addImage({ path: file, x: dx, y: dy, w: dw, h: dh });
  if (caption) slide.addText(caption, { x: x, y: dy + dh + 0.08, w: w, h: 0.3, fontSize: 10, italic: true, color: C.accent4, align: 'center', margin: 0, isTextBox: true });
  return dy + dh;
}
function bullets(slide, items, x, y, w, h, size = 14) {
  slide.addText(items.map((t, i) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: i < items.length - 1, paraSpaceAfter: 6 } })),
    { x, y, w, h, fontSize: size, color: C.text1, valign: 'top', margin: 0, isTextBox: true });
}
function tag(slide, n, x, y) {
  slide.addShape(pres.ShapeType.ellipse, { x, y, w: 0.42, h: 0.42, fill: { color: C.accent1 }, line: { color: C.accent1 } });
  slide.addText(String(n), { x, y, w: 0.42, h: 0.42, fontSize: 14, bold: true, color: C.background1, align: 'center', valign: 'middle', margin: 0, isTextBox: true });
}
function stat(slide, big, label, x, y, w) {
  slide.addText(big, { x, y, w, h: 0.9, fontSize: 40, bold: true, color: C.accent1, align: 'left', margin: 0, isTextBox: true });
  slide.addText(label, { x, y: y + 0.9, w, h: 0.6, fontSize: 12, color: C.accent4, align: 'left', margin: 0, isTextBox: true, valign: 'top' });
}

(async () => {
  // 1 Title
  pres.addSection({ title: 'Overview' });
  let s = pres.addSlide({ masterName: 'DARK', sectionTitle: 'Overview' });
  s.addText('FinSecure Pay: Automating a Cloud-Native DevOps Pipeline', { placeholder: 'title' });
  s.addText([
    { text: 'Capstone, NUS DevOps and DevSecOps programme. Jason Chua, November 2026.', options: { breakLine: true } },
    { text: 'A Spring Boot transaction validation API delivered from a Git push to a monitored, alerting service on Google Kubernetes Engine by Jenkins, with security gates that block the release.', options: { breakLine: true } },
    { text: ' ', options: { breakLine: true } },
    { text: 'Repository: ' + REPO, options: { hyperlink: { url: REPO }, breakLine: true } },
    { text: 'Image: hub.docker.com/r/chuajason/finsecure-pay', options: { hyperlink: { url: 'https://hub.docker.com/r/chuajason/finsecure-pay' }, breakLine: true } },
    { text: 'Recording: [link added at submission]', options: {} },
  ], { placeholder: 'body' });
  s.addNotes('Title. 45 seconds. State the business problem from the brief and that everything shown is live; start the pipeline run right after this slide.');

  // 2 Overview and business problem
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'Overview' });
  s.addText('The problem is the delivery system, not the validation logic', { placeholder: 'title' });
  s.addText('FinSecure Pay in the brief', { x: 0.6, y: 1.35, w: 5.9, h: 0.4, fontSize: 16, bold: true, color: C.accent3, margin: 0, isTextBox: true });
  bullets(s, ['Deployments done by hand, with downtime and no record of what is running where',
    'Problems discovered by customers, not by monitoring; no alerting path',
    'Security checks inconsistent or absent; vulnerable dependencies reach production',
    'Configuration and secrets managed ad hoc'], 0.6, 1.8, 5.9, 2.3);
  s.addText('What I built', { x: 0.6, y: 4.2, w: 5.9, h: 0.4, fontSize: 16, bold: true, color: C.accent3, margin: 0, isTextBox: true });
  bullets(s, ['Git push to GitHub starts Jenkins through a webhook; 10 stages from Checkout to Smoke Test',
    'Tests, SpotBugs and two Trivy scans must pass before anything is pushed or deployed',
    'GKE Deployment with 2 replicas, probes, zero-downtime rollouts and one-click rollback',
    'Prometheus, Grafana, Alertmanager to Gmail, Cloud Logging, and an Isolation Forest watcher'], 0.6, 4.65, 5.9, 2.3);
  // stats grid on the right
  s.addShape(pres.ShapeType.roundRect, { x: 7.0, y: 1.35, w: 5.7, h: 5.55, fill: { color: C.background2 }, line: { color: C.background2 }, rectRadius: 0.12 });
  const stats = [['10', 'pipeline stages, failing stage stops the run'], ['10', 'Jenkins builds: success, failed test, release, rollback, blocked CVE, fix'],
    ['15', 'JUnit tests on every build'], ['2', 'replicas, never fewer than 2 ready during a rollout'],
    ['4', 'Prometheus alert rules, email on fire and resolve'], ['16', 'CRITICAL CVEs the gate found in my own first image']];
  stats.forEach(([b, l], i) => stat(s, b, l, 7.35 + (i % 2) * 2.8, 1.6 + Math.floor(i / 2) * 1.75, 2.6));
  s.addNotes('Overview. 45 seconds. Left: the business problem; right: the numbers that summarise what was built and exercised.');

  // 3 Application and Git
  pres.addSection({ title: 'Build' });
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'Build' });
  s.addText('Task 1: application and version control', { placeholder: 'title' });
  bullets(s, ['Spring Boot 4.1.1 on Java 21, Maven, layered jar. Migrated from 3.4 after Trivy found 16 CRITICAL CVEs in Tomcat and Spring WebMVC',
    'POST /validate: 8 rules (amount, decimals, currency, timestamp skew and age, duplicate id, per-account velocity). 200 APPROVED, 422 REJECTED with reason codes, 400 malformed',
    'GET /health: version, start time and whether the secret is configured, never its value. Actuator probes and /actuator/prometheus',
    'Limits come from a Kubernetes ConfigMap, not the code',
    '15 JUnit tests: 9 on the validator with a fixed clock, 6 through MockMvc including the metrics counter',
    'Public repo chuajason/finsecure-pay. The history is real, including the failing Actions runs that drove the Boot 4 upgrade'], 0.6, 1.35, 6.0, 5.5, 14);
  await shot(s, E + 'T1-tests.png', 6.9, 1.35, 5.9, 1.4, 'mvn test: 15 tests, 0 failures');
  await shot(s, S + 'github-commits.png', 6.9, 3.1, 5.9, 3.6, 'Commit history with the Actions result on each commit');
  s.addNotes('Application and Git. 60 seconds. Point at the commit list: red crosses are the CVE-driven upgrade, not noise.');

  // 4 Container and Kubernetes
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'Build' });
  s.addText('Tasks 2 and 3: container and GKE deployment', { placeholder: 'title' });
  s.addText('Container', { x: 0.6, y: 1.35, w: 5.6, h: 0.35, fontSize: 15, bold: true, color: C.accent3, margin: 0, isTextBox: true });
  bullets(s, ['Multi-stage Dockerfile: Maven build stage, Temurin 21 JRE on Alpine runtime, apk upgrade, HEALTHCHECK',
    'Layered jar so the dependency layer is cached between builds',
    'Non-root numeric uid 10001. Tagged pom-build-sha and pushed to Docker Hub by the pipeline'], 0.6, 1.75, 5.6, 1.75, 13);
  s.addText('Kubernetes (GKE, zonal, 2 x e2-standard-2)', { x: 0.6, y: 3.55, w: 5.6, h: 0.35, fontSize: 15, bold: true, color: C.accent3, margin: 0, isTextBox: true });
  bullets(s, ['Deployment with 2 replicas, RollingUpdate maxSurge 1 maxUnavailable 0, startup, readiness and liveness probes on Actuator',
    'LoadBalancer Service, ConfigMap via envFrom, required Secret created by hand, PodDisruptionBudget',
    'Pod security: runAsNonRoot, read-only root filesystem, all capabilities dropped, RuntimeDefault seccomp',
    'Lesson: the first pod failed with CreateContainerConfigError because the image user was a name. runAsNonRoot needs a numeric uid'], 0.6, 3.95, 5.6, 2.9, 13);
  await shot(s, E + 'T3-pods-svc.png', 6.6, 1.35, 6.2, 0.75, '2 pods Running and Ready behind the LoadBalancer');
  await shot(s, E + 'T4-rollout.png', 6.6, 2.55, 3.5, 3.2, 'Rolling update: new pod Ready before old pod terminates');
  await shot(s, E + 'T3-recovery.png', 10.3, 2.55, 2.5, 1.2, 'Deleted pod recreated in 35 s');
  await shot(s, E + 'T3-external-health.png', 10.3, 4.15, 2.5, 1.6, '/health through the external IP');
  s.addNotes('Container and Kubernetes. 75 seconds. Then switch to Cloud Shell for get pods and the health curl.');

  // 5 CI/CD
  pres.addSection({ title: 'Deliver' });
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'Deliver' });
  s.addText('Task 4: Jenkins pipeline, 10 builds that tell the story', { placeholder: 'title' });
  await shot(s, S + 'pipeline-history.png', 0.6, 1.3, 8.2, 5.2, 'Stage View, builds #1 to #5: success, failed test (nothing after Test ran), release 1.1.0, ROLLBACK run, redeploy');
  bullets(s, ['Checkout, Build, Test, Package, Security Checks, Container Build, Image Scan, Push, Deploy, Smoke Test. Any failure stops the run',
    'Version tag = pom version, build number, short SHA. Every image traces to one commit',
    'Deploy applies the manifests, annotates the revision with the build number, waits for rollout status; a failed rollout triggers rollout undo automatically',
    'ROLLBACK parameter: skip the build, roll back in one click (build #4, 82 s, back to 1.0.0)',
    'GitHub webhook starts builds; SCM polling as fallback. Email with console log and scan reports on every result',
    'Build #2: controlled failing test, pipeline red at Test, production untouched, FAILED email'], 9.0, 1.3, 3.8, 5.6, 12);
  s.addNotes('CI/CD. 90 seconds. Switch to Jenkins live: the build started at the beginning should be mid-pipeline. Click #2 to show the Test stage and skipped stages.');

  // 6 DevSecOps
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'Deliver' });
  s.addText('Task 5: security gates that block, secrets that stay out of Git', { placeholder: 'title' });
  await shot(s, S + 'blocked.png', 0.6, 1.3, 7.6, 2.4, 'Build #6: log4j-core 2.14.1 added, pipeline stopped at Security Checks in 16 s, nothing after it ran');
  await shot(s, S + 'scan-table.png', 0.6, 4.1, 7.6, 1.9, 'Trivy report archived by the build: CVE-2021-44228 and CVE-2021-45046 CRITICAL, fixed version listed');
  bullets(s, ['SpotBugs (high-priority bugs fail), Trivy on the repository (dependencies, Dockerfile and Kubernetes misconfiguration, secrets), Trivy on the built image. Policy: any CRITICAL fails before push',
    'The same policy runs in GitHub Actions on every push as a second opinion. It found the 16 CRITICALs in my own first image',
    'Remediation: remove the dependency, build #7 green. DS-0031 is a documented exception in .trivyignore',
    'Credentials: Docker Hub and Gmail in Jenkins credentials (masked); GKE access through the VM service account, container.developer only; app secret is a Kubernetes Secret created by hand, required, checked before deploy',
    'Jenkins UI reachable only from my IP and GitHub webhook ranges'], 8.5, 1.3, 4.3, 3.9, 11.5);
  await shot(s, E + 'T5-secrets-jenkins.png', 8.5, 5.3, 4.3, 1.3, 'Jenkins credentials, values masked');
  s.addNotes('DevSecOps. 90 seconds. Show build #6 console with the Trivy table, then Manage Jenkins, Credentials.');

  // 7 Monitoring
  pres.addSection({ title: 'Operate' });
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'Operate' });
  s.addText('Task 6: monitoring, alerting and logging', { placeholder: 'title' });
  await shot(s, S + 'dashboard.png', 0.6, 1.3, 6.3, 3.7, 'Grafana: request rate by status, approved vs rejected, p95 and p50, rejected share, replicas, JVM heap');
  await shot(s, S + 'alert-email.png', 7.2, 1.3, 2.9, 1.5, 'Alertmanager email: 84.57% rejected');
  await shot(s, S + 'cloud-logging.png', 10.25, 1.3, 2.55, 1.5, 'Cloud Logging: 2,248 REJECTED entries');
  bullets(s, ['kube-prometheus-stack by Helm; ServiceMonitor scrapes Actuator; dashboard from a ConfigMap',
    '4 rules: Down, HighRejectionRate (> 50% for 2 min), HighLatency (p95 > 500 ms), ReplicasLow',
    'Triggered with load at 80% invalid: Pending, Firing, email 30 s later, RESOLVED 4 min after load stopped',
    'Alertmanager routes only namespace=finsecure to email; GKE control-plane noise goes to a null receiver',
    'Structured log line per validation to stdout; kubectl logs per pod, Cloud Logging across pods',
    'Lesson: Boot publishes no histogram buckets by default; p95 was empty until build #8 fixed it. And a wrong Gmail app password only shows in Alertmanager logs (535)'], 7.2, 3.3, 5.6, 3.6, 11.5);
  await shot(s, E + 'T6-email-inbox-lifecycle.png', 0.6, 5.4, 6.3, 0.8, 'FIRING, RESOLVED and Jenkins emails in one inbox');
  s.addNotes('Monitoring. 2 minutes. Switch to Grafana live, then Alert rules, then Gmail, then Logs Explorer.');

  // 8 Architecture
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'Operate' });
  s.addText('End-to-end architecture and the decisions behind it', { placeholder: 'title' });
  await shot(s, 'docs/architecture-slide.png', 0.5, 1.25, 10.1, 5.6, null);
  const decisions = [['Jenkins outside the cluster', 'Deployer separate from what it deploys; VM pauses on its own; service account instead of key files'],
    ['Zonal GKE, 2 small nodes', 'Real LoadBalancer and Cloud Logging, free control plane, near-zero cost when paused'],
    ['Trivy twice, Actions as mirror', 'One policy, two engines; repository scan catches dependencies before an image exists'],
    ['Cloud Logging, not Loki', 'loki-stack is deprecated; GKE ships stdout with nothing to run'],
    ['Known limit', 'Duplicate and velocity state is per pod; production needs Redis or a database']];
  decisions.forEach(([h, t], i) => {
    const y = 1.25 + i * 1.12;
    s.addShape(pres.ShapeType.roundRect, { x: 10.75, y, w: 2.15, h: 1.0, fill: { color: C.background2 }, line: { color: C.background2 }, rectRadius: 0.08 });
    s.addText([{ text: h, options: { bold: true, color: C.text2, breakLine: true } }, { text: t, options: { color: C.text1 } }], { x: 10.83, y: y + 0.05, w: 2.0, h: 0.9, fontSize: 9, valign: 'top', margin: 0, isTextBox: true });
  });
  s.addNotes('Architecture, simplified for the slide. Numbered arrows follow one change from push to a monitored, alerting service. The full diagram is Figure 1 in the design document and docs/architecture.png.');

  // 9 AI
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'Operate' });
  s.addText('Task 7: AI use case, anomaly detection on the same metrics', { placeholder: 'title' });
  await shot(s, E + 'T7-anomaly-plot.png', 0.6, 1.3, 6.6, 4.4, 'Isolation Forest over req/s, rejected share and p95; red = flagged. 3 of 148 windows');
  await shot(s, E + 'T7-anomaly-output.png', 0.6, 6.15, 6.6, 0.8, null);
  const ai = [['Problem and why AI', 'Threshold rules only catch what I anticipated. An unsupervised model learns normal from the metrics and flags what does not fit, with no threshold per signal. Cheap false positives: a human glance, not an action'],
    ['Inputs', '3 PromQL series at 15 s resolution over 60 min: request rate, rejected share, p95. scikit-learn IsolationForest, contamination 3%'],
    ['Benefit seen', 'Flagged the first 30 s of the 80% run (reject 0.88); the static rule needed 2 min of breach. Also the quiet gap when build #6 was blocked'],
    ['Limits and governance', 'A 6 min incident is 10% of a 60 min window, so the plateau became normal and only its edges were flagged. Driver attribution is a heuristic and was wrong once. Not explainable: triage signal only, never automated remediation'],
    ['Integration', 'CronJob in the monitoring namespace writes an anomaly score as a Prometheus metric; a fifth rule alerts on it through the same Alertmanager and inbox']];
  ai.forEach(([h, t], i) => {
    const y = 1.3 + i * 1.13;
    tag(s, i + 1, 7.5, y + 0.02);
    s.addText([{ text: h, options: { bold: true, color: C.text2, breakLine: true } }, { text: t, options: { color: C.text1 } }], { x: 8.05, y, w: 4.75, h: 1.08, fontSize: 11, valign: 'top', margin: 0, isTextBox: true });
  });
  s.addNotes('AI use case. 90 seconds. Run the watcher live in Cloud Shell against the port-forwarded Prometheus and read the flagged windows.');

  // 10 Results, lessons, links
  pres.addSection({ title: 'Close' });
  s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: 'Close' });
  s.addText('Test results, lessons learned and where to look', { placeholder: 'title' });
  const rows = [['Test case', 'Result', 'Evidence'],
    ['Run unit tests', '15 pass in Cloud Shell, Actions and every Jenkins build', 'T1-tests'],
    ['Controlled failing test', 'Build #2 red at Test, no deploy, FAILED email, /health unchanged', 'T4-failed-test'],
    ['Container /health', 'UP locally and via LoadBalancer', 'T2-run-health, T3-external-health'],
    ['Deployment inspection', '2 pods Running, Ready', 'T3-pods-svc'],
    ['Deploy new version', 'Build #3, 1.1.0, zero-downtime rollout, revision annotated', 'T4-rollout'],
    ['Delete a pod', 'Recreated in 35 s', 'T3-recovery'],
    ['Controlled CRITICAL finding', 'Build #6 blocked at Security Checks; #7 green after fix', 'T5-blocked, T5-scan-reports'],
    ['Trigger an alert', 'HighRejectionRate fired, email at 84.57%, RESOLVED', 'T6-alert-firing, T6-alert-email'],
    ['Rollback', 'Build #4, ROLLBACK=true, back to 1.0.0 in 82 s', 'T4-rollback-health']];
  s.addTable(rows.map((r, i) => r.map(c => ({ text: c, options: { bold: i === 0, color: i === 0 ? C.background1 : C.text1, fill: { color: i === 0 ? THEME.colors.accent3 : (i % 2 ? 'FFFFFF' : 'F3F6FA') } } }))),
    { x: 0.6, y: 1.3, w: 7.9, colW: [2.0, 3.9, 2.0], fontSize: 10, border: { type: 'solid', color: 'D1D5DB', pt: 0.5 }, margin: 0.04, valign: 'middle', rowH: 0.42 });
  s.addText('Lessons learned', { x: 8.8, y: 1.3, w: 4.0, h: 0.35, fontSize: 15, bold: true, color: C.accent3, margin: 0, isTextBox: true });
  bullets(s, ['Security gates bite the author first: 16 CRITICALs in my own image forced the Boot 4 upgrade',
    'runAsNonRoot needs a numeric uid; a named user gives CreateContainerConfigError',
    'Spring Boot publishes no histogram buckets unless asked; p95 was silently empty',
    'A wrong Gmail app password fails quietly; Alertmanager logs told the truth',
    'Per-pod validator state is a real limit; note it, do not hide it'], 8.8, 1.7, 4.0, 2.6, 10.5);
  s.addText('Future work', { x: 8.8, y: 4.3, w: 4.0, h: 0.35, fontSize: 15, bold: true, color: C.accent3, margin: 0, isTextBox: true });
  bullets(s, ['Staging namespace with a promotion step', 'HTTPS with a managed certificate; TLS for Jenkins and Grafana', 'Least-privilege IAM and RBAC for the Jenkins service account; rootless image builds', 'HPA on request rate; anomaly watcher as a CronJob with its own alert'], 8.8, 4.7, 4.0, 1.6, 10.5);
  s.addText([
    { text: 'Repository and evidence: ', options: { bold: true } }, { text: REPO, options: { hyperlink: { url: REPO } } },
    { text: '   Design document: docs/FinSecure_Pay_Design_Document.docx   Demo script: docs/DEMO_SCRIPT.md   Recording: [link added at submission]', options: {} },
  ], { x: 0.6, y: 6.45, w: 12.2, h: 0.5, fontSize: 10.5, color: C.text1, margin: 0, isTextBox: true, valign: 'top' });
  s.addNotes('Close. 60 seconds. Walk the table, then the lessons, then links. Stop recording.');

  const out = 'docs/FinSecure_Pay_Capstone.pptx';
  await pres.writeFile({ fileName: out });
  await applyTheme(out, THEME);
  console.log('written', out);
})();
