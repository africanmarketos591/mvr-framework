# REST pauses, resume requests and per-action requirements

Applies from `2026-11-18.exact-reducer.14`.

## When a REST step pauses

A licensed REST chain runs first call, entity resolution, evidence completeness, context compile and then decision check. Each response gives the next request in `rest_next_call`.

A step may need something only the operator can supply. Examples are a claim link that is missing or contradicted, or an evidence-fit blocker such as an undeclared decision geography or field provenance. That step then pauses on purpose. Its response has no `rest_next_call`. It returns `rest_resume` instead:

| Field | Meaning |
|---|---|
| `contract_version` | `mvr.rest-resume/1` |
| `state` | `paused_for_operator_input` |
| `paused_at` | The route that paused, for example `/v1/evidence-completeness` |
| `status` | That route's status, for example `verification_required` |
| `operator_must_supply[]` | One entry per item. `requirement` says what is needed, and `supply_in` says where it goes in your own request, such as `/claims/*/support_links`, `/evidence_pack` or `/market_scope`. |
| `resume_call` | The exact next request: method, URL, headers and body. The body carries `requested_effects` and `requested_effects_sha256` unchanged. |
| `how_to_resume` | Add each item where `supply_in` says, then send `resume_call` with those fields replaced by your updated values. |
| `if_sent_unchanged` | The next route re-validates and holds the decision while the items remain open. It never authorizes an effect. |

In `strict_calibrated`, decision check requires an analysis date. If your request has none, the step before decision check names `/analysis_date` among the items (from `2026-11-18.exact-reducer.15`). The licensed MCP continuation sends the same next step, and the same items stay open there. A REST chain that follows `rest_next_call` and `resume_call` as written reaches `/v1/decision-check` with the effect digest unchanged. `conformance/effect-decision/r17/handoff-matrix.mjs` checks this on every entry path.

## When explain returns per-action requirements

`POST /v1/explain` returns `permission_requirements` in three cases, and `permission_requirements_basis` says which one applied:

| Input in `decision_result` | `permission_requirements_basis` | What each entry gives |
|---|---|---|
| The response of `/v1/effect-decision` or `mvr_effect_decision`, with its `effects` array, sent as returned | `decision_result.effects` | One entry per effect that is not planning-only: `effect_id`, action, analytical and execution states, `open_conditions` with the named step and its records, `record_needed` and closure codes |
| A terminal workflow decision with `effect_binding.requested_effects`, or `explain_target: "decision_boundary"` with forbidden actions in `action_boundary` | `workflow_decision_boundary` | One entry per consequential action, with the issuer record it needs and a verified authority check before execution |
| A `GO` whose permission was never assessed | none (the earlier contract) | The record each proposed action still needs |

An internal recommendation is planning-only, so it has no entry. None of these entries authorizes execution. Use `check_permission`, then `commit_effect`, for that.

## Named open steps on effects

Sometimes a current approval still waits for a step that its source names, such as "remain on hold until the receivables-verification and dispute protocol is approved". Each affected effect then carries `open_conditions[]`. Each entry has the step as written, the `record_ids` that state it, the `claim_ids`, any `source_locators`, the `required_record` that would close it and the `accountable_role`. The effect's `smallest_decisive_closure` gives `COMPLETE_NAMED_CONDITION` with `required_steps`. The step stays named after a reviewer accepts or qualifies the record, because acceptance does not complete it.

## Reviewer verification on audit routes

When a route returns claims with `support_status`, `route_audit_result.verification` reports reviewer verification separately from `route_audit_result.controlling`. Its contract is `mvr.claim-verification-state/1`, and its `status` is one of `reviewer_verified`, `reviewer_verification_pending`, `unsupported_claims_present` or `contradicted`. Read `controlling` for the requested use. Board release and execution also need `verification.status` to be `reviewer_verified`.
