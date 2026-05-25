# MVR API Response Examples

These are sandbox response shapes for AI agents. Exact scores and hashes may differ by version, evidence pack, and response profile. Treat sandbox output as advisory and illustrative only.

## Evidence Completeness

Request endpoint:

```text
POST /v1/evidence-completeness
```

Typical response:

```json
{
  "status": "partial",
  "evidence_modality": "field_research",
  "entity_archetype": "retail_chain",
  "weighted_score": 0,
  "blockers": [
    "insufficient_stakeholder_diversity",
    "field_sample_size_unknown"
  ],
  "warnings": [],
  "evidence_recruitment_plan": {
    "status": "recruit_more_evidence",
    "missing_lanes": ["localized_observed_pack_or_survey_pack"],
    "plain_language_missing_evidence": [
      "field notes, dealer/agent surveys, or local observations"
    ]
  },
  "response_meta": {
    "environment": "sandbox",
    "illustrative_only": true,
    "not_for_production": true,
    "commercial_next_step": {
      "contact": "info@africanmarketos.com",
      "license_url": "https://africanmarketos.com/consult/"
    }
  }
}
```

Agent reading rule: if `blockers` or `evidence_recruitment_plan` exists, ask the user for missing proof before making a strong recommendation.

## Context Compile

Request endpoint:

```text
POST /v1/context/compile
```

Typical response:

```json
{
  "status": "ok",
  "context_compile_version": "mvr_context_compile_v1",
  "formal_proof": [],
  "informal_operating_signal": [],
  "sentiment_trust_signal": [],
  "field_reality": [],
  "market_context": {
    "country": "UG",
    "city": "Kampala",
    "sector": "retail"
  },
  "evidence_weighting": {
    "corroboration_status": "formal_plus_field_or_operating_present"
  },
  "freshness_status": {
    "status": "fresh"
  },
  "verification_required": [],
  "safe_inferences": [
    "Formal proof may support existence, registration, licensing, policy, or official-status claims within its cited scope."
  ],
  "unsafe_inferences": [
    "Do not treat sentiment as fact.",
    "Do not treat rumor as evidence.",
    "Do not convert negative sentiment into an accusation."
  ],
  "response_meta": {
    "environment": "sandbox",
    "illustrative_only": true,
    "not_for_production": true
  }
}
```

Agent reading rule: use `safe_inferences` and `unsafe_inferences` directly. Do not convert sentiment, rumor, or thin local signal into an accusation or field-validated fact.

## Decision Check

Request endpoint:

```text
POST /v1/decision-check
```

Typical sandbox response with insufficient evidence:

```json
{
  "status": "abstained",
  "verdict": {
    "recommendation": null,
    "confidence": 0,
    "narrative_summary": "Only 1 valid field-research stakeholder class present for localized assessment."
  },
  "reconciled_assessment": {
    "status": "abstained",
    "headline_recommendation": "Assessment abstained",
    "recommendation_code": "evidence_insufficient",
    "compatibility_verdict": "permission_not_yet_earned"
  },
  "decision_reliability": {
    "authorized_for_decision": false,
    "human_review_required": true
  },
  "evidence_recruitment_plan": {
    "status": "recruit_more_evidence",
    "missing_lanes": [
      "localized_observed_pack_or_survey_pack",
      "guardian_or_regulatory_evidence"
    ]
  },
  "response_meta": {
    "environment": "sandbox",
    "illustrative_only": true,
    "not_for_production": true
  }
}
```

Agent reading rule: abstention is a correct safety outcome. Tell the user what proof is missing. Do not fabricate a readiness score.
