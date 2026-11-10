#!/usr/bin/env python3
"""FinSecure Pay end-to-end architecture: SVG from one geometry model, with overlap checks.
Run: python3 docs/arch.py  -> docs/architecture.svg, docs/architecture.png"""
import html, subprocess, sys

W, H = 1900, 1130
FONT = "Calibri, Carlito, Helvetica, Arial, sans-serif"
bl, gr, am, pu, gy = "#2F5496", "#2E7D32", "#B26A00", "#7B3F7B", "#555555"

ZONES = [
    ("Source and verification (GitHub)", "", 380, 110, 340, 510, "#EEF4FB", "#9DB8D9"),
    ("CI/CD: Jenkins VM (GCE e2-standard-4)", "", 760, 110, 360, 510, "#FFF6EA", "#E2B97F"),
    ("Runtime: GKE cluster finsecure-gke", "", 1160, 110, 700, 740, "#EFF8F0", "#9CCBA3"),
    ("Observers and notifications", "", 380, 870, 1480, 200, "#F7EEF7", "#C7A3C7"),
]

B = {}
def box(i, x, y, w, h, title, lines, stroke, dashed=False, label=""):
    B[i] = dict(x=x, y=y, w=w, h=h, title=title, lines=lines, stroke=stroke, dashed=dashed, label=label)

box("CLI", 60, 130, 260, 100, "API clients and load generator", ["POST /validate, GET /health", "scripts/load.sh"], gy)
box("DEV", 60, 280, 260, 120, "Developer", ["git commit and push", "(GitHub account chuajason)"], gy)
box("GH", 410, 280, 280, 130, "GitHub repository", ["chuajason/finsecure-pay (public)", "Spring Boot app, Dockerfile, k8s/,", "Jenkinsfile, monitoring/, ai/, docs/"], bl)
box("GA", 410, 450, 280, 130, "GitHub Actions: build-verify", ["compile, 15 JUnit tests, SpotBugs,", "Trivy fs and image (CRITICAL fails)", "verification only, no deploy"], bl)
box("JK", 790, 180, 300, 320, "Jenkins pipeline (Jenkinsfile)", [
    "1 Checkout: tag = pom-build-sha",
    "2 Build   3 Test (JUnit)",
    "4 Package (layered jar)",
    "5 Security Checks: SpotBugs,",
    "   Trivy fs (CRITICAL = fail)",
    "6 Container Build",
    "7 Image Scan: Trivy (CRITICAL = fail)",
    "8 Push to Docker Hub",
    "9 Deploy: kubectl apply, rollout",
    "   status, auto rollback on failure",
    "10 Smoke Test /health",
    "ROLLBACK param: rollout undo",
    "GKE auth: VM service account"], am)
box("DH", 850, 640, 240, 110, "Docker Hub", ["docker.io/chuajason/finsecure-pay", "tags 1.0.0, 1.1.0-<build>-<sha>"], gy)
box("NSF", 1190, 180, 540, 300, "", [], gr, dashed=True, label="namespace finsecure")
box("POD", 1210, 230, 320, 130, "Deployment finsecure-pay", ["2 replicas, RollingUpdate maxUnavailable 0", "startup, readiness, liveness probes", "runAsNonRoot uid 10001, read-only root fs", "PodDisruptionBudget minAvailable 1"], gr)
box("SVC", 1560, 230, 160, 100, "Service (LB)", ["35.197.154.237:80", "to pods :8080"], gr)
box("CFG", 1230, 380, 200, 85, "ConfigMap", ["validation limits, currencies,", "velocity, JAVA_TOOL_OPTIONS"], gr)
box("SEC", 1470, 380, 240, 85, "Secret (by hand, never in Git)", ["FINSECURE_API_KEY", "required: deploy fails if missing"], gr)
box("NSM", 1190, 510, 640, 320, "", [], pu, dashed=True, label="namespace monitoring")
box("PRM", 1230, 560, 250, 110, "Prometheus", ["scrapes ServiceMonitor targets", "4 rules: Down, HighRejectionRate,", "HighLatency, ReplicasLow"], pu)
box("ALM", 1530, 560, 270, 110, "Alertmanager", ["route namespace=finsecure to email", "group_wait 30s, resolved notices"], pu)
box("GRF", 1230, 720, 250, 90, "Grafana (LoadBalancer)", ["FinSecure Pay dashboard, 6 panels", "loaded from a ConfigMap"], pu)
box("KSM", 1530, 720, 270, 90, "kube-state-metrics, node-exporter", ["replica counts, node and", "pod resource metrics"], pu)
box("CL", 850, 930, 240, 110, "Cloud Logging (GKE agent)", ["container stdout, all pods", "Logs Explorer by namespace"], gy)
box("AI", 1190, 930, 270, 110, "AI anomaly watcher (run by hand)", ["ai/anomaly_watch.py, Isolation Forest", "over req/s, rejected share, p95", "CronJob and alert: future work"], gy)
box("GM", 1500, 930, 300, 110, "Gmail (jason.rockie@gmail.com)", ["Jenkins SUCCESS / FAILED emails", "Alertmanager FIRING / RESOLVED emails"], gy)

