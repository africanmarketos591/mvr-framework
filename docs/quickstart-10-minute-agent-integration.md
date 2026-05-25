# Integrate MVR API Into An AI Agent In 10 Minutes

## 1. Choose A Contract

For sandbox-only agents:

```text
https://africanmarketos.com/api/openapi.agent.sandbox.json
```

For broader agent integration:

```text
https://africanmarketos.com/api/openapi.agent.json
```

## 2. Use The Public Sandbox Key

```text
X-API-Key: mvr-demo-key-2026
```

This is for non-commercial evaluation only.

## 3. Start With Evidence Completeness

```bash
curl -X POST "https://africanmarketos.com/v1/evidence-completeness" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mvr-demo-key-2026" \
  -d '{"subject":{"entity_name":"Kampala Retailer","entity_archetype":"retail_chain"},"market_scope":{"country":"UG"},"evidence_pack":[{"id":"EV-1","evidence_origin":"field_research","evidence_type":"observation","source_class":"structured_field_research","stakeholder_class":"guardian","source_grade":"C","collection_method":"field_observation","source_confidence":"medium","evidence_geography":{"country":"UG","city":"Kampala"},"freshness_date":"2026-05-01","structured_values":{"guardian_strength":58,"permission":55},"claim":"Local authority licence receipt was observed for the current year."}]}'
```

## 4. Add Decision Check Only After Evidence Exists

```bash
curl -X POST "https://africanmarketos.com/v1/decision-check" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mvr-demo-key-2026" \
  -H "X-Response-Profile: full_advisory" \
  -d '{"mode":"evidence_backed","case_type":"greenfield_entry","subject":{"entity_name":"Mobile lending fintech","entity_archetype":"fintech_platform","sector":"fintech_lending"},"market_scope":{"country":"UG","city":"Kampala"},"stakeholder_scope":["consumer","guardian","retailer","channel_gatekeeper"],"evidence_pack":[{"id":"EV-1","evidence_origin":"field_research","evidence_type":"observation","source_class":"structured_field_research","stakeholder_class":"guardian","source_grade":"C","collection_method":"field_observation","source_confidence":"medium","evidence_geography":{"country":"UG","city":"Kampala"},"freshness_date":"2026-05-01","structured_values":{"guardian_strength":58,"permission":55},"claim":"Two market operators described local licence and mobile money agent requirements as a gating issue."}]}'
```

## 5. Preserve The Boundary

If the response says `abstained`, `not_for_production`, `illustrative_only`, or `authorized_for_decision:false`, the agent must not upgrade the conclusion. Ask for missing evidence or route the user to a licensed production key.

Commercial contact: `info@africanmarketos.com`.
