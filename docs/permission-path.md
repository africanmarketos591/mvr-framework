# Permission path

Release `2026-10-25.permission-path.3`. AMOS answers one question for a proposed effect: for this exact actor, action, place, amount and time, which permission level applies now, what is still allowed, and what is the smallest set of accountable acts that would change the answer. AMOS never issues authority. Every answer is a current reading of records that institutions signed and reviewers recorded.

## Permission levels

| Level | Meaning |
| --- | --- |
| `prohibited` | A current signed issuer record prohibits, suspends or revokes this action for this subject and place. Only that issuer can change it. |
| `not_permitted` | No current basis permits even internal planning (for example the case is withdrawn, expired or its dependencies are unavailable). |
| `planning_only` | Internal planning, pilot design or reporting may proceed. No institution capability covers the external effect. |
| `conditionally_permitted` | An institution-signed capability covers this kind of effect, but listed conditions remain open. |
| `permitted_up_to_ceiling` | A current capability covers the effect only up to an amount; the same effect within the ceiling verifies now. |
| `fully_permitted` | A current institution-signed capability covers this exact effect now. The bound executor must still re-check at commit time. |

A hold is never only "no". Every answer names the narrowest action still allowed and the closure path.

## Exact effect: `check_permission`

`POST /v1/authority-chain` with `{"action":"check_permission","case_id":"RC-…","requested_effect":{…},"geography":"UG"}`. Read-only; any workspace account may call it. `requested_effect` has the same shape as for `verify_capability`.

AMOS re-reads every capability indexed to the case and evaluates each with the same function `verify_capability` uses, without reserving a use. Each deny reason maps to one accountable act (for example: an independent credentialed reviewer replaces a revoked closure, the institution accepts an open residual in a new capability, or AMOS activates its production authority registry). The closure path is the covering capability with the fewest distinct acts, with alternatives. A replacement closure that also clears its residual counts once.

The response also returns `dependency_graph`: the case, capabilities, institution keys, residual closures and issuer records it re-read, with their states. A revoked or expired node changes the next answer.

When no capability covers the effect, AMOS states both options: one institution capability that explicitly accepts every open residual (fewest acts), or independent closures of each residual followed by the capability.

In production, institution-signed capabilities also need AMOS production authority activation (the named-person key ceremony), and the closure path says so.

## Case level and analysis level

Every review case now carries `review_progress.permission_position`: the level without a specific effect, what may proceed internally, and what unlocks external permission.

The five decision routes (`first-call`, `entity-resolve`, `evidence-completeness`, `context/compile`, `decision-check`, plus the release checks) add `answer.permission_position` at the analysis level. It lists every gate that blocks (`claim_review`, `evidence_fit`, `abstention`, `release_hold`, `evidence_completeness`), all of which must clear. For the claim gate it names the decisive reviews: every item that holds the gate (an unreviewed or qualifying link under governed review; under declared review an unlinked item, an invalid link, declared counterevidence, an adverse source or stance) and the act that clears it. `cannot_change_the_claim_review` lists the other evidence items: reviewing them cannot clear the gate, though it can add a blocker. It is omitted when a decisive review names no evidence item (for example a claim with no evidence yet), because then any item might matter. External effects are not evaluated there; use `check_permission`. Over MCP the same object is at `structuredContent.permission_position` of the tool result; the compact `/mcp/preflight` and `/mcp/guided` profiles leave it out to stay within their response budget.

## Commit-time check: `commit_effect`

After an allow from `verify_capability`, the bound executor calls `commit_effect` with the same `verification_id`, `effect_id` and `requested_effect` at the moment of the effect. AMOS re-reads the whole chain in one atomic transaction and records a single-use commit that is valid for at most 15 seconds.

- A revocation committed before the commit denies it.
- A replayed commit returns `already_committed`; never perform the effect twice.
- An effect committed first cannot be recalled by a later revocation. The effect system should accept each `commit_id` once.

The reference executor supports this through `commitEffect`; see [durable executor outcomes](durable-authority-executor.md). Commit receipts (`effect_commit`) join the per-workspace receipt chain, and `record_effect` links the commit it followed.

## Review outcome ledger

`POST /v1/review-cases` with `{"action":"record_case_outcome","case_id":"RC-…","operation_id":"…","case_outcome":{"outcome":"held_prevented_harm","observed_at":"…","evidence_ref":"…","reviewer_minutes":40}}` records what happened after a decision. Outcomes: `proceeded_no_incident`, `proceeded_incident`, `held_then_cleared`, `held_prevented_harm`, `held_unnecessary`, `abandoned`. Incidents, prevented harm and unnecessary holds need an evidence reference. Withdrawn and expired cases accept outcomes; the case itself is unchanged.

The server adds the AMOS state at recording (review status, permission level, open residual count), the case's hold durations and whether a pre-review proposal was captured. Entries form a hash chain.

`{"action":"get_review_outcome_ledger"}` returns workspace metrics: prevented bad approvals, unnecessary holds, incidents after proceeding, clean proceeds, holds later cleared, hold precision and incident rate (each with its sample size and a small-sample flag), declared reviewer minutes, and hold-duration median and 90th percentile.

Everything in the ledger is declared by accountable accounts. It is not verified by AMOS, it is not a causal estimate, and it carries no monetary value. A held proposal was not executed, so "prevented harm" is a judgement recorded with evidence, not an observation. This ledger is separate from the calibration ledger at `/v1/outcome-ledger`, which enrols MVR decisions prospectively with consent.

## What this does not establish

- No real institution, issuer or reviewer is onboarded; lab fixtures remain lab fixtures.
- Production capabilities stay closed until the named-person key ceremony activates the production authority registry.
- A customer-controlled receiver and effect-system fencing remain untested.
