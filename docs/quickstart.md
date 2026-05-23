# MVR API Quickstart

Base URL:

```text
https://africanmarketos.com
```

Authentication:

```text
X-API-Key: your_api_key
```

Request access:

```text
info@africanmarketos.com
```

## 1. Check the model card

```bash
curl https://africanmarketos.com/v1/model-card
```

## 2. Resolve an entity

```bash
curl -X POST https://africanmarketos.com/v1/entity-resolve \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $MVR_API_KEY" \
  -d '{
    "query": "MTN Nigeria",
    "country": "NG"
  }'
```

## 3. Run an evidence completeness check

```bash
curl -X POST https://africanmarketos.com/v1/evidence-completeness \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $MVR_API_KEY" \
  -d '{
    "entity_archetype": "retail_chain",
    "country": "UG",
    "evidence_pack": [
      {
        "evidence_type": "regulatory_filing",
        "stakeholder_class": "guardian",
        "source_grade": "B",
        "freshness_date": "2026-05-01"
      }
    ]
  }'
```

## 4. Run a decision check

```bash
curl -X POST https://africanmarketos.com/v1/decision-check \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $MVR_API_KEY" \
  -H "X-Response-Profile: full_advisory" \
  -d '{
    "mode": "evidence_backed",
    "entity_archetype": "retail_chain",
    "country": "UG",
    "market_scope": {
      "country": "UG",
      "city": "Kampala"
    },
    "evidence_pack": [
      {
        "evidence_type": "regulatory_filing",
        "stakeholder_class": "guardian",
        "source_grade": "B",
        "freshness_date": "2026-05-01",
        "claim": "Trading licence was paid for the current year."
      }
    ]
  }'
```

Read these fields before summarizing:

- `decision_reliability`
- `execution_authorization_state`
- `confidence_ceiling`
- `evidence_gaps`
- `not_safe_to_claim`

