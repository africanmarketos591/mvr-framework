# Three-arm operator pilot: protocol

**Question.** On one recurring buyer workflow, does the same workflow with AMOS produce a lower total, buyer-weighted loss than (1) a strong policy-only frontier-model workflow and (2) competent conventional review, over the agreed interval? And does the operator pay or renew?

**This file is the preregistration.** `pilot.mjs freeze` records its SHA-256, the buyer's loss weights and the assignment schedule before the first decision. `pilot.mjs score` refuses to score if any of them changed.

## Workflow and interval

- One recurring workflow that the buyer chooses and names in the freeze: for example DFI or NGO deployment gates, investment-committee evidence review, distributor or partner onboarding, procurement approvals, or a regulated fintech rollout change.
- At least 30 consecutive decisions, or a prospectively powered number computed with `pilot.mjs power` from a declared minimum difference and a pilot standard deviation. The number is frozen.
- The interval ends when every scheduled decision has been decided and adjudicated, or at the frozen end date.

## Arms

- **P, policy-only model.** A frontier model given the buyer's written policy and the same case inputs. Its output is the decision.
- **C, conventional review.** The buyer's competent reviewers, working as they do today.
- **A, with AMOS.** The same reviewers using an AMOS review case. Designated reviewers settle the decisive claims; any external effect needs an institution capability.

## Assignment

Each decision is assigned to one arm by a schedule frozen before the first decision:
- `randomized_block`: random within blocks of three, from a frozen seed; or
- `alternation`: P, C, A in rotation.

Only `randomized_block` supports a causal reading. Every other design is reported as associational, never causal.

## Adjudication

Each decision is adjudicated later by someone who sees neither the arm nor the decision (`blinded: true`). They record:
- the correct decision;
- scope errors;
- missed decisive contradictions;
- missed stale or wrong-geography evidence;
- downstream incident cost;
- opportunity lost.

AMOS's outcome ledger may collect the operational events, but adjudication stays outside AMOS and can be reviewed externally.

## Measures, per decision

- **False permit:** permitted where the adjudicated decision was hold. **False hold:** held where it was permit.
- **Unauthorized action-scope error.**
- **Missed decisive contradiction, or stale or wrong-geography evidence.**
- **Time:** reviewer minutes, integration minutes and elapsed closure minutes.
- **Events:** reopening, bypass attempts and unresolved-accountability incidents.
- **Consequences:** downstream incident cost after proceeding, and opportunity lost after holding.
- **Commercial:** the pilot fee, payment, and the renewal or procurement decision.

## Loss (weights frozen by the buyer)

```
loss = false-permit loss + false-hold opportunity cost + review labour + integration and latency cost + accountability and incident cost
```

**Per decision:**
- false permit: `false_permit_minor` plus the adjudicated downstream incident cost;
- false hold: `false_hold_minor` plus the adjudicated opportunity lost;
- review labour: reviewer minutes × `reviewer_cost_per_hour_minor` / 60;
- integration and latency: integration minutes × `integration_cost_per_hour_minor` / 60, plus elapsed closure minutes × `latency_cost_per_hour_minor` / 60;
- accountability and incidents: `scope_error_minor`, `missed_contradiction_minor`, `missed_stale_or_geography_minor`, `bypass_attempt_minor` and `accountability_incident_minor`, each per occurrence, plus `reopen_minor` per reopening.

## Decision rule (fixed now)

**AMOS has lower total loss** only if both hold:
- every scheduled decision was decided and adjudicated;
- for each control (P and C), the mean loss per decision under A is lower, and the upper bound of the 95% bootstrap interval of the difference (A minus control) is below zero. The interval uses 10,000 resamples and the frozen seed.

**Commercial superiority** additionally requires that the operator paid the pilot fee or renewed.

Below 30 adjudicated decisions, the result is `insufficient_decisions` whatever the numbers say.

## What this cannot show

- Anything about another workflow, buyer or reviewer team.
- Causality, unless assignment was `randomized_block`.
- That AMOS works without designated reviewers or institution capabilities.
