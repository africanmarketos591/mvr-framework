# Frozen same-input comparison: protocol

**Question.** On the same cases, does an operator who uses an AMOS review case make fewer bad approvals than the same operator's usual process, without holding back too many good decisions or costing more time?

**This file is the preregistration.** `freeze.mjs` records its SHA-256 before either arm runs, and `score.mjs` refuses to score if it has changed.

## Arms

- **A, usual process.** The operator decides each case the way they do today.
- **B, with AMOS.** The operator decides each case after opening its AMOS review case. AMOS's own output is recorded per case, but it is not a decision. The operator decides in both arms.

Each case gets one decision per arm: `approve`, `hold` or `reject`. A different person decides each arm, or the arms are separated by at least 14 days with the case order shuffled. Deciders do not see the other arm's decision.

## Frozen inputs

- The case set: each case's redacted inputs, hashed, plus the hash of the whole set.
- The AMOS deployment revision used for arm B.
- This protocol's hash.

Nothing in a frozen case may change after freezing. A case that needs new information is recorded as `hold` in both arms, with the reason.

## Outcomes

Each case's outcome is recorded after both decisions, from what happened or from a review completed later by someone who saw neither arm's decision:
- `harmful`: approving would have caused, or did cause, the harm the review exists to prevent;
- `benign`: approving was safe.

A decision recorded after its case's outcome is refused.

## Measures

- **Bad approval:** `approve` on a harmful case.
- **Unnecessary hold:** `hold` or `reject` on a benign case.
- **Minutes:** declared minutes per decision. For arm B, the review case's server-recorded economics are attached.

## Decision rule (fixed now)

Arm B is better only if all three hold:

1. **Fewer bad approvals.** B has fewer bad approvals than A. Among cases where exactly one arm made a bad approval, the exact two-sided McNemar test gives p < 0.05.
2. **No excess holds.** B's unnecessary holds exceed A's by at most 10% of benign cases.
3. **No excess time.** B's median minutes per decision are at most 1.5 times A's.

Otherwise the result is "no demonstrated advantage". Below 50 cases with outcomes, the result is reported as "feasibility only" whatever the numbers say, and no advantage is claimed. Fifty outcomes is a feasibility gate, not a powered study.

## What this cannot show

It cannot show:
- that AMOS works without a skilled operator;
- that the result transfers to other operators or case types;
- anything about cases that were not frozen.
