# Changelog: 2026-10-26.favourable-path.2

`2026-10-26.favourable-path.1` was deployed and superseded the same day. Its live licensed check found that a residual closure made the review tools stale, so no clause review, adverse ones included, could be recorded after a capability's closure. Review tools now bind to the case, its context and its attestations, not to authority-chain outputs. The favourable-path conformance now records a closure after the reviews and checks that the tools stay current.

Fixes from an outside review. Each claim was reproduced first: in code, against production, or with disposable lab keys.

## The favourable path ([docs](favourable-path.md))

- **Problem: a clean, current, matched case had no way to reach a bounded recommendation.**
  - Review models can now name up to eight effects, each with its own rule.
  - Reviews count only from designated reviewers, who hold an institution-signed standing credential bound to their own account. The case creator cannot be one.
  - Each target is `pending`, `positive`, `conditional` (with machine-checkable conditions), `adverse` or `revoked`.
  - `internal_recommendation` permits internal uses only.
- **A journal replays every transition.** Each accepted review is a hash-chained journal entry that names which claims and which targets changed, and which were independent of it. `get_decision_journal` returns the journal; [`conformance/decision-state/replay.mjs`](../conformance/decision-state/README.md) replays it offline with the server's own library.
- **Adverse meaning is routed to its exact passage.**
  - Server-issued interpretation tasks identify the passage (path, character span, length and SHA-256, never its text), the claim, the allowed labels and non-authority semantics.
  - Model readings need attribution and never set a value. An adverse reading holds the claim until a designated disposition. Disagreements are recorded.
  - Restrictive or adverse wording in an original or in a preflight passage routes that passage with no caller-supplied `contradicts`. The reviewer's two prose cases ("cease distribution", "not to enrol") are both caught.
  - Only strong wording (a directive, prohibition or withdrawal) holds a claim. Other possibly adverse wording, such as "unless revoked" or "pending", marks the passage to read first without holding it. "Is not prohibited" is not strong.
  - Readings are recorded with their attribution and route review. This release does not show that recording them improves review prioritisation.
- **The decision check can use a linked review case.** With `review_case_ref`, a same-workspace review case settles an exact claim-source link (same claim id, same original hash) through a designated review.
- **The authority chain gates on the effect's decision state.** It also checks review conditions and separation of duties. The new `issue_permission_statement` returns a signed (lab), current statement for one exact effect. Commit receipts carry the decision basis. [`permission-verifier.mjs`](../sdks/javascript/permission-verifier.mjs) verifies statements and commits offline.

## Fixed

- **Fail-open: a prohibition did not bind an alias of its action.** A signed issuer prohibition or ceiling on `create_draft_record` did not bind its canonical identifier `amos.document.draft.create@1`. A live run before this release saw the alias at `planning_only`. Restrictions now bind every identifier of the same action.
- **An alias refusal gave no reason.** Registering an issuer state under an alias of the case's intended action was refused without saying why. It now names both identifiers. The live issuer-state/2 run with the exact `create_draft_record` fixture reaches every step ([run-live.mjs](../conformance/issuer-state-v2/run-live.mjs)). The refusal's `detail` is now part of the issuer-state/2 spec, which states the alias table. The vectors add an alias case (99 steps), and the Python implementation reproduces it.
- **Unknown keys got 401 or 503 at random.** The answer depended on whether the paid-entitlement store answered in time. Unknown keys are now always `401 INVALID_CREDENTIAL`. A 503 means only that a store holding the key could not be read, and comes with a stable code and `Retry-After`.
- **Generated TypeScript declarations did not compile.** They held duplicate, self-referencing response aliases (9 errors). The generator is now public ([scripts/generate-governance-client.mjs](../scripts/generate-governance-client.mjs)) and also emits a Python client. CI type-checks the declarations in a clean environment.
- **The packaged Python SDK was blocked at the edge.** Its default `urllib` request was refused with Cloudflare 1010. The SDK (`mvr-agent-sdk` 0.2.0) and every AMOS client now send a User-Agent, take a timeout, and can pin the expected deployment revision.
  - The same day, a Cloudflare configuration rule turned off Browser Integrity Check for the machine endpoints only: the API, MCP, `/a2a`, the published contracts, the `llms` files and `/health`. Python's default client now reaches them. The check stays on for website pages. These endpoints keep their own credentials, rate limits and quotas.
- **Published examples failed as published.**
  - Live, 29 of 76 example runs failed:
    - 9 strict examples, the red-team one among them, lacked the `privacy_envelope` strict mode requires. Every template evidence item now has one.
    - 12 hit role requirements the contract did not publish.
    - 6 depended on state from earlier calls, or on a header the contract did not state.
    - 2 approved a regulator licence claim without the governed source review it needs. That example now approves a field observation instead.
  - Two examples carried prose fields in their request bodies; these were removed.
  - Stateful examples now declare their prerequisites. Every example declares its profiles, plan, roles and headers in `x-mvr-example`, and every operation declares its access in `x-mvr-access`. [`conformance/examples`](../conformance/examples/README.md) runs them all as published.
- **Explain promised what it did not do.** Its description offered six audience-specific summaries, but every `narrative_mode` returned the same template, and its schema listed an `export_safe` output mode the route refuses. The description now says what the route does, `narrative_mode` is validated and selects `primary_summary`, and each route advertises only the output modes it serves.
- **Authority responses were not closed.** All 19 action branches, plus the error branch, now carry closed schemas with shared invariants. CI drives every action to a success and to a refusal and validates each body with an independent validator.
- **The lab dropped refusal details.** Licensed review-case and authority responses lost `detail`, and with it the reason a designation or alias was refused.

## Added

- **[Receiver SDK](../sdks/javascript/receiver-sdk.mjs):**
  - a durable SQLite commit store with explicit consume, retry, reconcile and acknowledgement semantics, and a stated point after which an effect is irreversible;
  - monitoring;
  - an HTTP surface;
  - [conformance over HTTP](../conformance/receiver-kit/README.md) against a customer's staging receiver, covering concurrent deliveries and acknowledgement loss.
- **[Three-arm pilot](../conformance/pilot-study/README.md):** a policy-only model, conventional review, and the workflow with AMOS, all with frozen assignment. It uses buyer-weighted loss and blinded adjudication. The decision rule is a bootstrap test against both controls; commercial superiority also requires payment or renewal.
- **[Design-partner runbook](design-partner-runbook.md)** for the steps that need a real organisation.

## Unchanged boundaries

- AMOS issues no authority.
- Production receipts and statements stay unsigned until the witnessed key ceremony.
- Production capabilities need the production authority registry.
- No real institution, reviewer or design partner is onboarded.
- Every lab result uses proprietary lab fixtures and lab keys.
