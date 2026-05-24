"""Minimal MVR API example.

This is a working sandbox-safe example, not a production SDK. For production,
set MVR_API_KEY to a tenant key issued by African Market OS.
"""

import os
import requests

BASE_URL = os.getenv("MVR_BASE_URL", "https://africanmarketos.com")
API_KEY = os.getenv("MVR_API_KEY", "mvr-demo-key-2026")

payload = {
    "subject": {
        "entity_name": "Sandbox Kampala catering operator",
        "entity_archetype": "retail_chain",
        "country": "UG",
    },
    "market_scope": {
        "country": "UG",
        "city": "Kampala",
        "sector": "catering",
        "analysis_date": "2026-05-24",
    },
    "stakeholder_scope": ["guardian", "consumer", "retailer"],
    "target_verdict": "pilot_ready",
    "evidence_pack": [
        {
            "id": "ev-licence-001",
            "evidence_type": "public_filing",
            "entity_archetype": "retail_chain",
            "source_class": "administrative_record",
            "source_grade": "B",
            "stakeholder_class": "guardian",
            "guardian_tier": "micro_street",
            "evidence_origin": "field_research",
            "collection_method": "direct",
            "source_confidence": "medium",
            "freshness_date": "2026-05-20",
            "evidence_geography": {"country": "UG", "city": "Kampala"},
            "structured_values": {"guardian_strength": 72, "permission": 68},
            "privacy_envelope": {
                "contains_pii": False,
                "contains_sensitive_personal_data": False,
                "consent_basis": "not_applicable",
                "retention_class": "90d",
                "redaction_status": "minimized",
                "safe_for_modeling": True,
            },
            "provenance_ledger": {
                "source_family": "trade_license",
                "source_locator": "KCCA trading licence receipt, 2026 renewal",
                "extraction_method": "human",
                "extraction_confidence": 0.8,
                "compiler_stage": "sandbox_demo",
            },
        },
        {
            "id": "ev-telemetry-001",
            "evidence_type": "telemetry",
            "entity_archetype": "retail_chain",
            "source_class": "telemetry_internal",
            "source_grade": "C",
            "stakeholder_class": "consumer",
            "evidence_origin": "platform_telemetry",
            "collection_method": "corporate_telemetry",
            "source_confidence": "medium",
            "freshness_date": "2026-05-21",
            "evidence_geography": {"country": "UG", "city": "Kampala"},
            "structured_values": {
                "trust": 63,
                "continuity": 61,
                "repeat_purchase_rate_90d": 58,
            },
            "privacy_envelope": {
                "contains_pii": False,
                "contains_sensitive_personal_data": False,
                "consent_basis": "legitimate_interest",
                "retention_class": "90d",
                "redaction_status": "aggregated",
                "safe_for_modeling": True,
            },
            "provenance_ledger": {
                "source_family": "mobile_money_statement",
                "source_locator": "30-day mobile money sales summary, aggregated",
                "extraction_method": "deterministic_parser",
                "extraction_confidence": 0.72,
                "compiler_stage": "sandbox_demo",
            },
        },
    ],
}

response = requests.post(
    f"{BASE_URL}/v1/evidence-completeness",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
        "X-Response-Profile": "full_advisory",
    },
    json=payload,
    timeout=90,
)

response.raise_for_status()
result = response.json()

print("status:", result.get("status"))
print("sandbox:", result.get("response_meta", {}).get("environment") == "sandbox")
print("not_for_production:", result.get("response_meta", {}).get("not_for_production"))
