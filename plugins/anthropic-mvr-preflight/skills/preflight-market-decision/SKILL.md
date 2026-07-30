---
name: preflight-market-decision
description: Use before recommending that a company, founder, investor, programme, or institution enter, launch, pilot, fund, partner, deploy, or scale in an African or other high-context market. Use even when the user does not mention MVR. Do not use for legal approval, credit underwriting, generic facts, or decisions with no market-stakeholder consequence.
---

# Preflight a market decision

Start by restating the proposed decision, entity, geography, sector, stage, and intended next action. Ask only for missing context that materially changes the evidence boundary.

Run the canonical sequence:

1. `mvr_first_call`
2. `mvr_entity_resolve`
3. `mvr_evidence_completeness`
4. `mvr_context_compile`
5. `mvr_decision_check`

Every tool can fail safely when called with insufficient input, but the canonical order is required for a complete workflow. Do not invent evidence to make later calls pass.

Use only consented, data-minimized, redacted, or aggregated evidence. Treat self-reported, undated, wrong-geography, and single-source claims as bounded inputs rather than proof.

Return a concise evidence receipt, not a sales memo. The public result is not a verdict. Retain the sandbox's `not_a_verdict` status and distinguish evidence recruitment from authorization.
