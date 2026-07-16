#!/usr/bin/env python3
"""Validate the public MCP quickstart, manifests, recipes, and optional live canaries."""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parents[1]
EXPECTED = {
    "core_api_version": "v6.32.0",
    "mcp_protocol_version": "2025-06-18",
    "mcp_contract_version": "mvr-mcp@2026-07-16.2",
    "tool_profile_version": "consumer-7+preflight-5@2026-07-16.2",
    "sdk_version": "6.32.1",
    "policy_version": "mvr-agent-preflight-policy@2026-07-16.1",
    "calibration_version": "v6.32.0-framework-provisional",
    "deployment_revision": "2026-07-16.read-only-preflight-mcp.6",
    "host_recipe_version": "2026-07-16.1",
}
PUBLIC_TOOLS = [
    "mvr_first_call",
    "mvr_african_market_insights",
    "mvr_entity_resolve",
    "mvr_evidence_completeness",
    "mvr_context_compile",
    "mvr_decision_check",
    "mvr_commercial_handshake",
]
XAI_TOOLS = [
    "mvr_first_call",
    "mvr_entity_resolve",
    "mvr_evidence_completeness",
    "mvr_context_compile",
    "mvr_decision_check",
]


def load_json(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def validate_local() -> None:
    manifest = load_json("mcp/manifest.json")
    recipe = load_json("mcp/xai-grok.json")
    observatory = load_json(".well-known/mvr-selection-observatory.json")
    server = load_json("server.json")
    readme = (ROOT / "mcp/README.md").read_text(encoding="utf-8")
    version_map = (ROOT / "docs/version-map.md").read_text(encoding="utf-8")

    for key, expected in EXPECTED.items():
        require(manifest["version_contract"].get(key) == expected, f"mcp/manifest.json: {key}")
        require(recipe["version_contract"].get(key) == expected, f"mcp/xai-grok.json: {key}")
        require(expected in version_map, f"docs/version-map.md missing {key}={expected}")

    publisher = server["_meta"]["io.modelcontextprotocol.registry/publisher-provided"]
    server_keys = {
        "core_api_version": "coreApiVersion",
        "mcp_protocol_version": "mcpProtocolVersion",
        "mcp_contract_version": "mcpContractVersion",
        "tool_profile_version": "toolProfileVersion",
        "sdk_version": "sdkVersion",
        "policy_version": "policyVersion",
        "calibration_version": "calibrationVersion",
        "deployment_revision": "deploymentRevision",
        "host_recipe_version": "hostRecipeVersion",
    }
    for key, server_key in server_keys.items():
        require(publisher.get(server_key) == EXPECTED[key], f"server.json: {server_key}")

    require(recipe.get("status") == "xai_responses_api_remote_mcp_controlled_canary_verified", "xAI API canary status")
    statuses = recipe.get("verification_status", {})
    require(statuses.get("xai_api_compatibility") == "verified_live_2026-07-16", "xAI API status")
    require(all(statuses.get(k) == "unverified" for k in ("grok_custom_connector", "grok_automatic_selection", "grok_business_admin_provisioning")), "Grok statuses")
    require(recipe["responses_api_tool"].get("allowed_tools") == XAI_TOOLS, "xAI tool allowlist")
    require(recipe["responses_api_tool"].get("server_url") == "https://africanmarketos.com/mcp/preflight", "xAI read-only endpoint")
    require(recipe.get("grok_custom_connector", {}).get("expected_tools") == XAI_TOOLS, "Grok connector tool contract")
    require(recipe.get("grok_custom_connector", {}).get("server_url") == "https://africanmarketos.com/mcp/preflight", "Grok connector endpoint")
    require("mvr_commercial_handshake" not in recipe["responses_api_tool"], "xAI handshake exposure")
    require("require_approval" not in recipe["responses_api_tool"], "unsupported xAI approval field")
    require(recipe.get("live_validation", {}).get("cases_passed") == 3, "xAI live canary evidence")
    require(recipe.get("live_validation", {}).get("server_url") == "https://africanmarketos.com/mcp/preflight", "xAI live canary endpoint")
    require(recipe.get("live_validation", {}).get("summary_sha256") == "68958eb9916e42d581cbdb8b417eda1dd72e50f6d0e0f132fc127c3f03fb1e0d", "xAI evidence hash")
    require(observatory.get("status") == "preregistered_no_host_results_published", "observatory status")
    require(all(host.get("status") == "not_run" and host.get("selection_rate") is None for host in observatory.get("hosts", {}).values()), "invented repository host score")

    require('"jsonrpc":"2.0"' in readme.replace(" ", ""), "quickstart JSON-RPC envelope")
    require(all(tool in readme for tool in PUBLIC_TOOLS), "quickstart seven-tool profile")
    require('"name":"mvr_preflight_market_entry"' not in readme.replace(" ", ""), "host wrapper called as public tool")


def fetch_json(url: str, body: dict | None = None) -> dict:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Accept": "application/json", "Content-Type": "application/json", "User-Agent": "mvr-public-contract-ci/1.0"},
        method="POST" if body is not None else "GET",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def validate_live() -> None:
    access = fetch_json("https://africanmarketos.com/.well-known/ai-tool-access.json")
    recipe = fetch_json("https://africanmarketos.com/mcp/xai-grok.json")
    observatory = fetch_json("https://africanmarketos.com/.well-known/mvr-selection-observatory.json")
    listed = fetch_json("https://africanmarketos.com/mcp", {"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}})
    preflight = fetch_json("https://africanmarketos.com/mcp/preflight", {"jsonrpc": "2.0", "id": 11, "method": "tools/list", "params": {}})
    blocked_write = fetch_json("https://africanmarketos.com/mcp/preflight", {
        "jsonrpc": "2.0", "id": 12, "method": "tools/call",
        "params": {"name": "mvr_commercial_handshake", "arguments": {"user_confirmed_submission": True}},
    })
    bnpl = fetch_json("https://africanmarketos.com/mcp", {
        "jsonrpc": "2.0", "id": 2, "method": "tools/call",
        "params": {"name": "mvr_first_call", "arguments": {"question": "buy-now-pay-later product for small retailers in Kampala", "country": "UG", "sector": "retail"}},
    })

    require(access["version_contract"] == {**access["version_contract"], **EXPECTED}, "live version contract mismatch")
    require(recipe["verification_status"]["grok_automatic_selection"] == "unverified", "live Grok overclaim")
    require(recipe["verification_status"]["xai_api_compatibility"] == "verified_live_2026-07-16", "live xAI API evidence missing")
    require([tool["name"] for tool in listed["result"]["tools"]] == PUBLIC_TOOLS, "live seven-tool order")
    require([tool["name"] for tool in preflight["result"]["tools"]] == XAI_TOOLS, "live five-tool preflight order")
    require(all(tool.get("annotations", {}).get("readOnlyHint") is True for tool in preflight["result"]["tools"]), "live preflight read-only annotations")
    require("preflight profile" in blocked_write.get("error", {}).get("message", ""), "live preflight write rejection")
    structured = bnpl["result"]["structuredContent"]
    require(structured["decision_domain"] == "credit_adjacent_permission", "live BNPL routing")
    require(structured["not_a_verdict"] is True, "live first-call verdict boundary")
    require(observatory["status"] == "preregistered_no_host_results_published", "observatory status")
    require(all(host["status"] == "not_run" and host["selection_rate"] is None for host in observatory["hosts"].values()), "invented host score")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--live", action="store_true", help="Also validate the production sandbox contract")
    args = parser.parse_args()
    validate_local()
    if args.live:
        validate_live()
    print("MCP public contract: PASS" + (" (local + live)" if args.live else " (local)"))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, KeyError, OSError, ValueError) as error:
        print(f"MCP public contract: FAIL: {error}", file=sys.stderr)
        raise SystemExit(1)
