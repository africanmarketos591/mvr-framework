import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / "integrations" / "n8n" / "mvr-first-call-preflight.n8n.json"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL: {message}")


data = json.loads(WORKFLOW.read_text(encoding="utf-8"))
text = WORKFLOW.read_text(encoding="utf-8")
nodes = data.get("nodes", [])
names = {node.get("name") for node in nodes}

require(len(nodes) == 4, "expected exactly four bounded nodes")
require(len(names) == len(nodes), "node names must be unique")
require("https://africanmarketos.com/mcp/preflight" in text, "canonical MCP endpoint missing")
require("mvr_first_call" in text, "mvr_first_call missing")
require("mvr_decision_check" not in text, "public template must not call decision-check")
require("mvr-demo-key-2026" not in text, "public template must not embed a demo key")
require("PROCEED" not in text and "ready_to_scale" not in text, "authorization language found")
require("DISCOVERY_ONLY" in text and "ABSTAIN_TECHNICAL" in text, "bounded states missing")
require("action_authorized: false" in text, "explicit non-authorization missing")
require("not_a_verdict" in text and "live_mvr_scoring_executed" in text, "public boundary checks missing")
require(data.get("active") is False, "export must be inactive")
settings = data.get("settings", {})
require(settings.get("saveDataSuccessExecution") == "none", "success execution retention must be disabled")
require(settings.get("saveDataErrorExecution") == "none", "error execution retention must be disabled")

print("PASS: n8n public first-call template is structurally bounded and fail-closed")