A = []
def arrow(pts, label="", lpos=None, dashed=False, color="#333333"):
    A.append(dict(pts=pts, label=label, lpos=lpos, dashed=dashed, color=color))

arrow([(320, 340), (410, 340)], "1 push", (340, 328))
arrow([(550, 410), (550, 450)], "2a Actions run", (560, 438))
arrow([(690, 340), (790, 340)], "2b webhook", (700, 328))
arrow([(970, 500), (970, 640)], "3 push image", (980, 580))
arrow([(1090, 300), (1210, 300)], "4 kubectl apply", (1100, 288))
arrow([(1090, 695), (1140, 695), (1140, 330), (1210, 330)], "5 image pull", (1100, 720), dashed=True)
arrow([(190, 130), (190, 95), (1635, 95), (1635, 230)], "6 HTTP requests (clients, load generator, Jenkins smoke test)", (700, 88))
arrow([(1560, 280), (1530, 280)], "")
arrow([(1330, 360), (1330, 380)], "")
arrow([(1500, 360), (1500, 380)], "")
arrow([(1450, 560), (1450, 360)], "7 scrape /actuator/prometheus", (1460, 498), dashed=True)
arrow([(1480, 615), (1530, 615)], "8 alert", (1483, 603))
arrow([(1300, 670), (1300, 720)], "9 query", (1310, 703))
arrow([(1800, 615), (1830, 615), (1830, 985), (1800, 985)], "10 alert email", (1735, 850))
arrow([(790, 480), (740, 480), (740, 1095), (1650, 1095), (1650, 1040)], "11 build emails", (760, 1085))
arrow([(1190, 465), (1170, 465), (1170, 858), (970, 858), (970, 930)], "12 stdout logs", (980, 915), dashed=True)
arrow([(1205, 930), (1205, 640), (1230, 640)], "13 query_range", (1215, 880), dashed=True)

TITLE = "FinSecure Pay: end-to-end architecture (as deployed, November 2026)"
SUB = "Solid arrows: delivery and request paths. Dashed arrows: pulls and reads. GKE is zonal (asia-southeast1-a, 2 x e2-standard-2); monitoring is kube-prometheus-stack installed with Helm. Numbers follow one change from push to a monitored, alerting service."

def text_w(s, size):
    from fontTools.ttLib import TTFont
    if not hasattr(text_w, "f"):
        text_w.f = TTFont('/usr/share/fonts/truetype/crosextra/Carlito-Regular.ttf')
    f = text_w.f; cmap = f.getBestCmap(); hm = f['hmtx'].metrics; upm = f['head'].unitsPerEm
    return sum(hm[cmap.get(ord(c), cmap.get(ord('x')))][0] for c in s) * size / upm

def svg():
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">',
           '<defs><marker id="ah" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 z" fill="#333333"/></marker></defs>',
           f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>',
           f'<text x="40" y="48" font-size="28" font-weight="bold" fill="#1F2937">{html.escape(TITLE)}</text>',
           f'<text x="40" y="76" font-size="15" fill="#4B5563">{html.escape(SUB)}</text>']
    for name, sub, x, y, w, h, fill, stroke in ZONES:
        out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>')
        out.append(f'<text x="{x+14}" y="{y+26}" font-size="16" font-weight="bold" fill="#1F2937">{html.escape(name)}</text>')
    for i, b in B.items():
        if b["dashed"]:
            out.append(f'<rect x="{b["x"]}" y="{b["y"]}" width="{b["w"]}" height="{b["h"]}" rx="8" fill="none" stroke="{b["stroke"]}" stroke-width="2" stroke-dasharray="8 5"/>')
            out.append(f'<text x="{b["x"]+14}" y="{b["y"]+22}" font-size="14" font-weight="bold" fill="{b["stroke"]}">{html.escape(b["label"])}</text>')
            continue
        out.append(f'<rect x="{b["x"]}" y="{b["y"]}" width="{b["w"]}" height="{b["h"]}" rx="6" fill="#FFFFFF" stroke="{b["stroke"]}" stroke-width="2"/>')
        ty = b["y"] + 22
        out.append(f'<text x="{b["x"]+b["w"]/2}" y="{ty}" text-anchor="middle" font-size="15" font-weight="bold" fill="#1F2937">{html.escape(b["title"])}</text>')
        left = i == "JK"
        for ln in b["lines"]:
            ty += 19 if not left else 22
            if left:
                out.append(f'<text x="{b["x"]+14}" y="{ty}" font-size="13" fill="#374151" xml:space="preserve">{html.escape(ln)}</text>')
            else:
                out.append(f'<text x="{b["x"]+b["w"]/2}" y="{ty}" text-anchor="middle" font-size="13" fill="#374151">{html.escape(ln)}</text>')
    for a in A:
        d = "M" + " L".join(f"{x},{y}" for x, y in a["pts"])
        dash = ' stroke-dasharray="6 4"' if a["dashed"] else ""
        out.append(f'<path d="{d}" fill="none" stroke="{a["color"]}" stroke-width="2"{dash} marker-end="url(#ah)"/>')
        if a["label"]:
            lx, ly = a["lpos"]
            out.append(f'<text x="{lx}" y="{ly}" font-size="13" font-weight="bold" fill="#111827">{html.escape(a["label"])}</text>')
    out.append('</svg>')
    return "\n".join(out)

