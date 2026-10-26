# Design-partner runbook: one harmless effect, end to end, with a real organisation

This runbook passes the acceptance test that the lab cannot pass on its own: a real organisation, a distinct legitimate reviewer, an independent verifier, and the buyer's own receiver. Each step names who does it. AMOS staff and AI tools prepare and check; they never sign, review, witness or hold keys for the organisation.

## Roles

- **Institution administrator** (the design partner): holds the organisation's keys, which are generated in its own key ceremony, and signs capabilities.
- **Designated reviewer:** a person the institution is accountable for, holding a standing credential the institution signs. It cannot be the case owner or the person who approves the capability.
- **Executor:** the system account that verifies and commits. It cannot be the reviewer.
- **Receiver owner:** whoever runs the buyer's staging system that performs the effect.
- **Independent verifier:** someone outside AMOS who runs the published verifier on the statement and the commit.

## Steps

1. **Keys.** The institution generates its institution-authority and standing-issuer keys in its own ceremony and registers them with `register_anchor`, using proof of possession and the ceremony record hash. Tier: `tenant_declared`.
2. **Designate the reviewer.** The reviewer reads `account.account_principal_sha256` from `/v1/auth-check`. The institution signs `mvr.reviewer-standing/1` for that principal. It names `CLAIM_TRUTH_UNVERIFIED`, the jurisdiction and, optionally, `effect_types`. It is then registered with `register_credential`.
3. **Case and originals.** The case owner opens a review case, registers the originals and sets a review model with one harmless effect (for example `create_draft_record`).
4. **Review.** The designated reviewer reviews the decisive passages with `designation_credential_id` and disposes of any flagged passages. `decision_state` shows the effect `positive`, or `conditional` with conditions.
5. **Capability.** The institution approver signs one harmless `mvr.action-capability/1` for that effect. It has amount 0, no external contact, and a short window.
6. **Statement and commit.** The executor calls `issue_permission_statement`, then `verify_capability` and `commit_effect`, and delivers the commit receipt to the buyer's receiver.
7. **Receiver.** The receiver owner runs [`conformance/receiver-kit/http-conformance.mjs`](../conformance/receiver-kit/README.md) against their staging receiver. It must show:
   - exactly one effect for the valid commit;
   - zero effects for replayed, broadened, expired, revoked and invalidly signed commits;
   - one effect for two concurrent deliveries;
   - no duplicate after a lost acknowledgement.
8. **Independent check.** The verifier runs [`permission-verifier.mjs`](../sdks/javascript/permission-verifier.mjs) on the statement and the commit with the published key registry. They also run [`conformance/decision-state/replay.mjs`](../conformance/decision-state/README.md) on the exported journal.
9. **Revocation.** The institution revokes the capability, or the reviewer's credential. Expected results:
   - the same exact effect now fails verification;
   - a second, unrelated permitted effect on another capability still verifies.

## Not covered here

The following are tracked separately and need people:
- signed production receipts, which need the witnessed key ceremony;
- production capabilities, which need the production authority registry;
- registering the organisation (PDPO in Uganda) and its legal review.
