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
submission_example = json.loads((BENCH / "examples" / "submission-example.json").read_text(encoding="utf-8"))
leaderboard = json.loads((BENCH / "leaderboard" / "leaderboard.example.json").read_text(encoding="utf-8"))
license_map = json.loads((ROOT / "well-known" / "mvr-license.json").read_text(encoding="utf-8"))
public_license_map = json.loads((ROOT / ".well-known" / "mvr-license.json").read_text(encoding="utf-8"))
public_bench = json.loads((ROOT / ".well-known" / "mvr-bench.json").read_text(encoding="utf-8"))

require(submission.get("uses_mvr_api") is False, "authored fixture must not claim a live API call")
require(submission_example.get("uses_mvr_api") is False, "human-written submission example must not claim a live API call")
require("Human-authored" in submission.get("method", ""), "authored fixture disclosure missing")
require(leaderboard["entries"][0].get("mvr_api_used") is False, "leaderboard fixture claims API use")
require("authored" in leaderboard["proof_of_value"]["claim_boundary"].lower(), "leaderboard boundary is incomplete")
require(license_map.get("scopeRule"), "resource-specific license scope rule missing")
require(len(license_map.get("resourceScopes", [])) >= 4, "resource scope map is incomplete")
require(public_license_map == license_map, "duplicate public license maps have drifted")
require(public_bench.get("hugging_face") == "https://huggingface.co/datasets/AfricanMarket/mvr-bench", "Hugging Face distribution URL missing")
require(public_bench.get("license_grant", {}).get("id") == "CC-BY-NC-ND-4.0", "benchmark license grant missing")
require(
    "do not add restrictions" in public_bench.get("publisher_policy_qualification", "").lower(),
    "benchmark publisher-policy qualification missing",
)

texts = "\n".join(path.read_text(encoding="utf-8", errors="replace") for path in BENCH.rglob("*") if path.is_file())
discovery_texts = "\n".join(
    (ROOT / path).read_text(encoding="utf-8", errors="replace")
    for path in (
        ".well-known/mvr-bench.json",
        "agents.json",
        "llms.txt",
        "mvr-commercial-use-policy.md",
        ".well-known/mvr-license.json",
    )
)
for forbidden in (
    "MVR API Preflight Reference Agent",
    "live MVR API calls create the strongest reduction",
    "preflight reduced Reckless-GO Rate",
    "MVR-Bench Figshare DOI: https://doi.org/10.6084/m9.figshare.32399076",
    "10.6084/m9.figshare.32399076",
    "mvr-demo-key",
):
    require(forbidden not in texts, f"stale or unverified public claim remains: {forbidden}")

for forbidden in (
    "MVR API Preflight Reference Agent",
    "live MVR API calls create the strongest reduction",
    "preflight reduced Reckless-GO Rate",
    "MVR-Bench Figshare DOI: https://doi.org/10.6084/m9.figshare.32399076",
    "10.6084/m9.figshare.32399076",
):
    require(forbidden not in discovery_texts, f"stale or unverified discovery claim remains: {forbidden}")

readme = (BENCH / "README.md").read_text(encoding="utf-8")
index_html = (BENCH / "index.html").read_text(encoding="utf-8")
mcp_guide = (BENCH / "examples" / "run_with_mcp.md").read_text(encoding="utf-8")
require("not a measured API effect" in readme, "README must reject causal interpretation of authored fixtures")
require("not a measured API effect" in index_html, "HTML must reject causal interpretation of authored fixtures")
require("https://africanmarketos.com/mcp/preflight" in mcp_guide, "MCP guide must use the canonical preflight endpoint")
require("not an additional condition" in readme, "README must not present the no-training notice as an added CC restriction")
require("not an additional condition" in (BENCH / "LICENSE.md").read_text(encoding="utf-8"), "license note must preserve existing CC grants")
require("not an additional condition" in (BENCH / "DATA_USE_BOUNDARY.md").read_text(encoding="utf-8"), "data-use notice must preserve existing CC grants")
policy = (ROOT / "mvr-commercial-use-policy.md").read_text(encoding="utf-8").lower()
require("does not revoke or narrow" in policy, "commercial policy must preserve resource-specific open licenses")
require("commercial reuse of an openly licensed publication" in policy, "commercial policy must distinguish publication rights from service access")

print("PASS: benchmark fixtures and machine-readable license scopes are honestly bounded")