def checks():
    probs = []
    for i, b in B.items():
        if b["dashed"]: continue
        left = i == "JK"
        for s, sz in [(b["title"], 15)] + [(l, 13) for l in b["lines"]]:
            w = text_w(s, sz) * 1.05
            lim = b["w"] - (28 if left else 12)
            if w > lim: probs.append(f"overflow {i}: '{s}' {w:.0f}>{lim}")
        need = 22 + (22 if left else 19) * len(b["lines"]) + 8
        if need > b["h"]: probs.append(f"too tall {i}: need {need} > {b['h']}")
    labels = []
    for a in A:
        if a["label"]:
            lx, ly = a["lpos"]; w = text_w(a["label"], 13) * 1.05
            labels.append((a["label"], lx, ly - 12, lx + w, ly + 3))
    solid = [b for i, b in B.items() if not b["dashed"]]
    for name, x0, y0, x1, y1 in labels:
        for b in solid:
            if x0 < b["x"] + b["w"] and x1 > b["x"] and y0 < b["y"] + b["h"] and y1 > b["y"]:
                probs.append(f"label '{name}' over box {b['title']}")
        for n2, a0, b0, a1, b1 in labels:
            if n2 <= name: continue
            if x0 < a1 and x1 > a0 and y0 < b1 and y1 > b0: probs.append(f"label '{name}' overlaps '{n2}'")
    segs = []
    for a in A:
        p = a["pts"]
        for k in range(len(p) - 1): segs.append((a["label"] or str(p[0]), p[k], p[k + 1]))
    def cross(s1, s2):
        (x1, y1), (x2, y2) = s1; (x3, y3), (x4, y4) = s2
        d = (x2 - x1) * (y4 - y3) - (y2 - y1) * (x4 - x3)
        if d == 0: return False
        t = ((x3 - x1) * (y4 - y3) - (y3 - y1) * (x4 - x3)) / d
        u = ((x3 - x1) * (y2 - y1) - (y3 - y1) * (x2 - x1)) / d
        return 0.001 < t < 0.999 and 0.001 < u < 0.999
    for i in range(len(segs)):
        for j in range(i + 1, len(segs)):
            if segs[i][0] == segs[j][0]: continue
            if cross(segs[i][1:], segs[j][1:]): probs.append(f"arrow cross: {segs[i][0]} x {segs[j][0]}")
    for name, p, q in segs:
        for t in [k / 60 for k in range(1, 60)]:
            x = p[0] + (q[0] - p[0]) * t; y = p[1] + (q[1] - p[1]) * t
            for b in solid:
                if b["x"] + 2 < x < b["x"] + b["w"] - 2 and b["y"] + 2 < y < b["y"] + b["h"] - 2:
                    probs.append(f"arrow {name} passes through box {b['title']}"); break
            else: continue
            break
        for ln, x0, y0, x1, y1 in labels:
            if ln == name: continue
            for t in [k / 60 for k in range(0, 61)]:
                x = p[0] + (q[0] - p[0]) * t; y = p[1] + (q[1] - p[1]) * t
                if x0 < x < x1 and y0 < y < y1: probs.append(f"arrow {name} through label '{ln}'"); break
        if ((p[0]-q[0])**2 + (p[1]-q[1])**2) ** 0.5 < 12: probs.append(f"segment shorter than arrowhead: {name}")
    # zone titles vs boxes
    return sorted(set(probs))

if __name__ == "__main__":
    open("docs/architecture.svg", "w").write(svg())
    import cairosvg
    cairosvg.svg2png(url="docs/architecture.svg", write_to="docs/architecture.png", output_width=W*2)
    for p in checks(): print("PROBLEM:", p)
    print("done")
