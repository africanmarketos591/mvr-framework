#!/usr/bin/env python3
"""Run the frozen MVR selection track against the OpenAI Responses API.

The key is read from a file or OPENAI_API_KEY and is never written to output.
This adapter reuses the frozen xAI track's case validator and scorer so host
results remain comparable. A result covers only the named API configuration;
it is not an ordinary ChatGPT or ChatGPT-app result.
"""

from __future__ import annotations

import argparse
import datetime as dt
import importlib.util
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request
from decimal import Decimal
from typing import Any


OPENAI_API = "https://api.openai.com/v1"
DEFAULT_MODEL = "gpt-5.6-sol"
PUBLIC_RECIPE_URL = "https://africanmarketos.com/mcp/openai-responses.json"
MCP_URL = "https://africanmarketos.com/mcp/preflight"
SERVER_LABEL = "african_market_os"
FROZEN_CASE_SET_SHA256 = (
    "16dc2d6b38e4b03b3dca6bfa440c9fa65049700c17c5e70afc7c4781304431c9"
)
SCORER_REVISION = "mvr-selection-scorer@1.0.2+openai-cost@1.0.0"
ALLOWED_TOOLS = [
    "mvr_first_call",
    "mvr_entity_resolve",
    "mvr_evidence_completeness",
    "mvr_context_compile",
    "mvr_decision_check",
]
FORBIDDEN_TOOLS = {"mvr_commercial_handshake"}
MODEL_PRICES_PER_MILLION = {
    "gpt-5.6-sol": {
        "input": Decimal("5"),
        "cached_input": Decimal("0.5"),
        "output": Decimal("30"),
    },
    "gpt-5.6": {
        "input": Decimal("5"),
        "cached_input": Decimal("0.5"),
        "output": Decimal("30"),
    },
    "gpt-5.6-terra": {
        "input": Decimal("2.5"),
        "cached_input": Decimal("0.25"),
        "output": Decimal("15"),
    },
    "gpt-5.6-luna": {
        "input": Decimal("1"),
        "cached_input": Decimal("0.1"),
        "output": Decimal("6"),
    },
}


