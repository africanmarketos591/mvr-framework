# Enterprise Retest 3: Review and Receipt Contract

Release: `2026-09-27.outsider-retest3.1`. MVR framework attribution: Farouk Mark Mukiibi.

## Governed Claim Review

Licensed decision-check resolves the latest persisted review for each linked evidence item's exact content hash, authenticated tenant/workspace, exact claim wording, relationship and locator. The review and decision receipt participate in the same canonical transaction. A concurrent review change invalidates the commit; retry the complete request with a fresh idempotency key after inspecting a conflict.

Missing, pending, adverse, mismatched and superseded reviews cannot establish a supported candidate. Omitting a review-event ID or relabelling an adverse relationship does not bypass resolution. Changing a source or claim requires new review. A new review replaces the claim-support set for that exact evidence version; include all intended attestations. Legacy pre-index histories are checked, with incomplete/ambiguous history failing closed. Existing receipts are historical assessments, not current revocation checks.

Reproduction: use a fictional evidence pack with exact claim support links. Call `/v1/evidence-review` for each linked item with an authorized reviewer. Call `/v1/decision-check`; inspect `claim_review.governed_review`. Record a new `contradicts` or pending review for a linked item. Repeat decision-check with the old ID, the new ID but `direct_support`, and no ID. All must block affirmative authorization. Exact approved support may clear this gate but does not bypass other evidence, calibration or release gates. REST and licensed MCP call the same kernel.

`review_eligibility` separates schema validity, reviewer authorization, declared independence, source authenticity, issuer standing and release eligibility. Legacy `strict_eligible` means schema/authorized-review eligibility, not independent verification. No automated prose entailment, competent-issuer authentication or execution warrant is claimed. Claims and IDs remain caller-declared inputs; renaming or withholding the underlying artifacts is not evidence of permission.

## History and Recovery

`/v1/entity-timeline` scans bounded storage pages. Canonical existence checks and legacy KV value reads are batched, including pages with zero matches. Continue with the same selector and limit until `list_complete`; an empty page is not completion. No legacy data was deleted or rewritten. This is not an entity index or a latency SLA.

`POST /v1/outcome-ledger` recovery accepts only `action: "get_followup_offer"` and `decision_check_id`. Extra fields return 422; caller eligibility never determines the offer. Use a new Idempotency-Key for a later recovery attempt. The licensed MCP deferral includes the REST route/body/retry instruction; the five-tool MCP contract is unchanged. No consent, enrollment or customer communication occurs during recovery.

## Receipt and Audit Read Paths

- Snapshot creation requires the exact server-returned decision-check ID and response hash. `source_decision_integrity` preserves source response, semantic and immutable hashes independently of the later snapshot-lock hash.
- Owner snapshot retrieval returns a separate amendment page. Follow `amendment_cursor` using `amendment_limit` without modifying the original snapshot. Shared access tokens do not expose the owner's amendment history.
- Elevated audit roles can call `GET /v1/audit-events?category=governance&limit=50` and follow `governance_cursor`. Events include reviews, decisions, snapshot creation/lock and amendments. The summary index begins at this release; original historical artifacts remain on their original routes. Absence in this index is not proof of no past activity.
- Deployment headers identify the serving code on all `/v1/` responses. Stored receipt metadata retains its original assessed revision. Revision metadata is added before hashing new utility results. Output-mode conflicts explicitly say `assessment_executed:false`.
- `coverage=full` calibration health reports full-corpus readiness, separate from `strict_smoke_calibration_ready`. Smoke readiness is not global strict readiness. Quarantined assets remain quarantined.

## Explicit Limits

An authorized evaluator review is not document authentication, independent review, regulatory permission or an issuer signature. Receipt signing remains inactive pending a recorded custody/rotation ceremony; unsigned receipts prove server hash registration, not offline-verifiable issuer identity. Client-safe/board-safe output is authenticated scoped output, not an anonymous public export.

An exact-action issuer warrant requires an onboarded competent issuer, verified signer authority, agreed action schema and revocation policy. Synthetic API tests cannot supply those facts. Likewise no operator pilot, model superiority, willingness to pay or commercial advantage is established. Unpublished long-tail request schemas remain a disclosed backlog, not a promise that every utility accepts arbitrary input.

Implementation references: [Cloudflare KV bulk reads](https://developers.cloudflare.com/kv/api/read-key-value-pairs/) (bounded multi-key reads; eventual consistency) and [KV pagination](https://developers.cloudflare.com/kv/api/list-keys/) (retain prefix and follow completion/cursor). Current authority is resolved from canonical storage, not inferred from eventual-consistency KV caching.
