"""
AI use case (Task 7): anomaly detection on the live API's Prometheus metrics.

Pulls request rate, rejection rate and p95 latency for the last N minutes from
Prometheus, trains an Isolation Forest on that window, and reports time windows
where the combination of the three looks unlike the rest. The point is to catch
problems that no single static threshold catches: a modest rise in latency together
with a modest rise in rejections, for example, scores as anomalous even though each
metric alone is below its alert threshold.

Usage (with Prometheus reachable, e.g. after
  kubectl -n monitoring port-forward svc/monitoring-kube-prometheus-prometheus 9090:9090):

  python ai/anomaly_watch.py --prometheus http://localhost:9090 --minutes 120
  python ai/anomaly_watch.py --prometheus http://localhost:9090 --minutes 120 --plot

Requires: pip install requests pandas scikit-learn matplotlib
"""
import argparse
import sys
import time

import pandas as pd
import requests
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

QUERIES = {
    "req_per_s": 'sum(rate(http_server_requests_seconds_count{application="finsecure-pay"}[1m]))',
    "reject_share": 'sum(rate(finsecure_validations_total{result="rejected"}[1m])) / clamp_min(sum(rate(finsecure_validations_total[1m])), 0.001)',
    "p95_latency_s": 'histogram_quantile(0.95, sum(rate(http_server_requests_seconds_bucket{application="finsecure-pay",uri="/validate"}[2m])) by (le))',
}


def query_range(base, expr, start, end, step):
    r = requests.get(f"{base}/api/v1/query_range",
                     params={"query": expr, "start": start, "end": end, "step": step}, timeout=30)
    r.raise_for_status()
    result = r.json()["data"]["result"]
    if not result:
        return pd.Series(dtype=float)
    values = result[0]["values"]
    s = pd.Series({pd.to_datetime(t, unit="s"): float(v) for t, v in values})
    return s.replace([float("inf"), float("-inf")], float("nan"))


def fetch(base, minutes, step="15s"):
    end = time.time()
    start = end - minutes * 60
    frame = pd.DataFrame({k: query_range(base, q, start, end, step) for k, q in QUERIES.items()})
    return frame.fillna(0.0)


def detect(frame, contamination=0.03):
    X = StandardScaler().fit_transform(frame.values)
    model = IsolationForest(n_estimators=200, contamination=contamination, random_state=42).fit(X)
    out = frame.copy()
    out["score"] = model.decision_function(X)
    out["anomaly"] = model.predict(X) == -1
    return out


def windows(out, gap="2min"):
    a = out[out["anomaly"]]
    if a.empty:
        return []
    groups = (a.index.to_series().diff() > pd.Timedelta(gap)).cumsum()
    rows = []
    for _, w in a.groupby(groups):
        driver = (w[["req_per_s", "reject_share", "p95_latency_s"]].mean() - out[["req_per_s", "reject_share", "p95_latency_s"]].mean()).abs().idxmax()
        rows.append({"start": w.index[0], "end": w.index[-1], "samples": len(w), "driver": driver,
                     "req_per_s": round(w["req_per_s"].mean(), 2), "reject_share": round(w["reject_share"].mean(), 2),
                     "p95_latency_s": round(w["p95_latency_s"].mean(), 3)})
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--prometheus", default="http://localhost:9090")
    ap.add_argument("--minutes", type=int, default=120)
    ap.add_argument("--contamination", type=float, default=0.03)
    ap.add_argument("--plot", action="store_true", help="write ai/anomaly_watch.png")
    args = ap.parse_args()

    frame = fetch(args.prometheus, args.minutes)
    if len(frame) < 40:
        print(f"Only {len(frame)} samples; need at least 40. Generate traffic with scripts/load.sh first.")
        sys.exit(1)
    out = detect(frame, args.contamination)
    out.to_csv("ai/anomaly_watch.csv")
    print(f"Samples: {len(out)}, anomalous: {int(out['anomaly'].sum())}")
    for w in windows(out):
        print(f"  {w['start']:%H:%M:%S} to {w['end']:%H:%M:%S}: {w['samples']} samples, driver={w['driver']}, "
              f"req/s={w['req_per_s']}, reject={w['reject_share']}, p95={w['p95_latency_s']}s")
    if args.plot:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        fig, axes = plt.subplots(3, 1, figsize=(12, 8), sharex=True)
        for ax, col, label in zip(axes, ["req_per_s", "reject_share", "p95_latency_s"], ["Requests/s", "Rejected share", "p95 latency (s)"]):
            ax.plot(out.index, out[col], linewidth=1)
            a = out[out["anomaly"]]
            ax.scatter(a.index, a[col], color="red", s=18, zorder=3)
            ax.set_ylabel(label); ax.grid(alpha=0.3)
        axes[0].set_title("FinSecure Pay: Isolation Forest over live Prometheus metrics (red = anomalous)")
        fig.autofmt_xdate(); fig.tight_layout(); fig.savefig("ai/anomaly_watch.png", dpi=150)
        print("Saved ai/anomaly_watch.png")


if __name__ == "__main__":
    main()
