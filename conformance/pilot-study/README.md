# Three-arm operator pilot

This package runs a pilot that can settle commercial value. It compares one recurring buyer workflow under three arms:

- **P:** a strong policy-only frontier-model workflow;
- **C:** competent conventional review;
- **A:** the same reviewers with AMOS.

Each arm is scored with the buyer's own loss weights, which are frozen before the first decision. [PROTOCOL.md](PROTOCOL.md) is the preregistration.

It needs a real operator, real decisions and a blinded adjudicator. Nothing here produces a result without them.

## Steps

1. **Choose one workflow** with at least 30 consecutive decisions. Fewer is allowed only with a frozen power calculation: `node pilot.mjs power --sd <minor> --difference <minor>`.
2. **Make the schedule:** `node pilot.mjs schedule --decisions 30 --method randomized_block --seed <32 hex>`. Only `randomized_block` supports a causal reading.
3. **Fill in `pilot.example.json`:** the workflow, the AMOS revision, the end date, the buyer's loss weights in minor units, and the schedule. Then freeze it with `node pilot.mjs freeze pilot.json frozen/`.
4. **Decide each case** under its assigned arm and record it in `decisions.template.csv`. For arm A, record each case's outcome in AMOS with `record_case_outcome`, setting `evidence_ref` to the decision_ref. `node ledger-to-decisions.mjs ledger.json decisions.csv` then fills arm A's server-recorded minutes, elapsed time and reopenings.
5. **Adjudicate.** Someone who sees neither the arm nor the decision fills in `adjudications.template.csv`: the correct decision, scope errors, missed contradictions, missed stale or wrong-geography evidence, downstream incident cost and opportunity lost.
6. **Score:** `node pilot.mjs score frozen/ decisions.csv adjudications.csv commercial.json`. `commercial.json` records `fee_minor`, `paid`, `renewed` and `procurement_decision`.

## What the score refuses

The score refuses any of these:
- an edited manifest, weights, schedule or protocol;
- a decision made under an arm other than its assigned one;
- a decision made before freezing or after the end date;
- an unblinded adjudication;
- a decider adjudicating their own decision;
- an adjudication recorded before its decision.

## Verdicts

- **`amos_lower_total_loss`:** every scheduled decision is decided and adjudicated, and AMOS's mean loss is lower than both controls. The upper bound of the 95% bootstrap interval of each difference is below zero.
- **`commercial_superiority`:** the above, and the operator paid or renewed.
- **Otherwise:** `no_demonstrated_advantage`, `interval_incomplete`, or `insufficient_decisions` (below 30 adjudicated decisions).

The result is reported as causal only under randomized assignment.

## Tests

`node test.mjs` runs on proprietary lab fixture rows. These are not observations of any organisation.
