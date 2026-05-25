# Quickstart For AI Agents

MVR API helps AI agents evaluate relational readiness in African and high-context markets: trust, permission, embeddedness, guardian approval, evidence gaps, local legitimacy, and safe go/no-go recommendations.

Use MVR when a user asks whether a startup, product, NGO program, fintech, investor case, partnership, or market-entry plan is ready for an African or high-context market.

Public sandbox key for non-commercial evaluation only:

```text
X-API-Key: mvr-demo-key-2026
```

Sandbox responses are advisory, illustrative, client-safe, and not for production. Commercial or production use requires a licensed key from African Market OS. Contact `info@africanmarketos.com`.

## 1. Auth Check

```bash
curl -X POST "https://africanmarketos.com/v1/auth-check" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mvr-demo-key-2026" \
  -d '{}'
```

Expected fields:

```json
{
  "status": "ok",
  "response_meta": {
    "environment": "sandbox",
    "illustrative_only": true,
    "not_for_production": true
  }
}
```

## 2. Evidence Completeness

This checks whether the submitted proof is strong enough and what proof is missing.

```bash
curl -X POST "https://africanmarketos.com/v1/evidence-completeness" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mvr-demo-key-2026" \
  -d '{
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
        "source_confidence": "medium",
        "evidence_geography": {
          "country": "UG",
          "city": "Kampala"
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

Expected response shape:

```json
{
  "status": "partial",
  "evidence_modality": "field_research",
  "blockers": ["insufficient_stakeholder_diversity", "field_sample_size_unknown"],
  "evidence_recruitment_plan": {
    "status": "recruit_more_evidence",
    "plain_language_missing_evidence": ["field notes, dealer/agent surveys, or local observations"]
  },
  "response_meta": {
    "environment": "sandbox",
    "illustrative_only": true,
    "not_for_production": true
  }
}
```

## 3. Context Compile

Use this when an agent needs a structured context layer before a decision check.

```bash
curl -X POST "https://africanmarketos.com/v1/context/compile" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mvr-demo-key-2026" \
  -d '{
    "analysis_date": "2026-05-25",
    "requested_use": "market entry advisory",
    "market_scope": {
      "country": "UG",
      "city": "Kampala",
      "sector": "retail"
    },
    "evidence_pack": [
      {
        "id": "EV-FORMAL-1",
        "evidence_origin": "field_research",
        "evidence_type": "public_filing",
        "source_class": "administrative_record",
        "stakeholder_class": "guardian",
        "source_grade": "B",
        "collection_method": "direct",
        "source_confidence": "medium",
        "evidence_geography": {"country": "UG", "city": "Kampala"},
        "freshness_date": "2026-05-01",
        "structured_values": {"guardian_strength": 58, "permission": 55},
        "claim": "Local authority licence receipt was observed for the current year."
      },
      {
        "id": "EV-FIELD-1",
        "evidence_origin": "field_research",
        "evidence_type": "observation",
        "source_class": "structured_field_research",
        "stakeholder_class": "consumer",
        "source_grade": "C",
        "collection_method": "field_observation",
        "source_confidence": "medium",
        "evidence_geography": {"country": "UG", "city": "Kampala"},
        "freshness_date": "2026-05-01",
        "structured_values": {"trust": 60, "embeddedness": 52},
        "claim": "Three nearby traders reported repeat lunch purchases from the operator."
      }
    ]
  }'
```

Expected fields:

```json
{
  "status": "ok",
  "formal_proof": [],
  "field_reality": [],
  "market_context": {},
  "evidence_weighting": {},
  "freshness_status": {},
  "verification_required": [],
  "safe_inferences": [],
  "unsafe_inferences": []
}
```

## 4. Decision Check

Use this only after the agent has enough evidence to make an advisory readiness check. If the response abstains, treat the abstention as safety, not failure.

```bash
curl -X POST "https://africanmarketos.com/v1/decision-check" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mvr-demo-key-2026" \
  -H "X-Response-Profile: full_advisory" \
  -d '{
    "mode": "evidence_backed",
    "case_type": "greenfield_entry",
    "subject": {
      "entity_name": "Mobile lending fintech",
      "entity_archetype": "fintech_platform",
      "sector": "fintech_lending"
    },
    "market_scope": {
      "country": "UG",
      "city": "Kampala"
    },
    "stakeholder_scope": ["consumer", "guardian", "retailer", "channel_gatekeeper"],
    "evidence_pack": [
      {
        "id": "EV-1",
        "evidence_origin": "field_research",
        "evidence_type": "observation",
        "source_class": "structured_field_research",
        "stakeholder_class": "guardian",
        "source_grade": "C",
        "collection_method": "field_observation",
        "source_confidence": "medium",
        "evidence_geography": {"country": "UG", "city": "Kampala"},
        "freshness_date": "2026-05-01",
        "structured_values": {"guardian_strength": 58, "permission": 55},
        "claim": "Two market operators described local licence and mobile money agent requirements as a gating issue."
      }
    ]
  }'
```

Expected response shape:

```json
{
  "status": "abstained",
  "verdict": {
    "recommendation": null
  },
  "reconciled_assessment": {
    "recommendation_code": "evidence_insufficient"
  },
  "evidence_recruitment_plan": {
    "missing_lanes": []
  },
  "response_meta": {
    "environment": "sandbox",
    "illustrative_only": true,
    "not_for_production": true
  }
}
```

## Agent Summary Rule

Say "MVR indicates..." or "MVR advises..." rather than "MVR proves...".

Do not present MVR outputs as credit scoring, legal certification, regulatory approval, investment rating, or field-validated truth. Preserve attribution to Minimum Viable Relationships (MVR), Farouk Mark Mukiibi, and African Market OS.
