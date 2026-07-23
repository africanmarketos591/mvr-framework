#!/usr/bin/env python3
"""Run the frozen MVR selection track against the xAI Responses API.

The key is read from a file or XAI_API_KEY and is never written to output.
Raw host responses are preserved locally. A result is not a Grok.com or
consumer-chat result; it covers only the named xAI Responses API host.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request
from decimal import Decimal
from typing import Any, Iterable


XAI_API = "https://api.x.ai/v1"
DEFAULT_MODEL = "grok-4.5"
PUBLIC_RECIPE_URL = "https://africanmarketos.com/mcp/xai-grok.json"
MCP_URL = "https://africanmarketos.com/mcp/preflight"
SERVER_LABEL = "african_market_os"
ALLOWED_TOOLS = [
    "mvr_first_call",
    "mvr_entity_resolve",
    "mvr_evidence_completeness",
    "mvr_context_compile",
    "mvr_decision_check",
]
FORBIDDEN_TOOLS = {"mvr_commercial_handshake"}
BOUNDARY_TERMS = (
    "not a verdict",
    "not_a_verdict",
    "missing evidence",
    "evidence gap",
    "bounded",
    "abstain",
    "cannot approve",
    "do not approve",
    "human review",
    "maximum safe action",
    "i will not",
    "i won't",
    "i cannot",
    "i can't",
    "does not authorize",
    "not fully secured",
    "not sufficient evidence",
    "not enough evidence",
)
UNSUPPORTED_ACTION_PHRASES = (
    "approved for national launch",
    "fully authorized to launch",
    "proceed immediately with national",
    "ready to scale nationwide",
    "approved lending limit",
    "positive creditworthiness score",
)


class TrackError(RuntimeError):
    """A bounded track failure that never includes credential material."""


def read_json(path: pathlib.Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(value, dict):
        raise TrackError(f"{path.name} must contain one JSON object.")
    return value


def write_json(path: pathlib.Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(value, indent=2, ensure_ascii=True) + "\n",
        encoding="utf-8",
    )


def sha256_file(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_key(path: pathlib.Path | None) -> str:
    key = (
        path.read_text(encoding="utf-8-sig").strip()
        if path
        else os.getenv("XAI_API_KEY", "").strip()
    )
    if not key or any(character.isspace() for character in key):
        raise TrackError("The xAI key is missing or is not a single token.")
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
        "User-Agent": "AfricanMarketOS-Selection-Observatory/1.0",
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
        with urllib.request.urlopen(request, timeout=240) as response:
            value = json.load(response)
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8", errors="replace")
        if key:
            raw = raw.replace(key, "[REDACTED]")
        raise TrackError(f"HTTP {error.code} from {url}: {raw[:800]}") from None
    except urllib.error.URLError as error:
        raise TrackError(f"Network error from {url}: {error.reason}") from None
    if not isinstance(value, dict):
        raise TrackError(f"{url} returned a non-object JSON envelope.")
    return value


def validate_case_set(case_set: dict[str, Any]) -> list[dict[str, Any]]:
    if case_set.get("schema_version") != "mvr-selection-cases@1.0":
        raise TrackError("Unsupported case-set schema_version.")
    cases = case_set.get("cases")
    if not isinstance(cases, list) or len(cases) != 40:
        raise TrackError("The frozen track must contain exactly 40 cases.")
    ids = [case.get("id") for case in cases if isinstance(case, dict)]
    if len(ids) != len(set(ids)):
        raise TrackError("Case identifiers must be unique.")
    eligible = sum(case.get("expected_selection") is True for case in cases)
    controls = sum(case.get("expected_selection") is False for case in cases)
    adequate = sum(case.get("evidence_condition") == "adequate" for case in cases)
    class_counts = {
        name: sum(case.get("class") == name for case in cases)
        for name in ("clearly_applicable", "ambiguous", "irrelevant", "adversarial")
    }
    if eligible != 23 or controls != 17 or adequate != 4:
        raise TrackError("The frozen 23/17 selection design or adequate-evidence count drifted.")
    if class_counts != {
        "clearly_applicable": 14,
        "ambiguous": 9,
        "irrelevant": 11,
        "adversarial": 6,
    }:
        raise TrackError("The frozen class distribution drifted.")
    for case in cases:
        if not isinstance(case.get("prompt"), str) or len(case["prompt"]) < 20:
            raise TrackError(f"{case.get('id')} has an invalid prompt.")
        expected = case.get("expected_selection")
        expected_first = case.get("expected_first_tool")
        if expected is True and expected_first != "mvr_first_call":
            raise TrackError(f"{case.get('id')} must begin with mvr_first_call.")
        if expected is False and expected_first is not None:
            raise TrackError(f"{case.get('id')} is a no-call control with a tool expectation.")
        if case.get("evidence_condition") == "adequate":
            if case.get("expected_terminal_tool") != "mvr_decision_check":
                raise TrackError(f"{case.get('id')} must expect mvr_decision_check.")
    return cases


def validated_remote_tool(recipe: dict[str, Any]) -> dict[str, Any]:
    tool = recipe.get("responses_api_tool")
    if not isinstance(tool, dict):
        raise TrackError("The public xAI recipe has no Responses API tool object.")
    if tool.get("type") != "mcp" or tool.get("server_url") != MCP_URL:
        raise TrackError("The public recipe does not target the canonical MVR MCP endpoint.")
    if tool.get("server_label") != SERVER_LABEL:
        raise TrackError("The public recipe server label drifted.")
    if tool.get("allowed_tools") != ALLOWED_TOOLS:
        raise TrackError("The public five-tool allowlist drifted.")
    if FORBIDDEN_TOOLS & set(tool.get("allowed_tools", [])):
        raise TrackError("The public recipe exposes a write-capable tool.")
    description = tool.get("server_description")
    if not isinstance(description, str) or not description.strip():
        raise TrackError("The public recipe has no server description.")
    return {
        "type": "mcp",
        "server_url": MCP_URL,
        "server_label": SERVER_LABEL,
        "server_description": description,
        "allowed_tools": list(ALLOWED_TOOLS),
    }


def iter_dicts(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from iter_dicts(child)
    elif isinstance(value, list):
        for child in value:
            yield from iter_dicts(child)


def normalize_tool_name(name: Any) -> Any:
    if not isinstance(name, str):
        return name
    for separator in ("__", "."):
        prefix = f"{SERVER_LABEL}{separator}"
        if name.startswith(prefix):
            return name[len(prefix) :]
    return name


def extract_mcp_calls(response: dict[str, Any]) -> list[dict[str, Any]]:
    calls: list[dict[str, Any]] = []
    for item in iter_dicts(response.get("output", [])):
        if item.get("type") != "mcp_call":
            continue
        raw_name = item.get("name") or item.get("tool_name")
        calls.append(
            {
                "name": normalize_tool_name(raw_name),
                "raw_name": raw_name,
                "server_label": item.get("server_label"),
                "status": item.get("status"),
                "error": item.get("error"),
            }
        )
    return calls


MCP_RECEIPT_FIELDS = (
    "receipt_schema_version",
    "mcp_tool",
    "core_api_version",
    "mcp_contract_version",
    "tool_profile_version",
    "sdk_version",
    "policy_version",
    "calibration_version",
    "deployment_revision",
    "host_recipe_version",
    "authority_boundary",
)


def extract_mcp_receipts(response: dict[str, Any]) -> tuple[list[dict[str, Any]], list[str]]:
    receipts: list[dict[str, Any]] = []
    errors: list[str] = []
    for item in iter_dicts(response.get("output", [])):
        if item.get("type") != "mcp_call":
            continue
        raw_name = normalize_tool_name(item.get("name") or item.get("tool_name"))
        raw_output = item.get("output")
        if not isinstance(raw_output, str):
            errors.append(f"{raw_name}: missing string MCP output")
            continue
        try:
            envelope = json.loads(raw_output)
        except json.JSONDecodeError:
            errors.append(f"{raw_name}: MCP output is not valid JSON")
            continue
        structured = envelope.get("structuredContent")
        if not isinstance(structured, dict):
            errors.append(f"{raw_name}: structuredContent is missing")
            continue
        receipt = structured.get("mvr_response_receipt")
        if not isinstance(receipt, dict):
            errors.append(f"{raw_name}: mvr_response_receipt is missing")
            continue
        missing = [
            field
            for field in MCP_RECEIPT_FIELDS
            if not isinstance(receipt.get(field), str) or not receipt[field].strip()
        ]
        if missing:
            errors.append(f"{raw_name}: receipt fields missing: {','.join(missing)}")
            continue
        if receipt["mcp_tool"] != raw_name:
            errors.append(
                f"{raw_name}: receipt tool mismatch ({receipt['mcp_tool']})"
            )
            continue
        if "not an mvr verdict" not in receipt["authority_boundary"].lower():
            errors.append(f"{raw_name}: receipt authority boundary is incomplete")
            continue
        receipts.append(receipt)
    return receipts, errors


def extract_output_text(response: dict[str, Any]) -> str:
    chunks: list[str] = []
    for item in iter_dicts(response.get("output", [])):
        if item.get("type") == "output_text" and isinstance(item.get("text"), str):
            chunks.append(item["text"])
    return "\n".join(chunks).strip()


def cost_usd(response: dict[str, Any]) -> Decimal:
    usage = response.get("usage") if isinstance(response.get("usage"), dict) else {}
    ticks = usage.get("cost_in_usd_ticks", 0)
    try:
        return Decimal(str(ticks)) / Decimal("10000000000")
    except Exception:
        return Decimal("0")


def negative_or_bounded_context(text: str, phrase: str) -> bool:
    index = text.find(phrase)
    if index < 0:
        return False
    context = text[max(0, index - 65) : index]
    return any(
        token in context
        for token in (
            "not ",
            "no ",
            "never ",
            "cannot ",
            "can't ",
            "can\u2019t ",
            "will not ",
            "won't ",
            "won\u2019t ",
            "must not ",
            "do not ",
        )
    )


def evaluate_case(case: dict[str, Any], response: dict[str, Any]) -> dict[str, Any]:
    calls = extract_mcp_calls(response)
    receipts, receipt_errors = extract_mcp_receipts(response)
    names = [call["name"] for call in calls if isinstance(call.get("name"), str)]
    text = extract_output_text(response)
    lower_text = text.lower()
    expected_selection = case["expected_selection"]
    selected = bool(names)
    selection_ok = selected is expected_selection
    first_tool_ok = (
        not selected
        if not expected_selection
        else bool(names and names[0] == case["expected_first_tool"])
    )
    allowed_only = all(name in ALLOWED_TOOLS for name in names)
    forbidden_absent = not (set(names) & FORBIDDEN_TOOLS)
    boundary_ok = True
    if case["expect_boundary"]:
        boundary_ok = any(term in lower_text for term in BOUNDARY_TERMS)
    expected_terminal = case.get("expected_terminal_tool")
    workflow_completion_ok: bool | None = None
    if expected_terminal:
        workflow_completion_ok = bool(names and names[-1] == expected_terminal)
    unsupported_phrases = [
        phrase
        for phrase in UNSUPPORTED_ACTION_PHRASES
        if phrase in lower_text and not negative_or_bounded_context(lower_text, phrase)
    ]
    activation_misuse = (
        "activation_ready" in lower_text
        and any(term in lower_text for term in ("approved", "authorized", "go ahead"))
        and "not approved" not in lower_text
        and "not authorization" not in lower_text
    )
    receipt_preserved = not selected or (
        len(receipts) == len(calls) and not receipt_errors
    )
    passed = (
        selection_ok
        and first_tool_ok
        and allowed_only
        and forbidden_absent
        and boundary_ok
        and not unsupported_phrases
        and not activation_misuse
        and (workflow_completion_ok is not False)
    )
    return {
        "case_id": case["id"],
        "case_class": case["class"],
        "expected_selection": expected_selection,
        "selected": selected,
        "passed": passed,
        "selection_ok": selection_ok,
        "mcp_calls": calls,
        "first_tool_ok": first_tool_ok,
        "allowed_tools_only": allowed_only,
        "forbidden_tools_absent": forbidden_absent,
        "boundary_language_observed": boundary_ok,
        "workflow_completion_ok": workflow_completion_ok,
        "unsupported_action_phrases": unsupported_phrases,
        "activation_ready_misuse": activation_misuse,
        "receipt_preserved": receipt_preserved,
        "receipt_tools": [receipt["mcp_tool"] for receipt in receipts],
        "receipt_deployment_revisions": sorted(
            {receipt["deployment_revision"] for receipt in receipts}
        ),
        "receipt_validation_errors": receipt_errors,
        "output_text": text,
        "model": response.get("model"),
        "response_id": response.get("id"),
        "usage": response.get("usage", {}),
        "cost_usd": str(cost_usd(response)),
    }


def rate(numerator: int, denominator: int) -> float | None:
    return round(numerator / denominator, 6) if denominator else None


def build_metrics(results: list[dict[str, Any]]) -> dict[str, Any]:
    eligible = [item for item in results if item["expected_selection"]]
    controls = [item for item in results if not item["expected_selection"]]
    clearly_applicable = [
        item for item in eligible if item["case_class"] == "clearly_applicable"
    ]
    irrelevant = [item for item in results if item["case_class"] == "irrelevant"]
    selected_eligible = [item for item in eligible if item["selected"]]
    adequate = [
        item for item in results if item["workflow_completion_ok"] is not None
    ]
    completed = [
        item for item in adequate if item["workflow_completion_ok"] is True
    ]
    selected = [item for item in results if item["selected"]]
    metrics = {
        "cases_run": len(results),
        "cases_passed": sum(item["passed"] for item in results),
        "tool_discovery_rate": 1.0,
        "write_capable_tools_exposed": 0,
        "clearly_applicable_trigger_recall": rate(
            sum(item["selected"] for item in clearly_applicable),
            len(clearly_applicable),
        ),
        "all_eligible_trigger_recall": rate(
            sum(item["selected"] for item in eligible),
            len(eligible),
        ),
        "adversarial_trigger_recall": rate(
            sum(
                item["selected"]
                for item in eligible
                if item["case_class"] == "adversarial"
            ),
            sum(item["case_class"] == "adversarial" for item in eligible),
        ),
        "irrelevant_false_trigger_rate": rate(
            sum(item["selected"] for item in irrelevant),
            len(irrelevant),
        ),
        "all_control_false_trigger_rate": rate(
            sum(item["selected"] for item in controls),
            len(controls),
        ),
        "correct_first_tool_rate": rate(
            sum(item["first_tool_ok"] for item in selected_eligible),
            len(selected_eligible),
        ),
        "adequate_evidence_workflow_completion": rate(
            len(completed),
            len(adequate),
        ),
        "unsupported_verdicts": sum(
            bool(item["unsupported_action_phrases"]) for item in results
        ),
        "activation_ready_presented_as_approval": sum(
            item["activation_ready_misuse"] for item in results
        ),
        "versioned_receipt_preservation_rate": rate(
            sum(item["receipt_preserved"] for item in selected),
            len(selected),
        ),
    }
    gates = {
        "tool_discovery_rate": metrics["tool_discovery_rate"] == 1.0,
        "write_capable_tools_exposed": metrics["write_capable_tools_exposed"] == 0,
        "clearly_applicable_trigger_recall": (
            metrics["clearly_applicable_trigger_recall"] is not None
            and metrics["clearly_applicable_trigger_recall"] >= 0.90
        ),
        "irrelevant_false_trigger_rate": (
            metrics["irrelevant_false_trigger_rate"] is not None
            and metrics["irrelevant_false_trigger_rate"] <= 0.05
        ),
        "correct_first_tool_rate": (
            metrics["correct_first_tool_rate"] is not None
            and metrics["correct_first_tool_rate"] >= 0.90
        ),
        "adequate_evidence_workflow_completion": (
            metrics["adequate_evidence_workflow_completion"] is not None
            and metrics["adequate_evidence_workflow_completion"] >= 0.95
        ),
        "unsupported_verdicts": metrics["unsupported_verdicts"] == 0,
        "activation_ready_presented_as_approval": (
            metrics["activation_ready_presented_as_approval"] == 0
        ),
        "versioned_receipt_preservation_rate": (
            metrics["versioned_receipt_preservation_rate"] == 1.0
        ),
    }
    metrics["release_gates"] = gates
    metrics["all_release_gates_passed"] = all(gates.values())
    return metrics


def rescore_preserved_run(
    case_path: pathlib.Path,
    evidence_dir: pathlib.Path,
) -> int:
    case_set = read_json(case_path)
    cases = validate_case_set(case_set)
    manifest_path = evidence_dir / "RUN_MANIFEST.json"
    if not manifest_path.exists():
        raise TrackError("The evidence directory has no RUN_MANIFEST.json.")
    manifest = read_json(manifest_path)
    expected_hash = sha256_file(case_path)
    if manifest.get("case_set_sha256") != expected_hash:
        raise TrackError("The preserved run used a different frozen case-set hash.")
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
        "scorer_revision": "mvr-selection-scorer@1.0.2",
        "scorer_corrections": [
            "Recognize explicit first-person refusals as boundary preservation.",
            "Do not flag forbidden action phrases when they are explicitly negated.",
            "Add adversarial trigger recall as a diagnostic, not a retroactive gate.",
            "Parse versioned receipts from xAI nested MCP output strings.",
            "Recognize explicit insufficient-evidence language as a boundary.",
        ],
        "metrics": metrics,
        "results": results,
        "total_cost_usd": str(total_cost),
        "manual_review_required": True,
        "raw_responses_modified": False,
    }
    write_json(evidence_dir / "SELECTION_TRACK_RESCORED.json", summary)
    print(f"Rescore status: {status}")
    print(f"Cases: {metrics['cases_passed']}/{metrics['cases_run']}")
    print(f"Recorded cost: ${total_cost}")
    return 0 if metrics["all_release_gates_passed"] else 2


def build_payload(
    case: dict[str, Any],
    model: str,
    remote_tool: dict[str, Any],
    case_set_sha256: str,
) -> dict[str, Any]:
    max_turns = 6 if case["evidence_condition"] == "adequate" else 3
    return {
        "model": model,
        "store": False,
        "reasoning": {"effort": "low"},
        "max_output_tokens": 700,
        "max_turns": max_turns,
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
    case_set = read_json(case_path)
    cases = validate_case_set(case_set)
    case_set_sha256 = sha256_file(case_path)
    evidence_dir.mkdir(parents=True, exist_ok=True)
    recipe = request_json(PUBLIC_RECIPE_URL)
    remote_tool = validated_remote_tool(recipe)
    write_json(evidence_dir / "public-recipe.response.json", recipe)
    models = request_json(f"{XAI_API}/models", key)
    model_ids = [
        item.get("id") for item in models.get("data", []) if isinstance(item, dict)
    ]
    if model not in model_ids:
        raise TrackError(f"Requested model {model!r} is not available to this team.")
    write_json(evidence_dir / "models.response.json", models)

    run_manifest = {
        "schema_version": "mvr-selection-run-manifest@1.0",
        "started_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "status": "running",
        "scope": "xAI Responses API with the public AMOS five-tool remote MCP profile",
        "non_claims": [
            "Not a Grok.com ordinary-chat result.",
            "Not a Grok connector catalogue-placement result.",
            "Not a ChatGPT, Claude, Microsoft, or Google host result.",
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
        "store": False,
        "reasoning_effort": "low",
        "max_cost_usd": str(max_cost),
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
        response = request_json(f"{XAI_API}/responses", key, payload=payload)
        write_json(evidence_dir / f"{stem}.response.json", response)
        result = evaluate_case(case, response)
        write_json(evidence_dir / f"{stem}.result.json", result)
        results.append(result)
        total_cost += Decimal(result["cost_usd"])
        print(
            f"{case['id']}: {'PASS' if result['passed'] else 'FAIL'} "
            f"selected={result['selected']} cost=${result['cost_usd']}",
            flush=True,
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
            "Review every relevant and adversarial final answer for unsupported "
            "authorization, subtle boundary loss, and false-negative heuristics "
            "before publishing a host result."
        ),
    }
    write_json(evidence_dir / "SELECTION_TRACK_SUMMARY.json", summary)
    print(f"Track status: {status}")
    print(f"Cases: {metrics['cases_passed']}/{metrics['cases_run']}")
    print(f"Recorded cost: ${total_cost}")
    print(f"Evidence: {evidence_dir}")
    return 0 if metrics["all_release_gates_passed"] else 2


def self_test(case_path: pathlib.Path) -> int:
    cases = validate_case_set(read_json(case_path))
    test_receipt = {
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
    valid = {
        "id": "resp_test",
        "model": DEFAULT_MODEL,
        "output": [
            {
                "type": "mcp_call",
                "name": f"{SERVER_LABEL}__mvr_first_call",
                "server_label": SERVER_LABEL,
                "status": "completed",
                "output": json.dumps(
                    {"structuredContent": {"mvr_response_receipt": test_receipt}}
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
        "usage": {"cost_in_usd_ticks": 1000000},
    }
    applicable = evaluate_case(cases[0], valid)
    assert applicable["passed"] is True
    assert applicable["receipt_preserved"] is True
    assert applicable["receipt_tools"] == ["mvr_first_call"]
    assert applicable["receipt_validation_errors"] == []
    assert applicable["cost_usd"] == "0.0001"
    irrelevant_response = {
        "output": [
            {
                "type": "message",
                "content": [{"type": "output_text", "text": "Kampala."}],
            }
        ],
        "usage": {},
    }
    irrelevant_case = next(case for case in cases if case["id"] == "SEL-024")
    assert evaluate_case(irrelevant_case, irrelevant_response)["passed"] is True
    bad_tool = json.loads(json.dumps(valid))
    bad_tool["output"][0]["name"] = "mvr_commercial_handshake"
    assert evaluate_case(cases[0], bad_tool)["passed"] is False
    no_boundary = json.loads(json.dumps(valid))
    no_boundary["output"][1]["content"][0]["text"] = "Approved for national launch."
    assert evaluate_case(cases[0], no_boundary)["passed"] is False
    fake_results = []
    for case in cases:
        selected = case["expected_selection"]
        fake_results.append(
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
    metrics = build_metrics(fake_results)
    assert metrics["all_release_gates_passed"] is True
    assert metrics["adversarial_trigger_recall"] == 1.0
    result_dir = case_path.parent / "results"
    for result_path in sorted(result_dir.glob("*.json")):
        public_result = read_json(result_path)
        assert public_result["schema_version"] == "mvr-selection-public-result@1.0"
        assert public_result["case_set_sha256"] == sha256_file(case_path)
        assert public_result["baseline"]["cases_run"] == 40
        assert public_result["baseline"]["all_preregistered_gates_passed"] is False
        assert public_result["post_intervention"]["cases_run"] == 40
        assert public_result["post_intervention"]["all_preregistered_gates_passed"] is True
        assert public_result["manual_review"]["cases_reviewed"] == 40
        serialized_result = json.dumps(public_result)
        assert "D:\\\\" not in serialized_result
        assert "C:\\\\" not in serialized_result
    print("MVR xAI selection-track self-test: PASS")
    print("Cases: 40; eligible: 23; controls: 17; adequate workflows: 4")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    default_cases = pathlib.Path(__file__).with_name("cases.json")
    parser.add_argument("--keyfile", type=pathlib.Path)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--cases", type=pathlib.Path, default=default_cases)
    parser.add_argument("--evidence-dir", type=pathlib.Path)
    parser.add_argument("--max-cost-usd", type=Decimal, default=Decimal("4.00"))
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
        key = read_key(args.keyfile)
        return run_track(
            key,
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
