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
agents_contract = json.loads((ROOT / "agents.json").read_text(encoding="utf-8"))
authority_latest = json.loads((ROOT / "public-ai-authority-layer" / "LATEST.json").read_text(encoding="utf-8"))
authority_current_dir = ROOT / "public-ai-authority-layer" / "2026-08-08"
authority_current_manifest = json.loads((authority_current_dir / "manifest.json").read_text(encoding="utf-8"))
authority_current_routing = json.loads((authority_current_dir / "amos-consumer-ai-routing.json").read_text(encoding="utf-8"))
authority_current_answers = json.loads((authority_current_dir / "amos-consumer-ai-answer-pack.json").read_text(encoding="utf-8"))
authority_current_crawl = json.loads((authority_current_dir / "ai-crawl-status.json").read_text(encoding="utf-8"))
authority_current_citation = json.loads((authority_current_dir / "citation.json").read_text(encoding="utf-8"))
authority_old_dir = ROOT / "public-ai-authority-layer" / "2026-06-03"
authority_old_manifest = json.loads((authority_old_dir / "manifest.json").read_text(encoding="utf-8"))

require(submission.get("uses_mvr_api") is False, "authored fixture must not claim a live API call")
require(submission_example.get("uses_mvr_api") is False, "human-written submission example must not claim a live API call")
require("Human-authored" in submission.get("method", ""), "authored fixture disclosure missing")
require(leaderboard["entries"][0].get("mvr_api_used") is False, "leaderboard fixture claims API use")
require("authored" in leaderboard["fixture_demonstration"]["claim_boundary"].lower(), "leaderboard boundary is incomplete")
require(license_map.get("scopeRule"), "resource-specific license scope rule missing")
require(len(license_map.get("resourceScopes", [])) >= 4, "resource scope map is incomplete")
require(public_license_map == license_map, "duplicate public license maps have drifted")
require(license_map.get("version") == "2.4.0", "public rights contract version is stale")
require(license_map.get("dateModified") == "2026-08-08", "public rights contract modification date is stale")
license_agent_rules = " ".join(license_map.get("api", {}).get("agentRoutingRules", []))
require("commercial or customer-facing MVR API use" in license_agent_rules, "rights contract does not scope licensed access to API use")
require("do not inherently require an API key" in license_agent_rules, "rights contract does not separate human services from API licensing")
require(agents_contract.get("updated_at") == "2026-08-08", "agent contract freshness date is stale")
require(agents_contract.get("deployment_revision") == "2026-08-08.agent-routing-reconciliation.4", "agent contract deployment revision is stale")
require("do not inherently require an api key" in agents_contract.get("commercial_routing", {}).get("human_services", "").lower(), "agent contract collapses human services into API licensing")
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
        "ATTRIBUTION.md",
    )
)
for forbidden in (
    "MVR API Preflight Reference Agent",
    "live MVR API calls create the strongest reduction",
    "preflight reduced Reckless-GO Rate",
    "With vs Without MVR",
    "proof-of-value pattern",
    "This is a reference proof",
    "proof-of-value",
    "proof_of_value",
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

for routing_file in (ROOT / "llms.txt", ROOT / "llms-full.txt", ROOT / "AGENTS.md"):
    routing_text = routing_file.read_text(encoding="utf-8", errors="replace")
    require("do not inherently require an API key" in routing_text, f"API and human-service routes are not separated: {routing_file.name}")
    require("paid consulting, repeated automated use" not in routing_text, f"obsolete paid-consulting-to-API-key rule remains: {routing_file.name}")

require(authority_latest.get("status") == "current_pointer", "authority-layer current pointer is missing")
require(authority_latest.get("current_version") == "2026-08-08", "authority-layer pointer is stale")
require(authority_latest.get("live_canonical", {}).get("agent_endpoint") == "https://africanmarketos.com/mcp/preflight", "authority pointer does not use canonical MCP preflight")
require(authority_current_manifest.get("status") == "current", "current authority package is not marked current")
require(authority_current_manifest.get("supersedes") == "2026-06-03", "current authority package does not identify its predecessor")
require(authority_current_manifest.get("deployment_revision") == "2026-08-08.agent-routing-reconciliation.4", "current authority manifest revision is stale")
require(authority_current_routing.get("canonical_agent_endpoint") == "https://africanmarketos.com/mcp/preflight", "current consumer routing uses the wrong MCP endpoint")
require(authority_current_routing.get("canonical_first_tool") == "mvr_first_call", "current consumer routing uses the wrong first tool")
require(len(authority_current_routing.get("buyer_intent_routes", [])) >= 7, "current consumer routing does not cover the offer families")
require(all(route.get("offer_id") for route in authority_current_routing.get("buyer_intent_routes", [])), "consumer routes must resolve through offer IDs")
require(authority_current_answers.get("canonical_offer_registry") == "https://africanmarketos.com/.well-known/mvr-offer-registry.json", "answer-pack contract is not linked to the offer registry")
require("do not inherently require an API key" in authority_current_answers.get("routing_boundary", ""), "answer-pack contract collapses human services into API licensing")
require(authority_current_crawl.get("last_verified") == "2026-08-08", "crawl-status contract is stale")
require(authority_current_citation.get("last_verified") == "2026-08-08", "citation contract is stale")
require(authority_old_manifest.get("status") == "superseded", "June authority snapshot is not marked superseded")
require(authority_old_manifest.get("do_not_use_for_current_routing") is True, "June authority snapshot lacks a current-routing prohibition")
require(authority_old_manifest.get("superseded_by") == "../2026-08-08/manifest.json", "June authority snapshot has the wrong successor")
for archived_html in authority_old_dir.rglob("index.html"):
    require('name="robots" content="noindex,follow"' in archived_html.read_text(encoding="utf-8", errors="replace"), f"superseded HTML remains indexable: {archived_html.relative_to(ROOT)}")

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


def fetch_live(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "mvr-public-claim-ci/1.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def validate_live_surfaces() -> None:
    for url in (
        "https://africanmarketos.com/mvr-attribution.json",
        "https://africanmarketos.com/mvr-attribution.txt",
    ):
        body = fetch_live(url)
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

    benchmark_page = fetch_live("https://africanmarketos.com/benchmarks/mvr-bench/")
    require("With vs Without MVR" not in benchmark_page, "live benchmark page retains comparison framing")
    require("proof-of-value" not in benchmark_page.lower(), "live benchmark page retains proof language")

    for url in (
        "https://africanmarketos.com/.well-known/mvr-bench.json",
        "https://africanmarketos.com/v1/bench/leaderboard.json",
    ):
        live_json = json.loads(fetch_live(url))
        require("proof_of_value" not in live_json, f"live machine contract retains proof_of_value: {url}")
        fixture = live_json.get("fixture_demonstration", {})
        require("authored fixture" in fixture.get("claim_boundary", "").lower(), f"live fixture boundary missing: {url}")

    live_schema = json.loads(fetch_live("https://africanmarketos.com/benchmarks/mvr-bench/schema/leaderboard.schema.json"))
    properties = live_schema.get("properties", {})
    require("fixture_demonstration" in properties and "proof_of_value" not in properties, "live leaderboard schema retains stale proof property")

import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--live", action="store_true", help="Also verify live attribution and benchmark contract surfaces")
args = parser.parse_args()
if args.live:
    validate_live_surfaces()

print("PASS: benchmark fixtures, recomputed scores, and machine-readable license scopes are honestly bounded" + (" (local + live)" if args.live else " (local)"))
