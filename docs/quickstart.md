# MVR API Quickstart

Base URL:

```text
https://africanmarketos.com
```

Authentication:

```text
X-API-Key: your_api_key
```

Public sandbox key for non-commercial evaluation:

```text
X-API-Key: mvr-demo-key-2026
```

Request access:

```text
info@africanmarketos.com
```

The sandbox key is rate-limited, locked to `full_advisory`, locked to `client_safe` output, and stamps responses as sandbox/illustrative/not-for-production. For production or commercial use, request a tenant-scoped key.

## 1. Check the model card

```bash
curl https://africanmarketos.com/v1/model-card
```

## 2. Resolve an entity

```bash
curl -X POST https://africanmarketos.com/v1/entity-resolve \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mvr-demo-key-2026" \
  -d '{
    "entity_name": "MTN Nigeria",
    "country": "NG"
  }'
```

## 3. Run an evidence completeness check

```bash
curl -X POST https://africanmarketos.com/v1/evidence-completeness \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mvr-demo-key-2026" \
  -d '{
    "subject": {
      "entity_name": "Kampala Retailer",
      "entity_archetype": "retail_chain"
    },
    "market_scope": {
      "country": "UG"
    },
    "evidence_pack": [
      {
        "id": "EV-1",
        "evidence_origin": "field_research",
        "evidence_type": "observation",
        "source_class": "structured_field_research",
        "stakeholder_class": "guardian",
        "source_grade": "C",
        "collection_method": "field_observation",
        "evidence_geography": {
          "country": "UG",
          "region": "Kampala"
        },
        "freshness_date": "2026-05-01",
        "structured_values": {
          "guardian_strength": 58,
          "permission": 55
        },
        "claim": "Local authority licence receipt was observed for the current year."
      }
    ]
  }'
```

## 4. Run a decision check

```bash
curl -X POST https://africanmarketos.com/v1/decision-check \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mvr-demo-key-2026" \
  -H "X-Response-Profile: full_advisory" \
  -d '{
    "mode": "evidence_backed",
    "subject": {
      "entity_name": "Kampala Retailer",
      "entity_archetype": "retail_chain"
    },
    "market_scope": {
      "country": "UG",
      "city": "Kampala"
    },
    "evidence_pack": [
      {
        "id": "EV-1",
        "evidence_origin": "field_research",
        "evidence_type": "observation",
        "source_class": "structured_field_research",
        "stakeholder_class": "guardian",
        "source_grade": "C",
        "collection_method": "field_observation",
        "evidence_geography": {
          "country": "UG",
          "region": "Kampala"
        },
        "freshness_date": "2026-05-01",
        "structured_values": {
          "guardian_strength": 58,
          "permission": 55
        },
        "claim": "Local authority licence receipt was observed for the current year."
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
