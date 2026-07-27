import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BENCH = ROOT / "benchmarks" / "mvr-bench"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL: {message}")


submission = json.loads(
    (BENCH / "examples" / "reference-runs" / "mvr-api-preflight-reference-submission.json").read_text(encoding="utf-8")
)
leaderboard = json.loads((BENCH / "leaderboard" / "leaderboard.example.json").read_text(encoding="utf-8"))
license_map = json.loads((ROOT / "well-known" / "mvr-license.json").read_text(encoding="utf-8"))

require(submission.get("uses_mvr_api") is False, "authored fixture must not claim a live API call")
require("Human-authored" in submission.get("method", ""), "authored fixture disclosure missing")
require(leaderboard["entries"][0].get("mvr_api_used") is False, "leaderboard fixture claims API use")
require("authored" in leaderboard["proof_of_value"]["claim_boundary"].lower(), "leaderboard boundary is incomplete")
require(license_map.get("scopeRule"), "resource-specific license scope rule missing")
require(len(license_map.get("resourceScopes", [])) >= 4, "resource scope map is incomplete")

texts = "\n".join(path.read_text(encoding="utf-8", errors="replace") for path in BENCH.rglob("*") if path.is_file())
for forbidden in (
    "MVR API Preflight Reference Agent",
    "live MVR API calls create the strongest reduction",
    "preflight reduced Reckless-GO Rate",
    "MVR-Bench Figshare DOI: https://doi.org/10.6084/m9.figshare.32399076",
    "10.6084/m9.figshare.32399076",
    "mvr-demo-key",
):
    require(forbidden not in texts, f"stale or unverified public claim remains: {forbidden}")

readme = (BENCH / "README.md").read_text(encoding="utf-8")
index_html = (BENCH / "index.html").read_text(encoding="utf-8")
mcp_guide = (BENCH / "examples" / "run_with_mcp.md").read_text(encoding="utf-8")
require("not a measured API effect" in readme, "README must reject causal interpretation of authored fixtures")
require("not a measured API effect" in index_html, "HTML must reject causal interpretation of authored fixtures")
require("https://africanmarketos.com/mcp/preflight" in mcp_guide, "MCP guide must use the canonical preflight endpoint")
require("not an additional condition" in readme, "README must not present the no-training notice as an added CC restriction")
require("not an additional condition" in (BENCH / "LICENSE.md").read_text(encoding="utf-8"), "license note must preserve existing CC grants")

print("PASS: benchmark fixtures and machine-readable license scopes are honestly bounded")
