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

## Closing a named step

Applies from `2026-11-18.exact-reducer.16`. A named step is closed by one check, whether the step is named in a record's text or given as a typed `conditions[]` entry with `type: "prerequisite"`. A record completes the step only when all of the following hold:

1. It names that exact step.
2. It states the step as done, not promised, pending, refused or withdrawn.
3. It is dated on or after the record that set the condition, or after the date the condition states.
4. It is not dated after the analysis date.
5. It comes from the required issuer. That is the body the condition names after "by", or otherwise the body that set the condition.
6. No later record withdraws it.

A typed `satisfied_by_evidence_id` is unverified until its record passes this check. Until then the condition stays `unmet`, with `satisfied_by_unverified` and `completion_check.reason`. The reason is one of:

- `COMPLETION_RECORD_NOT_SUPPLIED`
- `COMPLETION_STEP_MISMATCH`
- `COMPLETION_NOT_STATED_AS_DONE`
- `COMPLETION_BEFORE_CONDITION`
- `COMPLETION_ISSUER_MISMATCH`
- `COMPLETION_WITHDRAWN`
- `COMPLETION_DATE_MISSING`
- `COMPLETION_AFTER_ANALYSIS_DATE`
- `COMPLETION_AFTER_DEADLINE`

Each effect's `open_conditions[]` gives one entry per step, with `status` set to `open` or `completed` and the `completion_check`. Entries come from every non-adverse load-bearing claim, so a step stays visible when a missing record controls the headline. Closing a step changes the analytical state only. It never authorizes execution.

## Strict calibration refusal

In `strict_calibrated`, `/v1/evidence-audit` refuses a numeric audit it cannot calibrate, with HTTP 422. The body carries `capability_outcome` (`mvr.capability-outcome/1`):

- `status`: `calibrated_assessment_unavailable`
- `reason`
- `completed_checks` and `not_completed`
- `supported_alternative`, which is the same route under `full_advisory`

It is neither a finding nor a pass.

## When explain has no effect map

When `decision_result` carries neither `effects` nor an effect binding, nor a forbidden-action list, `/v1/explain` returns `permission_requirements_status`, with `status: "not_derivable_from_input"` and `reason: "DECISION_RESULT_HAS_NO_EFFECT_MAP"`. Its `handoff` points to `/v1/effect-decision`: send the same requested effects, claims and evidence there, then pass that response to explain.

## First calls that state they are internal

Applies from `.16`. A first call ends with `status: "not_relevant"` and `continuation_disposition: "terminal"` when all of these hold:

- its own text says there is no market action, market decision or permission question, or that the work is internal only;
- no market act appears in the rest of the text;
- the relevance router finds only internal effects.

Attached claims and evidence are not assessed.

## Signed statements and clock skew

Signed applicability statements carry their issuance time. A client whose clock runs behind the server can see a statement as not yet valid for a few hundred milliseconds. Fail closed: wait until the stated issuance time and verify again. Never accept a statement before its validity window opens.

## Observer acceptance levels

`conformance/receiver-kit/observer-verify.mjs` returns `acceptance_level`:

| Level | When |
|---|---|
| `journal_attested` | The receiver journal is present, every entry is signed by the run key, and each signed outcome, reason, commit and count matches exactly one scenario row and the store |
| `unsigned_reconstruction` | No journal; the records reconstruct consistently but no run signature attests them. A signed-attestation gate must not accept this. |
| `rejected` | Any check failed |

`--require-journal` turns a missing journal into a failure.
