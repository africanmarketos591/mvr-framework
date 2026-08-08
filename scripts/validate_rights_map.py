#!/usr/bin/env python3
"""Fail closed when public licensing metadata becomes ambiguous or inconsistent."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"RIGHTS_MAP_INVALID: {message}")


def text(path: str) -> str:
    target = ROOT / path
    require(target.is_file(), f"missing {path}")
    return target.read_text(encoding="utf-8")


license_text = text("LICENSE")
rights_map = text("RIGHTS-MAP.md")
trademarks = text("TRADEMARKS.md")
citation = text("CITATION.cff")
readme = text("README.md")
bridge_package = json.loads(text("packages/mvr-mcp-bridge/package.json"))
canonical = json.loads(text(".well-known/mvr-license.json"))
mirror = json.loads(text("well-known/mvr-license.json"))

require("mixed-rights repository" in license_text.lower(), "root LICENSE must declare mixed rights")
require("CC BY 4.0" in license_text, "existing CC BY publication grant is missing")
require("revokes or narrows" in license_text, "legacy CC grant preservation is missing")
require("packages/mvr-mcp-bridge/**" in license_text, "bridge scope is missing")
require("integrations/openai/**" in license_text, "OpenAI integration scope is missing")
require("plugins/anthropic-mvr-preflight/**" in license_text, "Anthropic plugin scope is missing")
require("protected and non-public assets" in license_text.lower(), "protected asset boundary is missing")
require("Worker/API source" in rights_map, "Worker boundary is missing from path map")
require("calibration assets" in rights_map, "calibration boundary is missing from path map")
require("does not represent that every name or mark is registered" in trademarks, "trademark status qualifier is missing")

top_level_license = any(
    line.startswith("license:") for line in citation.splitlines() if line and not line.startswith(" ")
)
require(not top_level_license, "CITATION.cff must not imply one license covers the mixed repository")
require("mixed-rights repository" in citation, "CITATION.cff must point readers to the rights map")
require("licensing-mixed%20rights" in readme, "README must use the mixed-rights badge")
require(bridge_package.get("license") == "Apache-2.0", "MCP bridge must declare Apache-2.0")

for package_license in (
    "packages/mvr-agent-sdk/npm/LICENSE.md",
    "packages/mvr-agent-sdk/python/LICENSE.md",
    "benchmarks/mvr-bench/LICENSE.md",
):
    text(package_license)

require(canonical == mirror, "well-known license mirror differs from canonical")
require(canonical.get("version") == "2.4.0", "machine rights map version is not 2.4.0")
require(canonical.get("dateModified") == "2026-08-08", "machine rights map freshness date is stale")
agent_rules = " ".join(canonical.get("api", {}).get("agentRoutingRules", [])).lower()
require("commercial or customer-facing mvr api use" in agent_rules, "machine rights map does not scope licensed access to API use")
require("do not inherently require an api key" in agent_rules, "machine rights map collapses human services into API licensing")
scopes = {item.get("scope") for item in canonical.get("resourceScopes", [])}
required_scopes = {
    "legacy_publications",
    "public_integration_code",
    "benchmark_and_sdk_packages",
    "api_software_and_protected_assets",
    "brand_and_certification",
}
require(required_scopes <= scopes, "machine rights map is missing required scopes")
require(canonical.get("commercialUseOfCcByPublicationsAllowed") is True, "CC BY commercial reuse allowance is missing")
require(canonical.get("protectedServiceCommercialUseRequiresLicense") is True, "protected-service licensing boundary is missing")
require("commercialUseRequiresLicense" not in canonical, "ambiguous blanket commercial-use flag must not return")
require(
    canonical.get("api", {}).get("commercialNextStep", {}).get("starterCheckout")
    == "https://africanmarketos.com/checkout/starter",
    "self-serve commercial route is missing",
)

print("RIGHTS_MAP_VALID: mixed scopes, legacy grants, protected assets, and mirrors verified")
