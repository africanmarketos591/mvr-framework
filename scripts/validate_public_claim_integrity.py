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
    "MVR-Bench Figshare DOI: https://doi.org/10.6084/m9.figshare.32399076",
):
    require(forbidden not in texts, f"stale or unverified public claim remains: {forbidden}")

print("PASS: benchmark fixtures and machine-readable license scopes are honestly bounded")
