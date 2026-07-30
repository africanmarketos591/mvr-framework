import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / "plugins" / "anthropic-mvr-preflight"


def require(condition, message):
    if not condition:
        raise SystemExit(f"AGENT_DISTRIBUTION_INVALID: {message}")


manifest = json.loads((PLUGIN / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8"))
mcp = json.loads((PLUGIN / ".mcp.json").read_text(encoding="utf-8"))

require(manifest["name"] == "african-market-os-mvr-preflight", "unexpected plugin name")
require(manifest["license"] == "Apache-2.0", "plugin license must be explicit")
require(manifest.get("defaultEnabled") is False, "remote-service plugin must require enablement")
server = mcp["mcpServers"]["african-market-os-mvr-preflight"]
require(server == {"type": "http", "url": "https://africanmarketos.com/mcp/preflight"}, "connector must be keyless canonical preflight")
require((PLUGIN / "SUBMISSION.md").exists(), "Anthropic submission record is missing")

skills = sorted((PLUGIN / "skills").glob("*/SKILL.md"))
require(len(skills) == 3, "expected exactly three focused skills")
for skill in skills:
    text = skill.read_text(encoding="utf-8")
    require(text.startswith("---\n"), f"missing frontmatter: {skill}")
    frontmatter = text.split("---", 2)[1]
    name = re.search(r"(?m)^name:\s*([a-z0-9-]+)\s*$", frontmatter)
    description = re.search(r"(?m)^description:\s*(.+)$", frontmatter)
    require(name and name.group(1) == skill.parent.name, f"skill name mismatch: {skill}")
    require(description and len(description.group(1)) >= 80, f"weak skill description: {skill}")
    require("mvr_first_call" in text, f"canonical first call missing: {skill}")
    require("not a verdict" in text.lower() or "non-verdict" in text.lower(), f"verdict boundary missing: {skill}")

all_text = "\n".join(path.read_text(encoding="utf-8") for path in PLUGIN.rglob("*") if path.is_file())
for forbidden in ("calibration weight", "private answer key", "scoring threshold", "DODO_LIVE_API_KEY", "OPENAI_API_KEY"):
    require(forbidden.lower() not in all_text.lower(), f"protected or secret-shaped content present: {forbidden}")

templates = sorted((ROOT / "integrations" / "openai" / "workspace-agents").glob("*.md"))
require(len(templates) == 3, "expected three OpenAI Workspace Agent templates")
require((ROOT / "integrations" / "openai" / "SUBMISSION.md").exists(), "OpenAI submission record is missing")
for template in templates:
    text = template.read_text(encoding="utf-8")
    require("mvr_first_call" in text, f"workspace template lacks canonical first call: {template}")
    require("authorization" in text.lower() or "human" in text.lower(), f"workspace template lacks authority boundary: {template}")

print("AGENT_DISTRIBUTION_VALID: Anthropic plugin and OpenAI Workspace Agent templates verified")
