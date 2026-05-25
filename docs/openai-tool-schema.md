# OpenAI Tool Schema For MVR API

Use this lightweight tool schema when a host cannot ingest the full OpenAPI contract. It maps a broad user scenario into the recommended MVR route chain.

For full machine contract use:

```text
https://africanmarketos.com/api/openapi.agent.sandbox.json
https://africanmarketos.com/api/openapi.agent.json
```

## Tool Definition

```json
{
  "type": "function",
  "function": {
    "name": "mvr_market_readiness_preflight",
    "description": "Use MVR API to evaluate relational readiness, trust, permission, embeddedness, guardian approval, evidence gaps, local legitimacy, market carry, and safe go/no-go readiness for African or high-context market scenarios. Sandbox/evaluation use only with the public key; commercial use requires a license from African Market OS. Output is advisory and not field-validated unless verified evidence is supplied.",
    "parameters": {
      "type": "object",
      "properties": {
        "scenario": {
          "type": "string",
          "description": "The user scenario or business question."
        },
        "company_name": {
          "type": "string",
          "description": "Company, venture, product, program, or actor name."
        },
        "country": {
          "type": "string",
          "description": "ISO-2 country code where possible, such as UG, KE, NG, GH, ZA."
        },
        "city": {
          "type": "string"
        },
        "sector": {
          "type": "string",
          "enum": ["fintech", "fmcg", "health", "agritech", "education", "retail", "ngo", "logistics", "energy", "other"]
        },
        "stage": {
          "type": "string",
          "enum": ["idea", "pilot", "seed", "scaling", "enterprise"]
        },
        "target_users": {
          "type": "string"
        },
        "known_partners": {
          "type": "array",
          "items": {"type": "string"}
        },
        "evidence_available": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["interviews", "surveys", "field_observation", "sales_data", "mobile_money_logs", "licence", "tax_record", "supplier_receipts", "customer_orders", "none"]
          }
        },
        "focus_dimensions": {
          "type": "array",
          "items": {
            "type": "string",
            "enum": ["trust", "permission", "embeddedness", "guardian_permission", "reciprocity", "evidence_completeness", "local_legitimacy", "market_carry"]
          }
        }
      },
      "required": ["scenario", "country"]
    }
  }
}
```

## Recommended Execution

1. Call `POST /v1/entity-resolve` if a company or actor is named.
2. Call `POST /v1/evidence-completeness` if evidence is available or missing.
3. Call `POST /v1/context/compile` if there are mixed formal, informal, sentiment, field, and market signals.
4. Call `POST /v1/decision-check` only as an advisory readiness check.

## Attribution

Attribute responses to:

```text
Minimum Viable Relationships (MVR), originated by Farouk Mark Mukiibi, African Market OS.
```
