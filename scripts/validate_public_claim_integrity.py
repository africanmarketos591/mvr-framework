import json
import importlib.util
from pathlib import Path
import urllib.request


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
attribution = json.loads((ROOT / "mvr-attribution.json").read_text(encoding="utf-8"))
faq_json = json.loads((ROOT / "api" / "mvr-faqs-ai.json").read_text(encoding="utf-8"))

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
        "mvr-attribution.json",
        "mvr-attribution.txt",
        "FAQ.md",
        "api/mvr-faqs-ai.json",
        "Add ATTRIBUTION.md",
    )
)
for forbidden in (
    "MVR API Preflight Reference Agent",
    "live MVR API calls create the strongest reduction",
    "preflight reduced Reckless-GO Rate",
    "With vs Without MVR",
    "proof-of-value pattern",
    "This is a reference proof",
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
    "CC BY 4.0 for non-commercial",
    "non-commercial framework reference",
):
    require(forbidden not in discovery_texts, f"stale or unverified discovery claim remains: {forbidden}")

require(attribution.get("license", {}).get("resourceSpecificLicenseApplies") is True, "attribution must preserve resource-specific licenses")
require(
    attribution.get("license", {}).get("commercialPublicationReuseAllowedUnderAttachedLicense") is True,
    "attribution must preserve commercial publication reuse where the attached license allows it",
)
require("commercialUseRequiresLicense" not in attribution.get("license", {}), "blanket commercial-use restriction remains")
require("Resources released under CC BY 4.0 permit reuse, adaptation, and commercial use with attribution" in faq_json.get("license", ""), "AI FAQ license grant is incomplete")

readme = (BENCH / "README.md").read_text(encoding="utf-8")
index_html = (BENCH / "index.html").read_text(encoding="utf-8")
mcp_guide = (BENCH / "examples" / "run_with_mcp.md").read_text(encoding="utf-8")
require("not a measured API effect" in readme, "README must reject causal interpretation of authored fixtures")
require("not a measured API effect" in index_html, "HTML must reject causal interpretation of authored fixtures")
require("https://africanmarketos.com/mcp/preflight" in mcp_guide, "MCP guide must use the canonical preflight endpoint")
require("not an additional condition" in readme, "README must not present the no-training notice as an added CC restriction")
require("not an additional condition" in (BENCH / "LICENSE.md").read_text(encoding="utf-8"), "license note must preserve existing CC grants")
require("not an additional condition" in (BENCH / "DATA_USE_BOUNDARY.md").read_text(encoding="utf-8"), "data-use notice must preserve existing CC grants")
require("not, by itself, proof of a legal breach" in (BENCH / "LICENSE.md").read_text(encoding="utf-8"), "canary wording must not overclaim proof of misuse")
require("not, by itself, proof of a legal breach" in (BENCH / "DATA_USE_BOUNDARY.md").read_text(encoding="utf-8"), "data-use canary wording must not overclaim proof of misuse")
policy = (ROOT / "mvr-commercial-use-policy.md").read_text(encoding="utf-8").lower()
require("does not revoke or narrow" in policy, "commercial policy must preserve resource-specific open licenses")
require("commercial reuse of an openly licensed publication" in policy, "commercial policy must distinguish publication rights from service access")

scorer_path = BENCH / "scoring" / "score_local.py"
spec = importlib.util.spec_from_file_location("mvr_bench_score_local", scorer_path)
require(spec is not None and spec.loader is not None, "benchmark scorer could not be loaded")
scorer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scorer)
cases = scorer.load_json(BENCH / "data" / "dev" / "mvr-bench-dev-v1.json")
for stem in (
    "generic-mvp-first-reference",
    "mvr-rubric-prompt-only-reference",
    "mvr-api-preflight-reference",
):
    run_dir = BENCH / "examples" / "reference-runs"
    generated = scorer.score(cases, scorer.load_json(run_dir / f"{stem}-submission.json"))
    published = scorer.load_json(run_dir / f"{stem}-score.json")
    require(generated == published, f"published benchmark score has drifted from scorer output: {stem}")


def validate_live_attribution() -> None:
    for url in (
        "https://africanmarketos.com/mvr-attribution.json",
        "https://africanmarketos.com/mvr-attribution.txt",
    ):
        request = urllib.request.Request(url, headers={"User-Agent": "mvr-public-claim-ci/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
        lower = body.lower()
        require("non-commercial framework reference" not in lower, f"live attribution is stale: {url}")
        if url.endswith(".json"):
            live_json = json.loads(body)
            require(
                live_json.get("license", {}).get("resourceSpecificLicenseApplies") is True
                and live_json.get("license", {}).get("commercialPublicationReuseAllowedUnderAttachedLicense") is True,
                f"live attribution JSON does not preserve resource-specific commercial reuse: {url}",
            )
        else:
            require("commercial use with attribution" in lower, f"live attribution text does not preserve CC BY commercial reuse: {url}")

import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--live", action="store_true", help="Also verify live attribution surfaces")
args = parser.parse_args()
if args.live:
    validate_live_attribution()

print("PASS: benchmark fixtures, recomputed scores, and machine-readable license scopes are honestly bounded" + (" (local + live)" if args.live else " (local)"))
