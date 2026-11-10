#!/usr/bin/env python3
"""Simplified architecture for the slide deck (fewer boxes, larger text). The full diagram is docs/arch.py.
Run: python3 docs/arch_slide.py  -> docs/architecture-slide.svg, docs/architecture-slide.png"""
import html, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import arch  # reuse text_w and colours

W, H = 1750, 900
FONT = arch.FONT
bl, gr, am, pu, gy = arch.bl, arch.gr, arch.am, arch.pu, arch.gy
T_SZ, L_SZ, LBL_SZ, LH = 18, 16, 15, 22

ZONE = ("Runtime: GKE cluster finsecure-gke (zonal, 2 nodes)", 1160, 100, 570, 500, "#EFF8F0", "#9CCBA3")

B, A = {}, []
def box(i, x, y, w, h, title, lines, stroke): B[i] = dict(x=x, y=y, w=w, h=h, title=title, lines=lines, stroke=stroke)
def arrow(pts, label="", lpos=None, dashed=False): A.append(dict(pts=pts, label=label, lpos=lpos, dashed=dashed))

box("DEV", 60, 160, 220, 110, "Developer", ["git push", "(account chuajason)"], gy)
box("CLI", 60, 330, 220, 90, "API clients", ["POST /validate, GET /health", "scripts/load.sh"], gy)
box("GH", 360, 140, 300, 170, "GitHub: chuajason/finsecure-pay", ["app, Dockerfile, k8s/, Jenkinsfile,", "monitoring/, ai/, docs/", "Actions: build-verify (no deploy)"], bl)
box("JK", 790, 120, 290, 220, "Jenkins pipeline (VM)", ["Checkout, Build, Test, Package", "Security Checks: SpotBugs, Trivy", "Container Build, Image Scan", "Push, Deploy, Smoke Test", "any CRITICAL = fail; auto rollback", "tag = version-build-sha"], am)
box("DH", 800, 420, 280, 90, "Docker Hub", ["chuajason/finsecure-pay", "tags 1.1.0-<build>-<sha>"], gy)
box("POD", 1185, 150, 300, 130, "Deployment finsecure-pay", ["2 replicas, rolling update", "probes, PDB, non-root uid", "read-only root fs"], gr)
box("SVC", 1505, 150, 205, 130, "Service (LB)", ["35.197.154.237", ":80 to pods :8080"], gr)
box("CFG", 1420, 310, 290, 80, "ConfigMap and Secret", ["limits; API key (by hand)"], gr)
box("MON", 1380, 430, 330, 130, "Monitoring namespace", ["kube-prometheus-stack (Helm)", "Prometheus, Grafana,", "Alertmanager, 4 rules"], pu)
box("GM", 60, 650, 300, 100, "Gmail", ["Jenkins SUCCESS / FAILED", "Alertmanager FIRING / RESOLVED"], gy)
box("LOG", 1185, 650, 220, 90, "Cloud Logging", ["GKE agent, all pods", "Logs Explorer queries"], gy)
box("AI", 1490, 650, 220, 90, "AI anomaly watcher", ["Isolation Forest, run by hand", "CronJob: future work"], gy)

arrow([(280, 215), (360, 215)], "1 push", (290, 203))
arrow([(660, 215), (790, 215)], "2 webhook", (670, 203))
arrow([(935, 340), (935, 420)], "3 push image", (945, 385))
arrow([(1080, 200), (1185, 200)], "4 apply", (1095, 188))
arrow([(1080, 465), (1130, 465), (1130, 250), (1185, 250)], "5 pull", (1088, 458), dashed=True)
arrow([(170, 330), (170, 300), (30, 300), (30, 75), (1600, 75), (1600, 150)], "6 HTTP requests (clients, load generator, smoke test)", (700, 70))
arrow([(1505, 215), (1485, 215)], "")
arrow([(1455, 280), (1455, 310)], "")
arrow([(1395, 430), (1395, 280)], "7 scrape metrics", (1265, 420), dashed=True)
arrow([(1430, 560), (1430, 870), (210, 870), (210, 750)], "8 alert emails", (1440, 800))
arrow([(770, 340), (770, 700), (360, 700)], "9 build emails", (780, 690))
arrow([(1230, 280), (1230, 650)], "10 stdout logs", (1240, 620), dashed=True)
arrow([(1600, 560), (1600, 650)], "11 query_range", (1610, 615), dashed=True)

TITLE = "FinSecure Pay: architecture, simplified (full diagram in the design document)"

