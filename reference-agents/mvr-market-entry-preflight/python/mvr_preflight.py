#!/usr/bin/env python3
"""Run the public MVR market-entry preflight sequence over Streamable HTTP MCP."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


DEFAULT_ENDPOINT = "https://africanmarketos.com/mcp/preflight"
CANONICAL_SEQUENCE = [
    "mvr_first_call",
    "mvr_entity_resolve",
    "mvr_evidence_completeness",
    "mvr_context_compile",
    "mvr_decision_check",
]
POLICY_MODES = ("advisory_selection", "required_preflight")
AFRICAN_COUNTRY_CODES = {
    "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM", "CF", "TD", "KM", "CD", "CG", "CI", "DJ",
    "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN", "GW", "KE", "LS", "LR", "LY", "MG",
    "MW", "ML", "MR", "MU", "MA", "MZ", "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO",
    "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "ZM", "ZW",
}
PROTECTED_ACTION_RE = re.compile(
    r"\b(enter|entry|launch|pilot|scale|expand|expansion|invest|fund|partner|partnership|procure|procurement|deploy|rollout|lend|lending|loan|credit|bnpl|underwrite|market[- ]entry)\b",
    re.IGNORECASE,
)
MARKET_CONTEXT_RE = re.compile(r"\b(africa|african|emerging market|high[- ]context market)\b", re.IGNORECASE)
PURE_TASK_RE = re.compile(r"\b(debug|refactor|unit test|css|html|sql query|translate|weather|football|summari[sz]e)\b", re.IGNORECASE)


def validate_mcp_envelope(envelope: Any, request_id: int, method: str) -> dict[str, Any]:
    prefix = f"MCP protocol error for {method}"
    if not isinstance(envelope, dict):
        raise RuntimeError(f"{prefix}: response envelope must be a JSON object")
    if envelope.get("jsonrpc") != "2.0":
        raise RuntimeError(f"{prefix}: jsonrpc must equal 2.0")
    if envelope.get("id") != request_id:
        raise RuntimeError(f"{prefix}: response id does not match request id {request_id}")
    if envelope.get("error") is not None:
        error = envelope["error"]
        detail = json.dumps(error, sort_keys=True) if isinstance(error, dict) else repr(error)
        raise RuntimeError(f"MCP error for {method}: {detail}")
    if "result" not in envelope:
        raise RuntimeError(f"{prefix}: response has neither result nor error")
    result = envelope["result"]
    if not isinstance(result, dict):
        raise RuntimeError(f"{prefix}: result must be a JSON object")
    return result


def classify_policy_intent(request_data: dict[str, Any]) -> str:
    market_scope = request_data.get("market_scope") if isinstance(request_data.get("market_scope"), dict) else {}
    country = str(request_data.get("country") or market_scope.get("country") or "").strip().upper()
    text = " ".join(str(request_data.get(key) or "") for key in ("question", "target_claim", "sector", "use_case", "intent"))
    protected_action = bool(PROTECTED_ACTION_RE.search(text))
    market_context = country in AFRICAN_COUNTRY_CODES or request_data.get("high_context_market") is True or bool(MARKET_CONTEXT_RE.search(text))
    pure_task = bool(PURE_TASK_RE.search(text)) and not protected_action
    if pure_task or (not protected_action and not market_context):
        return "not_protected"
    if protected_action and market_context:
        return "protected"
    return "ambiguous"


def build_initial_call(request_data: dict[str, Any]) -> dict[str, Any]:
    question = str(request_data.get("question") or "").strip()
    country = str(request_data.get("country") or request_data.get("market_scope", {}).get("country") or "").strip()
    sector = str(request_data.get("sector") or request_data.get("subject", {}).get("sector") or "").strip()
    subject = request_data.get("subject") if isinstance(request_data.get("subject"), dict) else {}
    market_scope = request_data.get("market_scope") if isinstance(request_data.get("market_scope"), dict) else {}
    first_call = {
        "question": question,
        "use_case": request_data.get("use_case"),
        "target_claim": request_data.get("target_claim") or question,
        "entity": subject.get("entity_name") or request_data.get("entity"),
        "company_name": request_data.get("company_name"),
        "entity_archetype": subject.get("entity_archetype"),
        "country": market_scope.get("country") or country,
        "sector": subject.get("sector") or sector,
        "stage": request_data.get("stage") or request_data.get("decision_stage"),
        "target_users": request_data.get("target_users"),
        "market_scope": market_scope or ({"country": country} if country else None),
        "evidence_available": request_data.get("evidence_available"),
        "evidence_pack": request_data.get("evidence_pack"),
        "evidence_items": request_data.get("evidence_items"),
        "known_partners": request_data.get("known_partners"),
    }
    return {key: value for key, value in first_call.items() if value not in (None, "", {})}


def extract_tool_payload(result: dict[str, Any]) -> dict[str, Any]:
    structured = result.get("structuredContent")
    if isinstance(structured, dict):
        return structured
    for item in result.get("content") if isinstance(result.get("content"), list) else []:
        if not isinstance(item, dict) or item.get("type") != "text" or not isinstance(item.get("text"), str):
            continue
        try:
            parsed = json.loads(item["text"])
        except json.JSONDecodeError:
            continue
        if isinstance(parsed, dict):
            return parsed
    return result


def normalize_next_call(result: dict[str, Any], completed_sequence: list[str]) -> dict[str, Any] | None:
    canonical = result.get("mcp_next_call")
    legacy_source = result.get("mcp_next_tool") if isinstance(result.get("mcp_next_tool"), dict) else {}
    legacy = None
    if legacy_source.get("tool_name"):
        legacy = {"name": legacy_source["tool_name"], "arguments": legacy_source.get("arguments") or {}}
    disposition = str(result.get("continuation_disposition") or ("call_now" if canonical or legacy else "terminal"))
    if canonical and legacy and (canonical.get("name") != legacy.get("name") or canonical.get("arguments", {}) != legacy.get("arguments", {})):
        raise RuntimeError("MCP handoff mismatch between mcp_next_call and legacy mcp_next_tool")
    next_call = canonical or legacy
    if disposition in {"await_input", "terminal"}:
        if next_call:
            raise RuntimeError(f"MCP handoff must be null when continuation_disposition={disposition}")
        return None
    if disposition != "call_now":
        raise RuntimeError(f"Unsupported continuation_disposition: {disposition}")
    if not isinstance(next_call, dict):
        raise RuntimeError("MCP call_now result is missing mcp_next_call")
    if not isinstance(next_call.get("name"), str) or not next_call["name"]:
        raise RuntimeError("MCP next call is missing a tool name")
    if not isinstance(next_call.get("arguments"), dict):
        raise RuntimeError("MCP next call arguments must be an object")
    expected = CANONICAL_SEQUENCE[len(completed_sequence)] if len(completed_sequence) < len(CANONICAL_SEQUENCE) else None
    if next_call["name"] != expected:
        raise RuntimeError(f"MCP server returned {next_call['name']}; expected {expected or 'no further tool'}")
    if next_call["name"] in completed_sequence:
        raise RuntimeError(f"MCP handoff cycle detected at {next_call['name']}")
    result_workflow = str(result.get("workflow_id") or "")
    payload = next_call["arguments"].get("payload") if isinstance(next_call["arguments"].get("payload"), dict) else {}
    handoff_workflow = str(payload.get("workflow_id") or "")
    if result_workflow and handoff_workflow and result_workflow != handoff_workflow:
        raise RuntimeError("MCP handoff workflow_id does not match the current result")
    return next_call


class McpClient:
    def __init__(self, endpoint: str) -> None:
        if not endpoint.startswith("https://"):
            raise ValueError("MVR_MCP_URL must use HTTPS")
        self.endpoint = endpoint
        self.rpc_id = 1
        self.protocol_version: str | None = None

    def rpc(self, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        request_id = self.rpc_id
        envelope: dict[str, Any] = {"jsonrpc": "2.0", "id": request_id, "method": method}
        self.rpc_id += 1
        if params is not None:
            envelope["params"] = params
        request_headers = {"Content-Type": "application/json", "Accept": "application/json", "User-Agent": "mvr-reference-preflight-python/1.0"}
        if self.protocol_version and method != "initialize":
            request_headers["MCP-Protocol-Version"] = self.protocol_version
        request = urllib.request.Request(
            self.endpoint,
            data=json.dumps(envelope).encode("utf-8"),
            headers=request_headers,
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                raw = response.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"MCP HTTP {exc.code}: {detail[:500]}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"MCP network error for {method}: {exc.reason}") from exc
        try:
            result = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"MCP protocol error for {method}: response is not valid JSON") from exc
        validated = validate_mcp_envelope(result, request_id, method)
        if method == "initialize" and isinstance(validated.get("protocolVersion"), str):
            self.protocol_version = validated["protocolVersion"]
        return validated


def execute(request_data: dict[str, Any], endpoint: str, policy_mode: str = "advisory_selection") -> dict[str, Any]:
    if policy_mode not in POLICY_MODES:
        raise ValueError(f"Unsupported policy mode: {policy_mode}")
    policy_classification = classify_policy_intent(request_data)
    if policy_mode == "required_preflight" and policy_classification == "not_protected":
        return {
            "status": "policy_not_applicable",
            "policy_mode": policy_mode,
            "policy_classification": policy_classification,
            "mvr_preflight_required": False,
            "recommendation_release_authority": "host_policy_only",
        }
    if policy_mode == "required_preflight" and policy_classification == "ambiguous":
        return {
            "status": "policy_review_required",
            "policy_mode": policy_mode,
            "policy_classification": policy_classification,
            "mvr_preflight_required": "undetermined",
            "recommendation_release_allowed": False,
            "reason": "The request may be consequential, but the market or protected action is not explicit enough for automatic release.",
        }
    client = McpClient(endpoint)
    client.rpc("initialize", {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "mvr-reference-preflight-python", "version": "1.0"}})
    tools = client.rpc("tools/list").get("tools") or []
    names = {str(tool.get("name")) for tool in tools}
    missing = [name for name in CANONICAL_SEQUENCE if name not in names]
    if missing:
        raise RuntimeError(f"MCP server is missing canonical tools: {missing}")

    results: dict[str, Any] = {}
    sequence: list[str] = []
    next_call: dict[str, Any] | None = {"name": "mvr_first_call", "arguments": build_initial_call(request_data)}
    final: dict[str, Any] | None = None
    for _ in range(len(CANONICAL_SEQUENCE)):
        if next_call is None:
            break
        expected = CANONICAL_SEQUENCE[len(sequence)]
        if next_call["name"] != expected:
            raise RuntimeError(f"MCP client refused out-of-order call {next_call['name']}; expected {expected}")
        rpc_result = client.rpc("tools/call", next_call)
        final = extract_tool_payload(rpc_result)
        sequence.append(next_call["name"])
        results[next_call["name"]] = final
        next_call = normalize_next_call(final, sequence)
    if next_call is not None:
        raise RuntimeError("MCP handoff exceeded the bounded five-tool sequence")
    if final is None:
        raise RuntimeError("MCP preflight returned no tool result")

    continuation_disposition = str(final.get("continuation_disposition") or "terminal")
    complete = sequence[-1] == "mvr_decision_check" and continuation_disposition == "terminal"
    required_gate = "preflight_completed_but_public_sandbox_not_authorizing" if complete else "blocked_pending_evidence"
    return {
        "status": "full_preflight_completed" if complete else "evidence_requested",
        "policy_mode": policy_mode,
        "policy_classification": policy_classification,
        "policy_gate": required_gate if policy_mode == "required_preflight" else "advisory_only",
        "recommendation_release_allowed": False,
        "environment": "public_sandbox",
        "sequence": sequence,
        "continuation_disposition": continuation_disposition,
        "workflow_status": final.get("workflow_status"),
        "not_a_verdict": final.get("not_a_verdict", True),
        "result": final,
        "boundary": "Public sandbox output is advisory routing, not a production verdict, approval, certification, legal opinion, underwriting decision, or autonomous authorization.",
    }


def self_test() -> None:
    initial = build_initial_call({
        "question": "Should we enter Kenya?",
        "country": "KE",
        "subject": {"entity_name": "Example", "entity_archetype": "distributor_network"},
        "market_scope": {"country": "KE"},
        "evidence_pack": [{"id": "EV-1", "verification_status": "verified"}],
    })
    assert initial["entity"] == "Example"
    assert initial["country"] == "KE"
    assert initial["evidence_pack"][0]["id"] == "EV-1"
    canonical_handoff = normalize_next_call({
        "continuation_disposition": "call_now",
        "workflow_id": "MVRWF-test",
        "mcp_next_call": {"name": "mvr_entity_resolve", "arguments": {"payload": {"workflow_id": "MVRWF-test"}}},
    }, ["mvr_first_call"])
    assert canonical_handoff and canonical_handoff["name"] == "mvr_entity_resolve"
    legacy_handoff = normalize_next_call({
        "continuation_disposition": "call_now",
        "mcp_next_tool": {"tool_name": "mvr_entity_resolve", "arguments": {"payload": {}}},
    }, ["mvr_first_call"])
    assert legacy_handoff and legacy_handoff["name"] == "mvr_entity_resolve"
    assert normalize_next_call({"continuation_disposition": "await_input", "mcp_next_call": None}, ["mvr_first_call"]) is None
    assert extract_tool_payload({"content": [{"type": "text", "text": '{"status":"ok","continuation_disposition":"terminal"}'}]})["status"] == "ok"
    try:
        normalize_next_call({
            "continuation_disposition": "call_now",
            "mcp_next_call": {"name": "mvr_decision_check", "arguments": {"payload": {}}},
        }, ["mvr_first_call"])
    except RuntimeError as exc:
        assert "expected mvr_entity_resolve" in str(exc)
    else:
        raise AssertionError("out-of-order handoff was accepted")
    assert classify_policy_intent({"question": "Should this fintech launch lending in Uganda?", "country": "UG"}) == "protected"
    assert classify_policy_intent({"question": "Translate this paragraph into Luganda."}) == "not_protected"
    assert classify_policy_intent({"question": "Should we launch this?"}) == "ambiguous"
    assert validate_mcp_envelope({"jsonrpc": "2.0", "id": 7, "result": {"tools": []}}, 7, "tools/list") == {"tools": []}
    invalid_envelopes = [
        ([], "response envelope"),
        ({"jsonrpc": "1.0", "id": 7, "result": {}}, "jsonrpc"),
        ({"jsonrpc": "2.0", "id": 8, "result": {}}, "response id"),
        ({"jsonrpc": "2.0", "id": 7}, "neither result nor error"),
        ({"jsonrpc": "2.0", "id": 7, "result": []}, "result must be"),
        ({"jsonrpc": "2.0", "id": 7, "error": {"code": -32603, "message": "test"}}, "MCP error"),
    ]
    for envelope, expected in invalid_envelopes:
        try:
            validate_mcp_envelope(envelope, 7, "tools/list")
        except RuntimeError as exc:
            assert expected in str(exc)
        else:
            raise AssertionError(f"malformed MCP envelope was accepted: {envelope!r}")
    print(json.dumps({"self_test": "PASS", "canonical_sequence_bound": len(CANONICAL_SEQUENCE), "replayable_handoff": True, "content_only_fallback": True, "policy_modes": list(POLICY_MODES), "malformed_envelopes_rejected": len(invalid_envelopes)}))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path)
    parser.add_argument("--mode", choices=POLICY_MODES, default="advisory_selection")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    if not args.input:
        parser.error("--input is required unless --self-test is used")
    try:
        request_data = json.loads(args.input.read_text(encoding="utf-8-sig"))
        output = execute(request_data, os.environ.get("MVR_MCP_URL", DEFAULT_ENDPOINT), args.mode)
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(output, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
