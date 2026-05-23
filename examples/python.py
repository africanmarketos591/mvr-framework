import os
import requests

api_key = os.environ["MVR_API_KEY"]

response = requests.post(
    "https://africanmarketos.com/v1/decision-check",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": api_key,
        "X-Response-Profile": "full_advisory",
    },
    json={
        "mode": "evidence_backed",
        "entity_archetype": "retail_chain",
        "country": "UG",
        "market_scope": {"country": "UG", "city": "Kampala"},
        "evidence_pack": [
            {
                "evidence_type": "regulatory_filing",
                "stakeholder_class": "guardian",
                "source_grade": "B",
                "freshness_date": "2026-05-01",
                "claim": "Trading licence was paid for the current year.",
            }
        ],
    },
    timeout=90,
)

response.raise_for_status()
print(response.json())