def svg():
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="{FONT}">',
           '<defs><marker id="ah" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12" refX="11" refY="6" orient="auto"><path d="M0,0 L12,6 L0,12 z" fill="#333333"/></marker></defs>',
           f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>',
           f'<text x="40" y="42" font-size="26" font-weight="bold" fill="#1F2937">{html.escape(TITLE)}</text>']
    name, x, y, w, h, fill, stroke = ZONE
    out.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>')
    out.append(f'<text x="{x+14}" y="{y+28}" font-size="17" font-weight="bold" fill="#1F2937">{html.escape(name)}</text>')
    for i, b in B.items():
        out.append(f'<rect x="{b["x"]}" y="{b["y"]}" width="{b["w"]}" height="{b["h"]}" rx="6" fill="#FFFFFF" stroke="{b["stroke"]}" stroke-width="2.5"/>')
        ty = b["y"] + 26
        out.append(f'<text x="{b["x"]+b["w"]/2}" y="{ty}" text-anchor="middle" font-size="{T_SZ}" font-weight="bold" fill="#1F2937">{html.escape(b["title"])}</text>')
        for ln in b["lines"]:
            ty += LH
            out.append(f'<text x="{b["x"]+b["w"]/2}" y="{ty}" text-anchor="middle" font-size="{L_SZ}" fill="#374151">{html.escape(ln)}</text>')
    for a in A:
        d = "M" + " L".join(f"{x},{y}" for x, y in a["pts"])
        dash = ' stroke-dasharray="7 5"' if a["dashed"] else ""
        out.append(f'<path d="{d}" fill="none" stroke="#333333" stroke-width="2.5"{dash} marker-end="url(#ah)"/>')
        if a["label"]:
            lx, ly = a["lpos"]
            out.append(f'<text x="{lx}" y="{ly}" font-size="{LBL_SZ}" font-weight="bold" fill="#111827">{html.escape(a["label"])}</text>')
    out.append('</svg>')
    return "\n".join(out)

def checks():
    text_w = arch.text_w
    probs = []
    for i, b in B.items():
        for s, sz in [(b["title"], T_SZ)] + [(l, L_SZ) for l in b["lines"]]:
            w = text_w(s, sz) * 1.05
            if w > b["w"] - 12: probs.append(f"overflow {i}: '{s}' {w:.0f}>{b['w']-12}")
        need = 26 + LH * len(b["lines"]) + 10
        if need > b["h"]: probs.append(f"too tall {i}: need {need} > {b['h']}")
    labels = []
    for a in A:
        if a["label"]:
            lx, ly = a["lpos"]; w = text_w(a["label"], LBL_SZ) * 1.05
            labels.append((a["label"], lx, ly - 14, lx + w, ly + 3))
            if lx + w > W - 10: probs.append(f"label off canvas '{a['label']}'")
    boxes = list(B.values())
    for name, x0, y0, x1, y1 in labels:
        for b in boxes:
            if x0 < b["x"] + b["w"] and x1 > b["x"] and y0 < b["y"] + b["h"] and y1 > b["y"]: probs.append(f"label '{name}' over box {b['title']}")
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
            if segs[i][0] != segs[j][0] and cross(segs[i][1:], segs[j][1:]): probs.append(f"arrow cross: {segs[i][0]} x {segs[j][0]}")
    for name, p, q in segs:
        for t in [k / 80 for k in range(1, 80)]:
            x = p[0] + (q[0] - p[0]) * t; y = p[1] + (q[1] - p[1]) * t
            for b in boxes:
                if b["x"] + 2 < x < b["x"] + b["w"] - 2 and b["y"] + 2 < y < b["y"] + b["h"] - 2:
                    probs.append(f"arrow {name} passes through box {b['title']}"); break
            else: continue
            break
        for ln, x0, y0, x1, y1 in labels:
            if ln == name: continue
            for t in [k / 80 for k in range(0, 81)]:
                x = p[0] + (q[0] - p[0]) * t; y = p[1] + (q[1] - p[1]) * t
                if x0 < x < x1 and y0 < y < y1: probs.append(f"arrow {name} through label '{ln}'"); break
    return sorted(set(probs))

if __name__ == "__main__":
    open("docs/architecture-slide.svg", "w").write(svg())
    import cairosvg
    cairosvg.svg2png(url="docs/architecture-slide.svg", write_to="docs/architecture-slide.png", output_width=W * 2)
    for p in checks(): print("PROBLEM:", p)
    print("done")
