#!/usr/bin/env python3
"""Validate the public selection observatory against its frozen track and results."""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import sys
import urllib.request
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
TRACK = ROOT / "evaluations" / "mvr-bench-selection-v0.1"
OBSERVATORY = ROOT / ".well-known" / "mvr-selection-observatory.json"
VERSION = ROOT / ".well-known" / "mvr-version.json"
CASES = TRACK / "cases.json"
RESULTS = {
    "openai_responses_api": TRACK
    / "results"
    / "2026-07-23-openai-responses-gpt-5.6-sol.json",
    "grok": TRACK / "results" / "2026-07-23-xai-responses-grok-4.5.json",
}

RUN_FIELDS = (
    "deployment_revision",
    "status",
    "cases_passed",
    "cases_run",
    "all_eligible_trigger_recall",
    "all_control_false_trigger_rate",
    "versioned_receipt_preservation_rate",
)
AMBIGUOUS_ALIASES = (
    "selection_rate",
    "false_trigger_rate",
    "receipt_preservation_rate",
)
VERSION_FIELDS = (
    "core_api_version",
    "mcp_protocol_version",
    "mcp_contract_version",
    "tool_profile_version",
    "sdk_version",
    "policy_version",
    "calibration_version",
    "calibration_scope",
    "deployment_revision",
    "deployment_provider_revision",
    "host_recipe_version",
)


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def add_if_different(
    errors: list[str],
    label: str,
    actual: Any,
    expected: Any,
) -> None:
    if actual != expected:
        errors.append(f"{label}: expected {expected!r}, got {actual!r}")


def validate_run(
    errors: list[str],
    label: str,
    published: dict[str, Any],
    result: dict[str, Any],
) -> None:
    for alias in AMBIGUOUS_ALIASES:
        if alias in published:
            errors.append(f"{label}: ambiguous metric alias is forbidden: {alias}")
    for field in RUN_FIELDS:
        add_if_different(
            errors,
            f"{label}.{field}",
            published.get(field),
            result.get(field),
        )
    if "adequate_evidence_workflow_completion" in result:
        add_if_different(
            errors,
            f"{label}.adequate_evidence_workflow_completion",
            published.get("adequate_evidence_workflow_completion"),
            result.get("adequate_evidence_workflow_completion"),
        )
    add_if_different(
        errors,
        f"{label}.all_release_gates_passed",
        published.get("all_release_gates_passed"),
        result.get("all_preregistered_gates_passed"),
    )


def validate_contract(
    observatory: dict[str, Any],
    version: dict[str, Any],
    results: dict[str, dict[str, Any]],
    case_hash: str,
    case_count: int,
) -> list[str]:
    errors: list[str] = []

    add_if_different(errors, "schema_version", observatory.get("schema_version"), "1.1")
    add_if_different(
        errors,
        "status",
        observatory.get("status"),
        "two_api_host_results_published_baselines_failed_post_intervention_passed",
    )
    add_if_different(
        errors,
        "frozen_track.case_count",
        observatory.get("frozen_track", {}).get("case_count"),
        case_count,
    )

    hosts = observatory.get("hosts", {})
    for host_name in ("chatgpt", "claude", "microsoft_copilot", "google_adk_or_gemini"):
        host = hosts.get(host_name, {})
        add_if_different(errors, f"hosts.{host_name}.status", host.get("status"), "not_run")
        add_if_different(
            errors,
            f"hosts.{host_name}.selection_rate",
            host.get("selection_rate"),
            None,
        )

    mappings = {
        "openai_responses_api": ("complete_baseline", "complete_baseline"),
        "grok": ("baseline", "baseline"),
    }
    for host_name, (published_baseline, result_baseline) in mappings.items():
        host = hosts.get(host_name, {})
        result = results[host_name]
        add_if_different(
            errors,
            f"hosts.{host_name}.case_set_sha256",
            host.get("case_set_sha256"),
            case_hash,
        )
        add_if_different(
            errors,
            f"results.{host_name}.case_set_sha256",
            result.get("case_set_sha256"),
            case_hash,
        )
        result_url = str(host.get("result", ""))
        if not result_url.endswith(RESULTS[host_name].name):
            errors.append(
                f"hosts.{host_name}.result: must end with {RESULTS[host_name].name}"
            )
        validate_run(
            errors,
            f"hosts.{host_name}.{published_baseline}",
            host.get(published_baseline, {}),
            result.get(result_baseline, {}),
        )
        validate_run(
            errors,
            f"hosts.{host_name}.post_intervention",
            host.get("post_intervention", {}),
            result.get("post_intervention", {}),
        )

    version_contract = observatory.get("version_contract", {})
    for field in VERSION_FIELDS:
        add_if_different(
            errors,
            f"version_contract.{field}",
            version_contract.get(field),
            version.get(field),
        )
    return errors


def run_negative_self_test(
    observatory: dict[str, Any],
    version: dict[str, Any],
    results: dict[str, dict[str, Any]],
    case_hash: str,
    case_count: int,
) -> None:
    broken = copy.deepcopy(observatory)
    broken["hosts"]["grok"]["baseline"]["selection_rate"] = 0.91
    broken["hosts"]["grok"]["baseline"]["all_eligible_trigger_recall"] = 1
    failures = validate_contract(broken, version, results, case_hash, case_count)
    if not any("ambiguous metric alias" in failure for failure in failures):
        raise AssertionError("negative self-test did not reject an ambiguous metric alias")
    if not any("all_eligible_trigger_recall" in failure for failure in failures):
        raise AssertionError("negative self-test did not reject a result mismatch")


def fetch_live(url: str) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "mvr-selection-observatory-validator/1.0"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--live-url")
    args = parser.parse_args()

    observatory = load_json(OBSERVATORY)
    version = load_json(VERSION)
    results = {name: load_json(path) for name, path in RESULTS.items()}
    cases = load_json(CASES)
    case_hash = sha256(CASES)
    case_count = len(cases.get("cases", []))

    if args.self_test:
        run_negative_self_test(
            observatory,
            version,
            results,
            case_hash,
            case_count,
        )

    errors = validate_contract(
        observatory,
        version,
        results,
        case_hash,
        case_count,
    )
    if args.live_url:
        live = fetch_live(args.live_url)
        if live != observatory:
            errors.append(
                "live observatory differs from the repository contract at "
                f"{args.live_url}"
            )

    if errors:
        print("MVR selection observatory contract: FAIL", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    suffix = " + negative self-test" if args.self_test else ""
    if args.live_url:
        suffix += " + live mirror"
    print(
        "MVR selection observatory contract: PASS "
        f"({case_count} cases, {case_hash}{suffix})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
