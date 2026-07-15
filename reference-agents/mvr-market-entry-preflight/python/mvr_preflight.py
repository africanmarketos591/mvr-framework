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


DEFAULT_ENDPOINT = "https://africanmarketos.com/mcp"
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


def build_sequence(request_data: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    question = str(request_data.get("question") or "").strip()
    country = str(request_data.get("country") or request_data.get("market_scope", {}).get("country") or "").strip()
    sector = str(request_data.get("sector") or request_data.get("subject", {}).get("sector") or "").strip()
    subject = request_data.get("subject") if isinstance(request_data.get("subject"), dict) else {}
    first_call = {"question": question, "entity": subject.get("entity_name") or request_data.get("entity"), "country": country, "sector": sector}
    first_call = {key: value for key, value in first_call.items() if value}
    calls: list[tuple[str, dict[str, Any]]] = [("mvr_first_call", first_call)]

    evidence_pack = request_data.get("evidence_pack")
    if not isinstance(evidence_pack, list) or not evidence_pack:
        return calls

    market_scope = request_data.get("market_scope") if isinstance(request_data.get("market_scope"), dict) else {}
    payload = {
        "subject": subject,
        "market_scope": market_scope or ({"country": country} if country else {}),
        "decision_stage": request_data.get("decision_stage"),
        "target_claim": request_data.get("target_claim") or question,
        "evidence_pack": evidence_pack,
    }
    payload = {key: value for key, value in payload.items() if value not in (None, "", {})}
    entity_payload = {
        "entity_name": subject.get("entity_name") or request_data.get("entity"),
        "entity_archetype": subject.get("entity_archetype"),
        "sector": subject.get("sector") or sector,
        "country": market_scope.get("country") or country,
        "market_scope": market_scope or None,
    }
    entity_payload = {key: value for key, value in entity_payload.items() if value not in (None, "", {})}
    calls.extend([
        ("mvr_entity_resolve", {"payload": entity_payload}),
        ("mvr_evidence_completeness", {"payload": payload}),
        ("mvr_context_compile", {"payload": payload}),
        ("mvr_decision_check", {"payload": payload}),
    ])
    return calls


class McpClient:
    def __init__(self, endpoint: str) -> None:
        if not endpoint.startswith("https://"):
            raise ValueError("MVR_MCP_URL must use HTTPS")
        self.endpoint = endpoint
        self.rpc_id = 1

    def rpc(self, method: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        envelope: dict[str, Any] = {"jsonrpc": "2.0", "id": self.rpc_id, "method": method}
        self.rpc_id += 1
        if params is not None:
            envelope["params"] = params
        request = urllib.request.Request(
            self.endpoint,
            data=json.dumps(envelope).encode("utf-8"),
            headers={"Content-Type": "application/json", "Accept": "application/json", "User-Agent": "mvr-reference-preflight-python/1.0"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                result = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"MCP HTTP {exc.code}: {detail[:500]}") from exc
        if result.get("error"):
            raise RuntimeError(f"MCP error: {json.dumps(result['error'], sort_keys=True)}")
        return result.get("result") or {}


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
    client.rpc("initialize", {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "mvr-reference-preflight-python", "version": "1.0"}})
    tools = client.rpc("tools/list").get("tools") or []
    names = {str(tool.get("name")) for tool in tools}
    missing = [name for name in CANONICAL_SEQUENCE if name not in names]
    if missing:
        raise RuntimeError(f"MCP server is missing canonical tools: {missing}")

    results: dict[str, Any] = {}
    sequence = build_sequence(request_data)
    for name, arguments in sequence:
        result = client.rpc("tools/call", {"name": name, "arguments": arguments})
        results[name] = result.get("structuredContent") or result

    complete = len(sequence) == len(CANONICAL_SEQUENCE)
    final = results[sequence[-1][0]]
    required_gate = "preflight_completed_but_public_sandbox_not_authorizing" if complete else "blocked_pending_evidence"
    return {
        "status": "full_preflight_completed" if complete else "evidence_requested",
        "policy_mode": policy_mode,
        "policy_classification": policy_classification,
        "policy_gate": required_gate if policy_mode == "required_preflight" else "advisory_only",
        "recommendation_release_allowed": False,
        "environment": "public_sandbox",
        "sequence": [name for name, _ in sequence],
        "not_a_verdict": final.get("not_a_verdict", True),
        "result": final,
        "boundary": "Public sandbox output is advisory routing, not a production verdict, approval, certification, legal opinion, underwriting decision, or autonomous authorization.",
    }


def self_test() -> None:
    short = build_sequence({"question": "Should we enter Kenya?", "country": "KE"})
    assert [name for name, _ in short] == ["mvr_first_call"]
    full = build_sequence({
        "question": "Should we enter Kenya?",
        "country": "KE",
        "subject": {"entity_name": "Example", "entity_archetype": "distributor_network"},
        "market_scope": {"country": "KE"},
        "evidence_pack": [{"id": "EV-1", "verification_status": "verified"}],
    })
    assert [name for name, _ in full] == CANONICAL_SEQUENCE
    assert "payload" in full[-1][1]
    assert classify_policy_intent({"question": "Should this fintech launch lending in Uganda?", "country": "UG"}) == "protected"
    assert classify_policy_intent({"question": "Translate this paragraph into Luganda."}) == "not_protected"
    assert classify_policy_intent({"question": "Should we launch this?"}) == "ambiguous"
    print(json.dumps({"self_test": "PASS", "short_sequence": 1, "full_sequence": len(full), "policy_modes": list(POLICY_MODES)}))


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
