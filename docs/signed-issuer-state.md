# Signed structured issuer state

`register_issuer_state` on `/v1/authority-chain` accepts a signed `mvr.issuer-state/1` document. Discover its complete schema through the authority contract or versioned MCP `get_contract`. The signer must be an active, scoped `source_issuer` lab anchor. Real institutional issuer activation remains outside this release.

The document binds `record_id`, `issuer_anchor_id`, `case_id`, exact subject, effect action, country and nullable region, state, validity window, conditions, superseded record ID and a supporting statement. Sign the canonical document using the published MVR-AUTHORITY-V1 protocol. States are permitted, prohibited, conditional and revoked. The signed latest record for each issuer/action is retained; replacing it requires its exact ID in `supersedes`. Competing replacements serialize; replaying an old record cannot restore an old head.

Every review and capability check rereads current signed state. Prohibitions, revocation, unresolved conditions, future/expired state, inactive issuers, invalid signatures and integrity failures block progress regardless of caller relationship labels. The current implementation conservatively holds the entire case when any scoped issuer state blocks; it does not optimize permissions for unrelated actions. A permitted state cannot satisfy other evidence, standing or capability requirements. Signed assertions prove attribution to a configured lab key, not document truth or legal authority.

State updates invalidate dependent decisions on their next fresh read. This release does not add a push notification for every issuer-state update; consumers must reverify before each effect. Existing source/credential/closure revocation delivery is exercised separately by the conformance runner. Text and model extraction remain reviewable supporting material. Reconstructed Mbarara and education examples demonstrate wording sensitivity, not reproduction of unavailable original developer payloads.

## Reviewed state version 2

`mvr.issuer-state/2` additionally binds the original document SHA-256, exact signed source review, amount/currency ceiling and typed condition receipts. The source review signs the assertion hash (including subject, action, geography, validity, ceiling, dependencies and supersession), original hash, clause and locator, target claim, relationship, standing credential and its hash, reviewer time/expiry and extractor/model/runtime versions. A current standing credential binds the reviewer's public key. Changing an assertion requires a fresh signed review. A changed or revoked standing invalidates reliance. Signatures establish attribution, not source truth.

For a permitted state, the reviewed relationship must be `direct_support`; obvious restrictive clause conflicts trigger `DECLARED_RELATIONSHIP_TEXT_CONFLICT` and require review. This bounded English heuristic is not a legal interpretation or general entailment engine. It cannot establish that the original document was authentic.

Conditions are typed `all_references_current`, `amount_at_most` or `within_time_window` predicates. Each names exact evidence/closure hashes and an accountable resolver credential. Satisfaction or an explicitly permitted waiver requires a signed, expiring receipt bound to the exact condition and issuer scope. A waiver cannot revive revoked evidence. Missing/duplicate/expired receipts, unavailable dependencies and inactive resolver standing hold the case. Version 1 free-text conditions never clear themselves.

The action catalogue exposes immutable namespaced versions and preserves the six legacy identifiers. An action identifier does not create an executor or confer authority; a separate approved adapter must implement the action. Version 2 requires an exact action match to the case and enforces its ceiling at capability verification. Both state versions currently remain lab-only. No production issuer is activated merely by declaring an affiliation or recording operator vetting.

## Reproduce it

[`conformance/issuer-state-v2/`](../conformance/issuer-state-v2/) publishes every version 2 rule in order, 98 engine-generated vectors with published lab keys, and a separate Python implementation that reproduces each hash, signature, registration, evaluation and allow/deny result. Run `python conformance/issuer-state-v2/check.py`.
