---
name: check-partner-evidence
description: Use when a user is screening an African-market distributor, local partner, intermediary, supplier, implementer, or channel and needs to distinguish legal existence from evidence of trust, stakeholder acceptance, operating capability, and permission. Do not treat MVR as a company-registry, sanctions, legal, or credit check.
---

# Check distributor or partner evidence

1. Define the intended reliance: introduction, pilot, distribution, implementation, custody of funds, exclusivity, or scale.
2. Call `mvr_first_call` before recommending the partner.
3. Resolve the entity and exact target geography with `mvr_entity_resolve`.
4. Check evidence completeness across independent source families and relevant stakeholders. Legal registration alone is not evidence of operating trust or permission.
5. Compile contradictions, safe inferences, and unsupported claims.
6. Use `mvr_decision_check` as a non-authorizing routing check.
7. Report gaps that require licensed legal, sanctions, financial, regulatory, or human diligence outside MVR.

The public result is not a verdict. Never turn a clean registry result, founder reference, or one successful pilot into authorization for exclusivity, capital exposure, lending, or scale.
