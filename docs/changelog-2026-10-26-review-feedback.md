# Changelog: 2026-10-26.review-feedback.1

Fixes and additions from an outside review. Each item was reproduced first; the behaviour it describes was real.

## Fixed

- **A review case could hold back a good decision.** A favourable case did not advance after review, a rejected passage froze the plan, and unrelated passages still asked for work. Fact values now come from reviewed passages and reviewer readings as well as declared observations, and only facts that can still change the outcome are queued. See [review that preserves opportunity](review-opportunity-and-economics.md).
- **Adverse meaning had to be structured in advance.** `record_passage_interpretation` records a reading of any exact passage against a claim. A reviewer's adverse reading makes the claim false; a model reading only routes review.
- **Licensed responses dropped `evidence_gap_closure`** from `/v1/review-cases` under the `client_safe` output mode. The licensed and evaluation routes now return the same fields, apart from the published evaluation envelope.
- **Issuer-state validation accepted array values where the schema requires strings**, for example a condition currency `["UGX"]`. Such a state could register; it then failed every check, so it held the case rather than permitting anything. Pattern checks now require a string first.
- **The key-ceremony and review-workbench pages sent `X-Frame-Options: SAMEORIGIN`** alongside a Content-Security-Policy that forbids all framing. Browsers that honour CSP were already protected. The legacy header now says `DENY` wherever the policy forbids framing.

## Added

- **Decision economics.** Each review outcome now records server-measured waits, elapsed time, operations, handoffs and reopenings, plus declared minutes and costs. The ledger reports cost per completed decision and whether 95% of decisions have complete telemetry.
- **Clean-room integration.**
  - Outcome responses are typed in OpenAPI.
  - The review contract carries a nine-step request example flow.
  - The evaluation route publishes its envelope fields.
  - Schemas for the key-ceremony responses are published.
  - A [generated JavaScript client](../sdks/javascript/governance-client.mjs) with TypeScript declarations is built from the live contract.
- **[Customer receiver kit](../conformance/receiver-kit/README.md).** A reference receiver applies five rules before acting: signed, committed, exact, in time, once. Scenarios run against real lab commits. `node conformance/authority/run.mjs --receiver ./yours.mjs` tests your own receiver; six deliberately broken receivers all fail.
- **[Issuer state version 2 reproducibility](../conformance/issuer-state-v2/README.md).**
  - Every rule is published in order.
  - The AMOS engine generates 98 vectors on a fixed clock with published lab keys.
  - A separate Python implementation (standard library only) reproduces every hash, signature, registration, evaluation and allow/deny result.
  - Standalone constructors build the documents.
- **[Adversarial suite](../conformance/authority/README.md#adversarial-suite).** Two lab sessions attack each other across cross-session isolation, confused deputy, replay, altered receipts, races and secret exposure. Run it live with `node conformance/authority/run-adversarial.mjs`. AMOS CI also runs it against nine weakened engines, which all fail, and runs a two-tenant API-key isolation test.
- **[Live canary](../conformance/canary/README.md).** A read-only production check runs every six hours, and the adversarial suite runs weekly.
- **[Frozen same-input comparison](../conformance/frozen-comparison/README.md).**
  - A preregistered protocol and a harness freeze an operator's cases, the AMOS revision and the scoring rule by hash before either arm runs.
  - The harness records AMOS's output per case, refuses any later change or any decision made after its outcome, and applies a fixed rule: fewer bad approvals by exact McNemar test, a margin on unnecessary holds, and a margin on time.
  - The comparison itself still needs an operator and real outcomes.

## Unchanged boundaries

- AMOS issues no authority.
- Production receipts stay unsigned until the witnessed key ceremony.
- No real institution, issuer or reviewer is onboarded.
- The reviewer, outcome and economics figures are declarations by the recording workspace.
- The Python implementation is AMOS's own work: a separate implementation, but not independent review.