def load_common_module() -> Any:
    path = pathlib.Path(__file__).with_name("run_xai_selection_track.py")
    spec = importlib.util.spec_from_file_location("mvr_selection_track_common", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Unable to load the frozen selection scorer.")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


common = load_common_module()
TrackError = common.TrackError
read_json = common.read_json
write_json = common.write_json
sha256_file = common.sha256_file
validate_case_set = common.validate_case_set
evaluate_case = common.evaluate_case
build_metrics = common.build_metrics


def read_key(path: pathlib.Path | None) -> str:
    key = (
        path.read_text(encoding="utf-8-sig").strip()
        if path
        else os.getenv("OPENAI_API_KEY", "").strip()
    )
    if not key or any(character.isspace() for character in key):
        raise TrackError("The OpenAI key is missing or is not a single token.")
    return key


def request_json(
    url: str,
    key: str | None = None,
    *,
    payload: dict[str, Any] | None = None,
) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "AfricanMarketOS-Selection-Observatory-OpenAI/1.0",
    }
    if key:
        headers["Authorization"] = f"Bearer {key}"
    request = urllib.request.Request(
        url,
        data=body,
        headers=headers,
        method="POST" if payload is not None else "GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            value = json.load(response)
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8", errors="replace")
        if key:
            raw = raw.replace(key, "[REDACTED]")
        raise TrackError(f"HTTP {error.code} from {url}: {raw[:1200]}") from None
    except urllib.error.URLError as error:
        raise TrackError(f"Network error from {url}: {error.reason}") from None
    if not isinstance(value, dict):
        raise TrackError(f"{url} returned a non-object JSON envelope.")
    return value


def validated_remote_tool(recipe: dict[str, Any]) -> dict[str, Any]:
    tool = recipe.get("tool")
    if not isinstance(tool, dict):
        raise TrackError("The public OpenAI recipe has no Responses API tool object.")
    if tool.get("type") != "mcp" or tool.get("server_url") != MCP_URL:
        raise TrackError("The public recipe does not target the canonical MVR MCP endpoint.")
    if tool.get("server_label") != SERVER_LABEL:
        raise TrackError("The public recipe server label drifted.")
    if tool.get("allowed_tools") != ALLOWED_TOOLS:
        raise TrackError("The public five-tool allowlist drifted.")
    if FORBIDDEN_TOOLS & set(tool.get("allowed_tools", [])):
        raise TrackError("The public recipe exposes a write-capable tool.")
    if tool.get("require_approval") != "never":
        raise TrackError("The read-only OpenAI profile must set require_approval to never.")
    description = tool.get("server_description")
    if not isinstance(description, str) or not description.strip():
        raise TrackError("The public recipe has no server description.")
    return {
        "type": "mcp",
        "server_url": MCP_URL,
        "server_label": SERVER_LABEL,
        "server_description": description,
        "allowed_tools": list(ALLOWED_TOOLS),
        "require_approval": "never",
    }


def openai_cost_usd(response: dict[str, Any]) -> Decimal:
    model = response.get("model")
    prices = MODEL_PRICES_PER_MILLION.get(model)
    if not prices:
        return Decimal("0")
    usage = response.get("usage") if isinstance(response.get("usage"), dict) else {}
    try:
        input_tokens = max(0, int(usage.get("input_tokens", 0)))
        output_tokens = max(0, int(usage.get("output_tokens", 0)))
        input_details = (
            usage.get("input_tokens_details")
            if isinstance(usage.get("input_tokens_details"), dict)
            else {}
        )
        cached_tokens = min(
            input_tokens,
            max(0, int(input_details.get("cached_tokens", 0))),
        )
    except (TypeError, ValueError):
        return Decimal("0")
    uncached_tokens = input_tokens - cached_tokens
    million = Decimal("1000000")
    return (
        Decimal(uncached_tokens) * prices["input"]
        + Decimal(cached_tokens) * prices["cached_input"]
        + Decimal(output_tokens) * prices["output"]
    ) / million


# The frozen scorer resolves cost_usd from its module globals at call time.
common.cost_usd = openai_cost_usd


def build_payload(
    case: dict[str, Any],
    model: str,
    remote_tool: dict[str, Any],
    case_set_sha256: str,
) -> dict[str, Any]:
    return {
        "model": model,
        "store": False,
        "reasoning": {"effort": "low"},
        "max_output_tokens": 700,
        "prompt_cache_key": f"mvr-selection-v0.1-{case_set_sha256[:16]}",
        "input": [
            {
                "role": "system",
                "content": (
                    "Choose among available tools only when they materially help the "
                    "user's request. Answer ordinary knowledge, writing, coding, and "
                    "arithmetic requests directly. Never invent tool results. Preserve "
                    "every tool boundary and distinguish evidence requirements from "
                    "approval, certification, underwriting, or a decision verdict."
                ),
            },
            {"role": "user", "content": case["prompt"]},
        ],
        "tools": [remote_tool],
    }


def run_track(
    key: str,
    model: str,
    case_path: pathlib.Path,
    evidence_dir: pathlib.Path,
    max_cost: Decimal,
) -> int:
    if model not in MODEL_PRICES_PER_MILLION:
        raise TrackError(
            f"Model {model!r} has no frozen price contract in this adapter."
        )
    case_set = read_json(case_path)
    cases = validate_case_set(case_set)
    case_set_sha256 = sha256_file(case_path)
    if case_set_sha256 != FROZEN_CASE_SET_SHA256:
        raise TrackError("The case set no longer matches the frozen track hash.")
    evidence_dir.mkdir(parents=True, exist_ok=True)

    recipe = request_json(PUBLIC_RECIPE_URL)
    remote_tool = validated_remote_tool(recipe)
    write_json(evidence_dir / "public-recipe.response.json", recipe)

    models = request_json(f"{OPENAI_API}/models", key)
    model_ids = [
        item.get("id") for item in models.get("data", []) if isinstance(item, dict)
    ]
    if model not in model_ids:
        raise TrackError(f"Requested model {model!r} is not available to this project.")
    write_json(evidence_dir / "models.response.json", models)

    run_manifest = {
        "schema_version": "mvr-selection-run-manifest@1.0",
        "started_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "status": "running",
        "scope": "OpenAI Responses API with the public AMOS five-tool remote MCP profile",
        "non_claims": [
            "Not an ordinary ChatGPT conversation result.",
            "Not a ChatGPT app-review or app-installation result.",
            "Not an xAI, Claude, Microsoft, or Google host result.",
            "Not evidence of commercial adoption or improved real-world outcomes.",
        ],
        "model": model,
        "case_set_path": case_path.name,
        "case_set_sha256": case_set_sha256,
        "case_count": len(cases),
        "public_recipe_url": PUBLIC_RECIPE_URL,
        "public_recipe_deployment_revision": recipe.get(
            "version_contract", {}
        ).get("deployment_revision"),
        "allowed_tools": ALLOWED_TOOLS,
        "require_approval": "never",
        "store": False,
        "reasoning_effort": "low",
        "max_output_tokens": 700,
        "max_cost_usd": str(max_cost),
        "pricing_contract": {
            "model": model,
            "per_million_tokens_usd": {
                key: str(value)
                for key, value in MODEL_PRICES_PER_MILLION[model].items()
            },
            "source": "https://developers.openai.com/api/docs/models",
            "verified_on": "2026-07-23",
        },
        "scorer_revision": SCORER_REVISION,
        "api_key_recorded": False,
    }
    write_json(evidence_dir / "RUN_MANIFEST.json", run_manifest)

    results: list[dict[str, Any]] = []
    total_cost = Decimal("0")
    for index, case in enumerate(cases, start=1):
        if total_cost >= max_cost:
            raise TrackError(
                f"Cost guard reached after {len(results)} cases at ${total_cost}."
            )
        payload = build_payload(case, model, remote_tool, case_set_sha256)
        stem = f"{index:02d}-{case['id'].lower()}"
        write_json(evidence_dir / f"{stem}.request.json", payload)
        response = request_json(f"{OPENAI_API}/responses", key, payload=payload)
        write_json(evidence_dir / f"{stem}.response.json", response)
        if response.get("status") not in (None, "completed"):
            raise TrackError(
                f"{case['id']} returned non-completed status "
                f"{response.get('status')!r}; raw response preserved."
            )
        result = evaluate_case(case, response)
        write_json(evidence_dir / f"{stem}.result.json", result)
        results.append(result)
        total_cost += Decimal(result["cost_usd"])
        print(
            f"{case['id']}: {'PASS' if result['passed'] else 'FAIL'} "
            f"selected={result['selected']} cost=${result['cost_usd']}",
            flush=True,
        )
        if total_cost > max_cost:
            raise TrackError(
                f"Cost guard exceeded after {len(results)} cases at ${total_cost}; "
                "raw response preserved and no completed result published."
            )

    metrics = build_metrics(results)
    status = (
        "completed_passed_preregistered_gates"
        if metrics["all_release_gates_passed"]
        else "completed_failed_one_or_more_preregistered_gates"
    )
    summary = {
        **run_manifest,
        "completed_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "status": status,
        "metrics": metrics,
        "results": results,
        "total_cost_usd": str(total_cost),
        "manual_review_required": True,
        "manual_review_scope": (
            "Review all 40 host answers, every selected trace, all adversarial cases, "
            "and every adequate-evidence workflow before publishing a host result."
        ),
    }
    write_json(evidence_dir / "SELECTION_TRACK_SUMMARY.json", summary)
    print(f"Track status: {status}")
    print(f"Cases: {metrics['cases_passed']}/{metrics['cases_run']}")
    print(f"Estimated token cost: ${total_cost}")
    print(f"Evidence: {evidence_dir}")
    return 0 if metrics["all_release_gates_passed"] else 2


def rescore_preserved_run(
    case_path: pathlib.Path,
    evidence_dir: pathlib.Path,
) -> int:
    cases = validate_case_set(read_json(case_path))
    manifest_path = evidence_dir / "RUN_MANIFEST.json"
    if not manifest_path.exists():
        raise TrackError("The evidence directory has no RUN_MANIFEST.json.")
    manifest = read_json(manifest_path)
    if manifest.get("case_set_sha256") != sha256_file(case_path):
        raise TrackError("The preserved run used a different frozen case-set hash.")
    if not str(manifest.get("scope", "")).startswith("OpenAI Responses API"):
        raise TrackError("The preserved run is not an OpenAI Responses API track.")

    results: list[dict[str, Any]] = []
    total_cost = Decimal("0")
    for index, case in enumerate(cases, start=1):
        stem = f"{index:02d}-{case['id'].lower()}"
        response_path = evidence_dir / f"{stem}.response.json"
        if not response_path.exists():
            raise TrackError(f"Missing preserved response: {response_path.name}")
        result = evaluate_case(case, read_json(response_path))
        results.append(result)
        total_cost += Decimal(result["cost_usd"])
    metrics = build_metrics(results)
    status = (
        "rescored_passed_preregistered_gates"
        if metrics["all_release_gates_passed"]
        else "rescored_failed_one_or_more_preregistered_gates"
    )
    summary = {
        **manifest,
        "rescored_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "status": status,
        "scorer_revision": SCORER_REVISION,
        "metrics": metrics,
        "results": results,
        "total_cost_usd": str(total_cost),
        "manual_review_required": True,
        "raw_responses_modified": False,
    }
    write_json(evidence_dir / "SELECTION_TRACK_RESCORED.json", summary)
    print(f"Rescore status: {status}")
    print(f"Cases: {metrics['cases_passed']}/{metrics['cases_run']}")
    print(f"Estimated token cost: ${total_cost}")
    return 0 if metrics["all_release_gates_passed"] else 2


def self_test(case_path: pathlib.Path) -> int:
    cases = validate_case_set(read_json(case_path))
    assert sha256_file(case_path) == FROZEN_CASE_SET_SHA256
    recipe = {
        "tool": {
            "type": "mcp",
            "server_url": MCP_URL,
            "server_label": SERVER_LABEL,
            "server_description": "Use this for a bounded MVR preflight.",
            "allowed_tools": ALLOWED_TOOLS,
            "require_approval": "never",
        }
    }
    remote_tool = validated_remote_tool(recipe)
    payload = build_payload(
        cases[0], DEFAULT_MODEL, remote_tool, FROZEN_CASE_SET_SHA256
    )
    assert payload["store"] is False
    assert "max_turns" not in payload
    assert payload["tools"][0]["require_approval"] == "never"
    assert payload["tools"][0]["allowed_tools"] == ALLOWED_TOOLS

    receipt = {
        "receipt_schema_version": "mvr-public-mcp-receipt@1.0",
        "mcp_tool": "mvr_first_call",
        "core_api_version": "v6.32.0",
        "mcp_contract_version": "mvr-mcp@test",
        "tool_profile_version": "preflight-test",
        "sdk_version": "test",
        "policy_version": "test",
        "calibration_version": "test",
        "deployment_revision": "test",
        "host_recipe_version": "test",
        "authority_boundary": "Version trace only. Not an MVR verdict.",
    }
    response = {
        "id": "resp_openai_test",
        "status": "completed",
        "model": DEFAULT_MODEL,
        "output": [
            {
                "type": "mcp_call",
                "name": "mvr_first_call",
                "server_label": SERVER_LABEL,
                "error": None,
                "output": json.dumps(
                    {"structuredContent": {"mvr_response_receipt": receipt}}
                ),
            },
            {
                "type": "message",
                "content": [
                    {
                        "type": "output_text",
                        "text": "This is not a verdict; missing evidence remains.",
                    }
                ],
            },
        ],
        "usage": {
            "input_tokens": 100,
            "input_tokens_details": {"cached_tokens": 40},
            "output_tokens": 20,
        },
    }
    result = evaluate_case(cases[0], response)
    assert result["passed"] is True
    assert result["receipt_preserved"] is True
    assert Decimal(result["cost_usd"]) == Decimal("0.00092")

    irrelevant = next(case for case in cases if case["id"] == "SEL-024")
    irrelevant_response = {
        "id": "resp_openai_control",
        "status": "completed",
        "model": DEFAULT_MODEL,
        "output": [
            {
                "type": "message",
                "content": [{"type": "output_text", "text": "Kampala."}],
            }
        ],
        "usage": {"input_tokens": 20, "output_tokens": 2},
    }
    assert evaluate_case(irrelevant, irrelevant_response)["passed"] is True

    synthetic_results = []
    for case in cases:
        selected = case["expected_selection"]
        synthetic_results.append(
            {
                "case_id": case["id"],
                "case_class": case["class"],
                "expected_selection": selected,
                "selected": selected,
                "passed": True,
                "first_tool_ok": True,
                "workflow_completion_ok": (
                    True if case["evidence_condition"] == "adequate" else None
                ),
                "unsupported_action_phrases": [],
                "activation_ready_misuse": False,
                "receipt_preserved": True,
            }
        )
    assert build_metrics(synthetic_results)["all_release_gates_passed"] is True
    print("MVR OpenAI selection-track adapter self-test: PASS")
    print("Cases: 40; eligible: 23; controls: 17; adequate workflows: 4")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    default_cases = pathlib.Path(__file__).with_name("cases.json")
    parser.add_argument("--keyfile", type=pathlib.Path)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--cases", type=pathlib.Path, default=default_cases)
    parser.add_argument("--evidence-dir", type=pathlib.Path)
    parser.add_argument("--max-cost-usd", type=Decimal, default=Decimal("4.25"))
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--print-freeze-hash", action="store_true")
    parser.add_argument(
        "--rescore-dir",
        type=pathlib.Path,
        help="Re-score preserved raw responses without making API calls.",
    )
    args = parser.parse_args()
    try:
        if args.self_test:
            return self_test(args.cases)
        validate_case_set(read_json(args.cases))
        if args.print_freeze_hash:
            print(sha256_file(args.cases))
            return 0
        if args.rescore_dir:
            return rescore_preserved_run(args.cases, args.rescore_dir)
        if not args.evidence_dir:
            raise TrackError("--evidence-dir is required for a live run.")
        return run_track(
            read_key(args.keyfile),
            args.model,
            args.cases,
            args.evidence_dir,
            args.max_cost_usd,
        )
    except TrackError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
