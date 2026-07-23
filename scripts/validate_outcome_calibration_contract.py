#!/usr/bin/env python3
"""Validate the public MVR outcome-calibration contract without exposing private data."""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parents[1]
RUNBOOK = ROOT / "docs" / "outcome-calibration-ledger.md"
STATUS_URL = "https://africanmarketos.com/.well-known/mvr-outcome-calibration.json"
OPENAPI_URL = "https://africanmarketos.com/api/openapi.json"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "mvr-outcome-contract-validator/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        require(response.status == 200, f"{url} returned HTTP {response.status}")
        return json.load(response)


def validate_runbook() -> None:
    text = RUNBOOK.read_text(encoding="utf-8")
    required = [
        "decision_reference_hash",
        "consent_to_outcome_followup",
        "consent_to_outcome_processing",
        "horizon_months",
        "reviewer_attestation",
        "confirm_withdrawal",
        "50 unique prospectively enrolled decisions",
        "3 represented geographies",
        "does **not** mean that MVR has published predictive accuracy",
        "server-keyed HMAC-SHA256",
    ]
    for phrase in required:
        require(phrase in text, f"runbook is missing required contract text: {phrase}")
    require("raw documents" in text and "interview transcripts" in text, "privacy exclusions are incomplete")


def validate_live() -> None:
    status = fetch_json(STATUS_URL)
    require(status.get("status") == "active_prospective_collection", "prospective collection is not active")
    require(status.get("public_performance_result") is None, "a public performance result is being claimed prematurely")
    require(
        status.get("public_result_status") == "withheld_until_preregistered_cohort_gate_is_met",
        "public result is not explicitly withheld",
    )
    gate = status.get("publication_gate") or {}
    require(gate.get("minimum_reviewed_outcomes") == 50, "reviewed-outcome floor drifted")
    require(gate.get("minimum_geographies") == 3, "geography floor drifted")
    require(
        gate.get("counting_unit")
        == "unique_prospectively_enrolled_decisions_with_at_least_one_included_observation",
        "publication counting unit is unsafe or ambiguous",
    )
    openapi = fetch_json(OPENAPI_URL)
    operation = ((openapi.get("paths") or {}).get("/v1/outcome-ledger") or {}).get("post")
    require(isinstance(operation, dict), "OpenAPI does not publish POST /v1/outcome-ledger")
    require(
        operation.get("x-mvr-outcome-publication-gate") == gate,
        "OpenAPI publication gate differs from the public status manifest",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="also verify production status and OpenAPI")
    args = parser.parse_args()
    validate_runbook()
    if args.live:
        validate_live()
    print(json.dumps({"status": "pass", "runbook": True, "live": args.live}, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(json.dumps({"status": "fail", "error": str(exc)}, sort_keys=True), file=sys.stderr)
        raise SystemExit(1)
