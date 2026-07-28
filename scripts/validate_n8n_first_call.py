import argparse
import json
from pathlib import Path
import urllib.request


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / "integrations" / "n8n" / "mvr-first-call-preflight.n8n.json"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL: {message}")


data = json.loads(WORKFLOW.read_text(encoding="utf-8"))
text = WORKFLOW.read_text(encoding="utf-8")
nodes = data.get("nodes", [])
names = {node.get("name") for node in nodes}
node_by_name = {node.get("name"): node for node in nodes}

require(len(nodes) == 4, "expected exactly four bounded nodes")
require(len(names) == len(nodes), "node names must be unique")
require("https://africanmarketos.com/mcp/preflight" in text, "canonical MCP endpoint missing")
require("mvr_first_call" in text, "mvr_first_call missing")
request_body = node_by_name["Call MVR First Call"]["parameters"]["body"]
example_code = node_by_name["Example Decision Input"]["parameters"]["jsCode"]
for field in ("entity", "country", "sector", "question", "use_case"):
    require(f"{field}: $json.{field}" in request_body, f"canonical first-call field missing: {field}")
    require(f"{field}:" in example_code, f"example input field missing: {field}")
for stale_field in ("entity_name: $json.entity_name", "decision: $json.decision", "intended_action: $json.intended_action"):
    require(stale_field not in request_body, f"stale first-call field remains: {stale_field}")
require("mvr_decision_check" not in text, "public template must not call decision-check")
require("mvr-demo-key-2026" not in text, "public template must not embed a demo key")
require("PROCEED" not in text and "ready_to_scale" not in text, "authorization language found")
require("DISCOVERY_ONLY" in text and "ABSTAIN_TECHNICAL" in text, "bounded states missing")
require(text.count("action_authorized: false") >= 2, "technical and success branches must both deny authorization")
require(text.count("human_review_required: true") >= 2, "technical and success branches must both require human review")
require("not_a_verdict" in text and "live_mvr_scoring_executed" in text, "public boundary checks missing")
require(data.get("active") is False, "export must be inactive")
settings = data.get("settings", {})
require(settings.get("saveDataSuccessExecution") == "none", "success execution retention must be disabled")
require(settings.get("saveDataErrorExecution") == "none", "error execution retention must be disabled")

def validate_live() -> None:
    payload = {
        "jsonrpc": "2.0",
        "id": "n8n-contract-validator",
        "method": "tools/call",
        "params": {
            "name": "mvr_first_call",
            "arguments": {
                "entity": "Example Kampala supplier-finance venture",
                "country": "UG",
                "sector": "supplier finance BNPL",
                "question": "Should this venture proceed beyond bounded discovery?",
                "use_case": "credit_adjacent",
            },
        },
    }
    request = urllib.request.Request(
        "https://africanmarketos.com/mcp/preflight",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "mvr-n8n-contract-ci/1.0",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        result = json.load(response)
    structured = result.get("result", {}).get("structuredContent", {})
    require(structured.get("not_a_verdict") is True, "live first-call did not preserve non-verdict boundary")
    require(structured.get("live_mvr_scoring_executed") is False, "live first-call unexpectedly claimed scoring")


parser = argparse.ArgumentParser()
parser.add_argument("--live", action="store_true", help="Also execute the canonical workflow call against production")
args = parser.parse_args()
if args.live:
    validate_live()

print("PASS: n8n public first-call template is structurally bounded and fail-closed" + (" (local + live)" if args.live else " (local)"))
