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
OPENAPI_SNAPSHOTS = [
    ROOT / "openapi.json",
    ROOT / "openapi.yaml",
    ROOT / "api" / "openapi.json",
    ROOT / "api" / "openapi.yaml",
]
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
        "issue_consent_token",
        "consent_token_once",
        "consent_attestation",
        "mvr-outcome-consent@2026-07-24.2",
        "consent_to_outcome_processing",
        "horizon_months",
        "reviewer_attestation",
        "confirm_withdrawal",
        "50 unique prospectively enrolled decisions",
        "3 represented geographies",
        "does **not** mean that MVR has published predictive accuracy",
        "server-keyed HMAC-SHA256",
        "One decision receipt can create only one prospective enrollment",
        "within seven days",
        "expires after 30 minutes",
    ]
    for phrase in required:
        require(phrase in text, f"runbook is missing required contract text: {phrase}")
    require("raw documents" in text and "interview transcripts" in text, "privacy exclusions are incomplete")
    require("consent_to_outcome_followup" not in text, "legacy Boolean-only consent remains documented")
    require("a model cannot approve or issue consent" in text, "model-consent boundary is missing")


def validate_openapi_operation(openapi: dict, source: str) -> dict:
    require(openapi.get("info", {}).get("version") == "v6.32.0", f"{source} core API version drifted")
    operation = ((openapi.get("paths") or {}).get("/v1/outcome-ledger") or {}).get("post")
    require(isinstance(operation, dict), f"{source} does not publish POST /v1/outcome-ledger")
    schema = (
        operation.get("requestBody", {})
        .get("content", {})
        .get("application/json", {})
        .get("schema", {})
    )
    action = schema.get("properties", {}).get("action", {})
    require(
        set(action.get("enum") or [])
        == {
            "issue_consent_token",
            "decline_followup",
            "enroll",
            "record_outcome",
            "get",
            "list",
            "metrics",
            "withdraw",
        },
        f"{source} outcome-ledger actions drifted",
    )
    consent_token = schema.get("properties", {}).get("consent_token", {})
    require(consent_token.get("writeOnly") is True, f"{source} must mark consent_token writeOnly")
    horizon_months = schema.get("properties", {}).get("horizon_months", {})
    require(horizon_months.get("type") == "array", f"{source} horizon_months must be an array")
    require(horizon_months.get("minItems") == 3, f"{source} must require all three standard horizons")
    require(horizon_months.get("maxItems") == 3, f"{source} must reject additional horizons")
    require(
        horizon_months.get("items", {}).get("enum") == [6, 12, 18],
        f"{source} horizon_months enum drifted",
    )
    properties = schema.get("properties", {})
    for free_text_field in ("decision_domain", "decision_type", "response_profile"):
        require(
            free_text_field not in properties,
            f"{source} must not accept caller-supplied {free_text_field}",
        )
    require(schema.get("additionalProperties") is False, f"{source} outcome-ledger request must fail closed")
    return operation


def validate_local_openapi() -> None:
    canonical = None
    for snapshot in OPENAPI_SNAPSHOTS:
        document = json.loads(snapshot.read_text(encoding="utf-8"))
        operation = validate_openapi_operation(document, str(snapshot.relative_to(ROOT)))
        serialized = json.dumps(operation, sort_keys=True)
        if canonical is None:
            canonical = serialized
        else:
            require(serialized == canonical, f"{snapshot.relative_to(ROOT)} outcome contract drifted")


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
    operation = validate_openapi_operation(openapi, OPENAPI_URL)
    require(
        operation.get("x-mvr-outcome-publication-gate") == gate,
        "OpenAPI publication gate differs from the public status manifest",
    )
    description = json.dumps(operation, sort_keys=True)
    require("issue_consent_token" in description, "OpenAPI does not document consent-token issuance")
    require("consent_token" in description, "OpenAPI does not document token-bound enrollment")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="also verify production status and OpenAPI")
    args = parser.parse_args()
    validate_runbook()
    validate_local_openapi()
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
