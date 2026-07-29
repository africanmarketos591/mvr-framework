#!/usr/bin/env python3
"""Validate the public MCP quickstart, manifests, recipes, and optional live canaries."""

from __future__ import annotations

import argparse
import json
import pathlib
import sys
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parents[1]
VERSION_KEYS = (
    "core_api_version",
    "mcp_protocol_version",
    "mcp_contract_version",
    "tool_profile_version",
    "sdk_version",
    "policy_version",
    "calibration_version",
    "deployment_revision",
    "host_recipe_version",
)
VERSION_CONTRACT = json.loads(
    (ROOT / ".well-known" / "mvr-version.json").read_text(encoding="utf-8")
)
EXPECTED = {key: VERSION_CONTRACT[key] for key in VERSION_KEYS}
CONSUMER_COMPATIBILITY_TOOLS = [
    "mvr_first_call",
    "mvr_african_market_insights",
    "mvr_entity_resolve",
    "mvr_evidence_completeness",
    "mvr_context_compile",
    "mvr_decision_check",
    "mvr_commercial_handshake",
]
REGISTRY_TOOLS = [
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
    aws_recipe = load_json("mcp/aws-agentcore.json")
    agent_card = load_json(".well-known/agent-card.json")
    observatory = load_json(".well-known/mvr-selection-observatory.json")
    server = load_json("server.json")
    readme = (ROOT / "mcp/README.md").read_text(encoding="utf-8")
    version_map = (ROOT / "docs/version-map.md").read_text(encoding="utf-8")
    python_client = (ROOT / "reference-agents/mvr-market-entry-preflight/python/mvr_preflight.py").read_text(encoding="utf-8")
    javascript_client = (ROOT / "reference-agents/mvr-market-entry-preflight/javascript/mvr_preflight.mjs").read_text(encoding="utf-8")

    for key, expected in EXPECTED.items():
        require(manifest["version_contract"].get(key) == expected, f"mcp/manifest.json: {key}")
        require(recipe["version_contract"].get(key) == expected, f"mcp/xai-grok.json: {key}")
        require(aws_recipe["version_contract"].get(key) == expected, f"mcp/aws-agentcore.json: {key}")
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

    require(recipe.get("status") == "xai_responses_api_remote_mcp_selection_track_verified", "xAI selection-track status")
    statuses = recipe.get("verification_status", {})
    require(statuses.get("xai_api_compatibility") == "verified_live_2026-07-16", "xAI API status")
    require(statuses.get("xai_selection_observatory") == "frozen_40_case_baseline_failed_then_post_intervention_passed_2026-07-23", "xAI selection observatory status")
    require(statuses.get("grok_custom_connector") == "operator_verified_install_and_explicit_execution_2026-07-16", "Grok connector status")
    require(statuses.get("grok_automatic_selection") == "operator_observed_pre_metadata_miss_and_post_metadata_pass_not_a_benchmark_score_2026-07-16", "Grok selection observation boundary")
    require(statuses.get("grok_business_admin_provisioning") == "unverified", "Grok Business status")
    require(manifest.get("version") == "v6.32.5", "MCP registry manifest revision")
    require(manifest.get("transport", {}).get("url") == "https://africanmarketos.com/mcp/preflight", "registry endpoint")
    require(manifest.get("tool_profile", {}).get("tools") == REGISTRY_TOOLS, "registry five-tool profile")
    require(manifest.get("tool_profile", {}).get("consumer_compatibility_endpoint") == "https://africanmarketos.com/mcp", "consumer compatibility endpoint")
    require(manifest.get("tool_profile", {}).get("full_expert_endpoint") == "https://africanmarketos.com/mcp/full", "full expert endpoint")
    require(len(aws_recipe.get("registry_records", [])) == 1 and aws_recipe["registry_records"][0].get("endpoint") == "https://africanmarketos.com/mcp/preflight", "AWS synchronized endpoint")
    require(set(aws_recipe.get("workflow_profiles", {})) == {"market_entry_preflight", "investor_diligence", "partnership_evaluation"}, "AWS bounded workflow set")
    require(all(profile.get("allowed_tools") == REGISTRY_TOOLS for profile in aws_recipe["workflow_profiles"].values()), "AWS five-tool workflow allowlists")
    require(any("Registry synchronization alone does not make a model call" in step for step in aws_recipe.get("registration_steps", [])), "AWS Registry-to-invocation boundary")
    require("not represented as compatible" in aws_recipe.get("a2a_boundary", ""), "AWS A2A non-claim")
    require(agent_card.get("supportedInterfaces", [{}])[0].get("protocolVersion") == "1.0" and len(agent_card.get("skills", [])) == 6, "A2A Agent Card contract")
    require(server.get("version") == "6.32.5", "server registry revision")
    expected_protocols = ["2026-07-28", "2025-11-25", "2025-06-18"]
    require(manifest["version_contract"].get("mcp_protocol_versions") == expected_protocols, "manifest supported MCP protocol versions")
    require(recipe["version_contract"].get("mcp_protocol_versions") == expected_protocols, "xAI recipe supported MCP protocol versions")
    require(aws_recipe["version_contract"].get("mcp_protocol_versions") == expected_protocols, "AWS recipe supported MCP protocol versions")
    require(publisher.get("mcpProtocolVersions") == expected_protocols, "server supported MCP protocol versions")
    require(manifest.get("commercial_next_step", {}).get("starter_checkout") == "https://africanmarketos.com/checkout/starter", "manifest Starter checkout")
    require(manifest.get("commercial_next_step", {}).get("governed_access_url") == "https://africanmarketos.com/get-api-key", "manifest governed access route")
    require(publisher.get("commercialRoute") == "https://africanmarketos.com/checkout/starter", "server self-serve commercial route")
    require("MCP-Protocol-Version" in python_client and "self.protocol_version" in python_client, "Python reference client must retain and send the negotiated MCP protocol")
    require("MCP-Protocol-Version" in javascript_client and "this.protocolVersion" in javascript_client, "JavaScript reference client must retain and send the negotiated MCP protocol")
    require("Publication-surface version snapshot" in observatory.get("version_contract_scope", ""), "selection observatory must label its frozen publication metadata snapshot")
    require(observatory.get("version_contract_recorded_at") == "2026-07-28", "selection observatory publication snapshot date")
    require(publisher.get("consumerCompatibilityEndpoint") == "https://africanmarketos.com/mcp", "server consumer compatibility endpoint")
    require(publisher.get("fullExpertEndpoint") == "https://africanmarketos.com/mcp/full", "server full expert endpoint")
    require("broaderExpertEndpoint" not in publisher, "stale server expert endpoint label")
    require(recipe["responses_api_tool"].get("allowed_tools") == REGISTRY_TOOLS, "xAI tool allowlist")
    require(recipe["responses_api_tool"].get("server_url") == "https://africanmarketos.com/mcp/preflight", "xAI read-only endpoint")
    require(recipe.get("grok_custom_connector", {}).get("expected_tools") == REGISTRY_TOOLS, "Grok connector tool contract")
    require(recipe.get("grok_custom_connector", {}).get("server_url") == "https://africanmarketos.com/mcp/preflight", "Grok connector endpoint")
    require("mvr_commercial_handshake" not in recipe["responses_api_tool"], "xAI handshake exposure")
    require("require_approval" not in recipe["responses_api_tool"], "unsupported xAI approval field")
    require(recipe.get("live_validation", {}).get("cases_passed") == 3, "xAI live canary evidence")
    require(recipe.get("live_validation", {}).get("server_url") == "https://africanmarketos.com/mcp/preflight", "xAI live canary endpoint")
    require(recipe.get("live_validation", {}).get("summary_sha256") == "68958eb9916e42d581cbdb8b417eda1dd72e50f6d0e0f132fc127c3f03fb1e0d", "xAI evidence hash")
    connector_validation = recipe.get("grok_com_operator_observation", {})
    require(connector_validation.get("tools_discovered") == 5, "Grok connector discovery evidence")
    require(connector_validation.get("explicit_execution", {}).get("status") == "pass", "Grok connector execution evidence")
    require(connector_validation.get("pre_metadata_automatic_selection", {}).get("status") == "miss", "Grok pre-metadata miss evidence")
    require(connector_validation.get("post_metadata_automatic_selection", {}).get("status") == "pass", "Grok post-metadata selection evidence")
    require("not a frozen-track selection rate" in connector_validation.get("scoring_boundary", ""), "Grok selection rate must remain unclaimed")
    require(observatory.get("status") == "two_api_host_results_published_baselines_failed_post_intervention_passed", "observatory status")
    hosts = observatory.get("hosts", {})
    require(hosts.get("grok", {}).get("post_intervention", {}).get("all_release_gates_passed") is True, "xAI observatory result")
    require(hosts.get("openai_responses_api", {}).get("post_intervention", {}).get("all_release_gates_passed") is True, "OpenAI observatory result")
    untested_hosts = ["chatgpt", "claude", "microsoft_copilot", "google_adk_or_gemini"]
    require(all(hosts.get(name, {}).get("status") == "not_run" and hosts.get(name, {}).get("selection_rate") is None for name in untested_hosts), "untested repository hosts must remain unscored")

    require('"jsonrpc":"2.0"' in readme.replace(" ", ""), "quickstart JSON-RPC envelope")
    require(all(tool in readme for tool in REGISTRY_TOOLS), "quickstart five-tool profile")
    require("mvr_commercial_handshake" not in readme, "write-capable tool appears in registry quickstart")
    require('"name":"mvr_preflight_market_entry"' not in readme.replace(" ", ""), "host wrapper called as public tool")
    require(readme.count("MCP-Protocol-Version: 2025-11-25") >= 2, "post-initialize quickstarts must send the negotiated current initialize-based MCP protocol header")


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
    live_version = fetch_json("https://africanmarketos.com/.well-known/mvr-version.json")
    recipe = fetch_json("https://africanmarketos.com/mcp/xai-grok.json")
    aws_recipe = fetch_json("https://africanmarketos.com/mcp/aws-agentcore.json")
    agent_card = fetch_json("https://africanmarketos.com/.well-known/agent-card.json")
    observatory = fetch_json("https://africanmarketos.com/.well-known/mvr-selection-observatory.json")
    listed = fetch_json("https://africanmarketos.com/mcp", {"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}})
    preflight = fetch_json("https://africanmarketos.com/mcp/preflight", {"jsonrpc": "2.0", "id": 11, "method": "tools/list", "params": {}})
    blocked_write = fetch_json("https://africanmarketos.com/mcp/preflight", {
        "jsonrpc": "2.0", "id": 12, "method": "tools/call",
        "params": {"name": "mvr_commercial_handshake", "arguments": {"user_confirmed_submission": True}},
    })
    bnpl = fetch_json("https://africanmarketos.com/mcp/preflight", {
        "jsonrpc": "2.0", "id": 2, "method": "tools/call",
        "params": {"name": "mvr_first_call", "arguments": {"question": "buy-now-pay-later product for small retailers in Kampala", "country": "UG", "sector": "retail"}},
    })

    require(all(access["version_contract"].get(key) == expected for key, expected in EXPECTED.items()), "live version contract mismatch")
    require(live_version == VERSION_CONTRACT, "live version document differs from tracked mirror")
    require(recipe["verification_status"]["grok_automatic_selection"] == "operator_observed_pre_metadata_miss_and_post_metadata_pass_not_a_benchmark_score_2026-07-16", "live Grok selection boundary")
    require(recipe["verification_status"]["xai_api_compatibility"] == "verified_live_2026-07-16", "live xAI API evidence missing")
    require(recipe["verification_status"]["xai_selection_observatory"] == "frozen_40_case_baseline_failed_then_post_intervention_passed_2026-07-23", "live xAI selection result missing")
    require([tool["name"] for tool in listed["result"]["tools"]] == CONSUMER_COMPATIBILITY_TOOLS, "live consumer compatibility tool order")
    require([tool["name"] for tool in preflight["result"]["tools"]] == REGISTRY_TOOLS, "live five-tool registry order")
    require(all(tool.get("annotations", {}).get("readOnlyHint") is True for tool in preflight["result"]["tools"]), "live preflight read-only annotations")
    require("preflight profile" in blocked_write.get("error", {}).get("message", ""), "live preflight write rejection")
    structured = bnpl["result"]["structuredContent"]
    require(structured["decision_domain"] == "credit_adjacent_permission", "live BNPL routing")
    require(structured["not_a_verdict"] is True, "live first-call verdict boundary")
    require(aws_recipe == load_json("mcp/aws-agentcore.json"), "live AWS recipe differs from tracked mirror")
    require(agent_card == load_json(".well-known/agent-card.json"), "live A2A Agent Card differs from tracked mirror")
    require(observatory["status"] == "two_api_host_results_published_baselines_failed_post_intervention_passed", "observatory status")
    require(observatory["hosts"]["grok"]["post_intervention"]["all_release_gates_passed"] is True, "live xAI observatory result")
    require(observatory["hosts"]["openai_responses_api"]["post_intervention"]["all_release_gates_passed"] is True, "live OpenAI observatory result")
    untested_hosts = ["chatgpt", "claude", "microsoft_copilot", "google_adk_or_gemini"]
    require(all(observatory["hosts"][name]["status"] == "not_run" and observatory["hosts"][name]["selection_rate"] is None for name in untested_hosts), "untested live hosts must remain unscored")


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
