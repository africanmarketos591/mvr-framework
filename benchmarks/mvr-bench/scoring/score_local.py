#!/usr/bin/env python3
"""Local scorer for the public MVR-Bench development split only.

Private leaderboard scoring is performed server-side by African Market OS.
This file intentionally does not contain the private answer key or MVR engine.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple


VERDICT_ORDER = {
    "permission_not_yet_earned": 0,
    "pilot_only": 1,
    "pilot_ready": 2,
    "ready_to_scale": 3,
}


def load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def verdict_agreement(pred: str, truth: str) -> float:
    if pred not in VERDICT_ORDER or truth not in VERDICT_ORDER:
        return 0.0
    distance = abs(VERDICT_ORDER[pred] - VERDICT_ORDER[truth])
    return max(0.0, 1.0 - (distance / 3.0))


def is_reckless_go(pred: str, truth: str) -> bool:
    return VERDICT_ORDER.get(pred, -1) >= 2 and VERDICT_ORDER.get(truth, 99) <= 1


def jaccard(a: Iterable[str], b: Iterable[str]) -> float:
    aa = {str(x).strip().lower() for x in a if str(x).strip()}
    bb = {str(x).strip().lower() for x in b if str(x).strip()}
    if not aa and not bb:
        return 1.0
    if not aa or not bb:
        return 0.0
    return len(aa & bb) / len(aa | bb)


def f1(tp: int, fp: int, fn: int) -> float:
    if tp == 0 and fp == 0 and fn == 0:
        return 1.0
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    if precision + recall == 0:
        return 0.0
    return 2 * precision * recall / (precision + recall)


def calibration_error(rows: List[Tuple[float, float]]) -> float:
    if not rows:
        return 1.0
    # Lightweight expected calibration error over five bins.
    bins = [[] for _ in range(5)]
    for conf, correct in rows:
        idx = min(4, max(0, int(math.floor(conf * 5))))
        bins[idx].append((conf, correct))
    total = len(rows)
    ece = 0.0
    for bucket in bins:
        if not bucket:
            continue
        avg_conf = sum(x[0] for x in bucket) / len(bucket)
        avg_acc = sum(x[1] for x in bucket) / len(bucket)
        ece += (len(bucket) / total) * abs(avg_conf - avg_acc)
    return ece


def score(cases: List[Dict[str, Any]], submission: Dict[str, Any]) -> Dict[str, Any]:
    labels = {case["id"]: case["public_label"] for case in cases}
    predictions = {pred["id"]: pred for pred in submission.get("predictions", [])}
    missing = sorted(set(labels) - set(predictions))
    extra = sorted(set(predictions) - set(labels))
    if missing:
        raise SystemExit(f"Missing predictions for case ids: {', '.join(missing)}")
    if extra:
        raise SystemExit(f"Unknown prediction ids: {', '.join(extra)}")

    verdict_scores = []
    reckless = 0
    dim_scores = []
    abstain_tp = abstain_fp = abstain_fn = 0
    calibration_rows = []

    case_rows = []
    for case_id, truth in labels.items():
        pred = predictions[case_id]
        pred_verdict = str(pred.get("verdict", ""))
        truth_verdict = str(truth["verdict"])
        verdict_score = verdict_agreement(pred_verdict, truth_verdict)
        verdict_scores.append(verdict_score)
        reckless_flag = is_reckless_go(pred_verdict, truth_verdict)
        reckless += 1 if reckless_flag else 0
        dim_score = jaccard(pred.get("blocking_dimensions", []), truth.get("blocking_dimensions", []))
        dim_scores.append(dim_score)

        pred_abs = bool(pred.get("abstain"))
        truth_abs = bool(truth.get("abstain_expected"))
        if pred_abs and truth_abs:
            abstain_tp += 1
        elif pred_abs and not truth_abs:
            abstain_fp += 1
        elif not pred_abs and truth_abs:
            abstain_fn += 1

        conf = max(0.0, min(1.0, float(pred.get("confidence", 0.0))))
        calibration_rows.append((conf, 1.0 if pred_verdict == truth_verdict else 0.0))
        case_rows.append({
            "id": case_id,
            "truth": truth_verdict,
            "prediction": pred_verdict,
            "verdict_agreement": round(verdict_score, 4),
            "reckless_go": reckless_flag,
            "dimension_attribution": round(dim_score, 4),
        })

    n = len(labels)
    verdict_avg = sum(verdict_scores) / n if n else 0.0
    reckless_rate = reckless / n if n else 0.0
    abstention_f1 = f1(abstain_tp, abstain_fp, abstain_fn)
    dimension_avg = sum(dim_scores) / n if n else 0.0
    ece = calibration_error(calibration_rows)
    composite = 100.0 * (
        0.40 * verdict_avg
        + 0.25 * (1.0 - reckless_rate)
        + 0.20 * abstention_f1
        + 0.15 * dimension_avg
    ) - (10.0 * ece)
    composite = max(0.0, min(100.0, composite))

    return {
        "benchmark": "MVR-Bench",
        "split": "public_dev",
        "run_name": submission.get("run_name"),
        "model": submission.get("model"),
        "score": round(composite, 2),
        "reckless_go_rate": round(reckless_rate, 4),
        "verdict_agreement": round(verdict_avg, 4),
        "abstention_f1": round(abstention_f1, 4),
        "dimension_attribution": round(dimension_avg, 4),
        "calibration_error": round(ece, 4),
        "case_count": n,
        "not_private_leaderboard": True,
        "case_results": case_rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Score an MVR-Bench public-dev submission.")
    parser.add_argument("--cases", required=True, type=Path)
    parser.add_argument("--submission", required=True, type=Path)
    args = parser.parse_args()
    result = score(load_json(args.cases), load_json(args.submission))
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
