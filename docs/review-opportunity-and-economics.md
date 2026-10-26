# Review that preserves opportunity, and what it costs

Two problems are fixed here:

- **A review case could stall a good decision.** A favourable case did not advance after its passages were reviewed. A rejected passage froze the plan. Passages unrelated to the outcome still asked for work. An adverse reading counted only if someone had structured it in advance.
- **The cost of reviewing was invisible.** Nobody could see how long it took, how many hands it passed through, or what it cost.

Both live on `/v1/review-cases`.

## Reading any passage against a claim

`record_passage_interpretation` records a reading of an exact passage in a registered original against one fact (claim) in the review model. No prior binding is needed.

```json
{"action": "record_passage_interpretation", "case_id": "RC-…", "expected_revision": 1, "expected_tools_revision": 4,
 "operation_id": "a fresh UUID", "redacted_no_personal_data": true,
 "passage_interpretation": {"document_sha256": "…", "fact_id": "permit_current", "start": 812, "end": 901,
   "clause_text": "the exact text at those offsets", "stance": "adverse", "source": "human"}}
```

**Fields.**
- `stance` is `adverse`, `supports` or `unrelated`.
- `source` is `human` or `model`. A model reading needs a `model_ref` and decides nothing.
- `start` and `end` are UTF-16 offsets into the original. `clause_text` must be exactly the text at those offsets, or the request is refused with `ORIGINAL_EXACT_PASSAGE_REQUIRED`.
- Each case keeps up to 32 interpretations.

| Reading | Effect |
|---|---|
| Reviewer, `adverse` | The fact becomes false (`effect: claim_false`) |
| Reviewer, `supports` or `unrelated` | Recorded only |
| Model, any stance | Never sets a value (`routes_review_only`). It moves that fact to the front of `review_queue`: an ordering only; whether reviewers act on that order is not measured. Since the 2026-10-26 favourable-path release, an adverse or qualifying model reading also holds the claim's favourable value in the decision state until a designated reviewer disposes of it ([favourable path](favourable-path.md)) |

## Which facts need review

`get_review_tools` now derives fact values from reviewed passages and reviewer readings as well as declared observations:

- **An approved passage** makes its fact true.
- **A rejected passage**, or a reviewer's adverse reading, makes it false.
- **A disagreement** between a passage and a declared observation is reported in `fact_conflicts`. Neither value is used until they agree.

| Field | Meaning |
|---|---|
| `review_queue` | The facts whose value can still change the outcome, model-flagged first, each with a plain reason |
| `review_coverage` | `decisive_total`, `decisive_reviewed`, `pending` and `not_needed`. Facts listed under `not_needed` add no work |
| `fact_values` | Each value and its basis: `reviewed_passage`, `reviewer_adverse_interpretation` or `declared_observation` |
| `adverse_findings` | Reviewer-confirmed adverse readings, with locators |
| `model_suggestions` | Model readings, marked `decides_nothing` |

**Status.** A plan whose decisive facts include a qualified or conflicting passage reports `original_passage_review_unresolved` and names the next review. A favourable case whose decisive passages are all approved advances.

**Pass criteria, all tested:**
- an adverse passage propagates to its claim;
- a favourable case advances;
- unrelated passages add no burden.

## Decision economics

`record_case_outcome` accepts declared `reviewer_minutes`, `integration_minutes`, `reviewer_cost_per_hour_minor` and `currency`. A cost without a currency is refused with `OUTCOME_COST_CURRENCY_REQUIRED`.

Each ledger entry gains an `economics` block. The server records:
- the wait to the first review action;
- the time to the observed outcome;
- recorded operations (mutations only);
- review actions;
- distinct accounts, handoffs and reopenings.

The rest is declared:
- reviewer and integration minutes;
- cost per hour;
- decision cost.

`get_review_outcome_ledger` → `metrics.decision_economics` reports:
- the median wait, elapsed time, operations and handoffs;
- total reopenings and integration minutes;
- cost per completed decision, by currency;
- `telemetry_complete`, with a `meets_95_percent` flag. A sample under 30 is marked `small_sample`.

**Limits.** Declared minutes and costs are not verified. No counterfactual comparison is made.

## Integrating from the contract alone

- **Request examples.** `/v1/review-cases/contract` → `request_examples` is a complete nine-step flow: create, register an original, set the model, review a passage, record an adverse reading, read the review tools, record an outcome with costs, and read the ledger. Each step names where its values come from: the previous step, a fresh UUID, or the clock.
- **Envelope fields.** `/v1/review-sandbox/contract` → `envelope_fields` lists the fields only the evaluation route adds. Every other response field matches the licensed route.
- **Typed outcomes.** Outcome responses are typed in OpenAPI: `outcome_entry`, `review_outcome_ledger` and `review_tools`.
- **Generated client.** [`sdks/javascript/governance-client.mjs`](../sdks/javascript/governance-client.mjs) and its `.d.ts` are generated from the live OpenAPI. The [canary](../conformance/canary/README.md) fails if the live contract drifts from it.
- **Clean-room CI check.** AMOS CI drives both routes using only the published contract and the generated client. It validates 18 requests and 18 responses against the published schemas.
