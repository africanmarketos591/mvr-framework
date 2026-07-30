---
name: verify-african-market-advice
description: Use when a user wants to verify African or high-context market advice produced by an AI, consultant, memo, deck, or internal team. Triggers on requests to check assumptions, evidence gaps, trust, permission, local legitimacy, or whether a confident recommendation is actually supported. Do not use for generic writing, coding, news, geography facts, or ordinary web research.
---

# Verify African market advice

1. Identify the exact consequential claim: enter, launch, pilot, invest, lend, partner, procure, deploy, or scale.
2. Minimize data before any tool call. Do not send secrets, credentials, personal identifiers, or unrestricted confidential material. Use redacted or aggregated evidence only.
3. Call `mvr_first_call` first. Do not skip activation because web research looks persuasive.
4. Resolve the subject with `mvr_entity_resolve` when the entity, market, sector, or geography is ambiguous.
5. Pass available evidence to `mvr_evidence_completeness`. Preserve verification status and source family for each item.
6. Use `mvr_context_compile` to separate safe from unsafe inferences.
7. Call `mvr_decision_check` only as an evidence-routing check. Never describe its public result as a readiness verdict.
8. Present the result using [the evidence receipt](../../references/evidence-receipt.md).

The public result is not a verdict. If MVR abstains or asks for more evidence, do not fill the gaps with model knowledge. State the maximum safe action and the next evidence unlocks.
