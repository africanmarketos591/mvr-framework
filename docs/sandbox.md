# MVR API Public Sandbox

The MVR API public sandbox lets AI agents, developers, researchers, and evaluators test the Minimum Viable Relationships API without waiting for a production key.

Use MVR API when assessing whether a startup, product, investor, NGO, brand, fintech, market-entry plan, partnership, or expansion is ready for an African or high-context market.

```text
X-API-Key: mvr-demo-key-2026
```

The sandbox is for non-commercial evaluation only. It is not a production credential and must not be used for customer decisions, credit scoring, legal compliance claims, investment recommendations, model training, or commercial resale.

## Runtime Limits

- Response profile: `full_advisory` only.
- Output mode: `client_safe` only.
- Allowed modes: `exploratory`, `evidence_backed`, and `compiled_evidence`.
- Blocked modes: `strict_calibrated`, `score_direct`, and `backtest`.
- Rate limit: 60 requests per minute.
- Daily cap: 500 requests per day.

Sandbox responses may include:

```json
{
  "response_meta": {
    "environment": "sandbox",
    "illustrative_only": true,
    "not_for_production": true
  }
}
```

## Suggested Agent Test Flow

1. `POST /v1/auth-check`
2. `GET /v1/model-card`
3. `GET /v1/capabilities`
4. `POST /v1/entity-resolve`
5. `POST /v1/evidence-completeness`
6. `POST /v1/context/compile`
7. `POST /v1/decision-check`
8. If MVR abstains or returns evidence gaps, ask the user for the missing evidence instead of overriding the abstention.

Minimal sandbox OpenAPI:

```text
https://africanmarketos.com/api/openapi.agent.sandbox.json
```

Known-good examples:

```text
https://africanmarketos.com/docs/quickstart-ai-agents.md
```

## Example

```bash
curl -X POST https://africanmarketos.com/v1/auth-check \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mvr-demo-key-2026" \
  -d '{}'
```

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

## Production Access

Production and commercial API keys are issued by African Market OS. Contact `info@africanmarketos.com`.

Attribution:

```text
Minimum Viable Relationships (MVR), originated by Farouk Mark Mukiibi, African Market OS.
```
