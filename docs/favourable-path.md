# The favourable path: from designated review to an enforceable permission object

A clean, current, geographically matched case can now reach a bounded internal recommendation. Each named effect moves only with the claims its own rule uses.

The result for one exact effect is a signed, current permission statement that the buyer's own system verifies before acting. AMOS still issues no authority:
- the institution signs capabilities;
- designated reviewers settle claims;
- the buyer's receiver performs the effect at most once.

Everything here runs in the isolated lab. Run [`conformance/favourable-path`](../conformance/favourable-path/README.md) to see the whole path live.

## 1. Effects in the review model

`set_review_model` accepts an optional `effects` list. It holds up to eight entries of the form `{effect_type, rule}`:
- `effect_type` is an `mvr.action-ontology/1` identifier;
- `rule` uses the same Boolean grammar as the model's `rule`, with at most eight claims per rule.

The model's own `rule` drives the internal recommendation. Each effect depends only on the claims its rule references.

```json
"effects": [
  {"effect_type": "create_draft_record", "rule": {"all": [{"fact": "licence_current"}, {"fact": "local_partner_active"}]}},
  {"effect_type": "publish_document",    "rule": {"fact": "retail_presence"}}
]
```

## 2. Designated reviewers

A review moves the decision state only when it carries `designation_credential_id`. This applies to `review_document_clause`, to `record_passage_interpretation` with source `human`, and to `dispose_interpretation`.

The credential is an `mvr.reviewer-standing/1` document that the customer institution signs with its standing-issuer key and registers on `/v1/authority-chain`. AMOS checks it on every evaluation. It must:
- be bound to the reviewing account. Use `account.account_principal_sha256` from `/v1/auth-check`.
- name `CLAIM_TRUTH_UNVERIFIED` and the case jurisdiction in its competence;
- declare no relationship to the subject and no conflicts;
- not belong to the case subject's organization;
- be current: not expired, revoked, or resting on a lapsed delegation.

The case creator cannot be the designated reviewer. A reviewer role on an account is not designation.

`competence.effect_types` is optional. When present, that reviewer's reviews support only the listed effects, plus the internal recommendation.

**Approving restrictive wording.** If a passage declared as direct support contains restrictive wording, approving it needs `acknowledge_restrictive_wording: true`.

**Conditions.** A `qualify` disposition may carry machine-checkable `conditions`:
- `amount_at_most`
- `within_time_window`
- `geography_in`
- `resource_scope`
- `no_external_contact`

The claim is then true subject to those conditions. They bind every effect that depends on it.

## 3. States, transitions and replay

`get_review_tools` returns `review_tools.decision_state`. It holds one target for the internal recommendation and one per effect. Each target has a state:

| State | Meaning |
|---|---|
| `pending` | Not settled; `pending_reviews` lists only the decisive claims |
| `positive` | Designated reviews settle the rule as true |
| `conditional` | True, subject to the listed conditions |
| `adverse` | Designated reviews settle the rule as false |
| `revoked` | Was positive or conditional. Moved here when a supporting review was withdrawn, a designation lapsed or expired, designated reviewers now disagree, or an open adverse signal holds a claim |

**Internal recommendation.** When the target is `positive` or `conditional`, `internal_recommendation` permits `internal_planning`, `pilot_design` and `board_reporting`. Its `execution_permission` and `external_effect_permission` are always false.

**The journal.** Every accepted review, withdrawal, lapse, task and reading is an entry in a hash-chained journal. Each entry records:
- every claim before and after;
- `targets_changed`;
- `targets_unchanged`: the target references the claim but did not change;
- `targets_independent`: the target does not reference the claim.

**Replay.** `get_decision_journal` returns the journal, the models and the server's own replay. [`conformance/decision-state/replay.mjs`](../conformance/decision-state/README.md) recomputes every entry hash, transition and state hash offline. It uses byte-identical copies of the library the server runs.

**Revocations.** A revoked designation is applied to the live state at once and reported in `unjournaled_lapses`. `record_dependency_check` journals it.

## 4. Interpretation and adverse meaning

Every bound passage of a decisive claim gets a server-issued interpretation task. Each task carries the exact passage, the target claim, the allowed labels (`supports`, `qualifies`, `adverse`, `unrelated`) and `non_authority` semantics. `issue_interpretation_task` adds a task for any other exact passage.

**Model readings** use `record_passage_interpretation` with source `model`, a `task_id` and `attribution`: provider, model, model_version, prompt_sha256 and output_sha256. A reading never sets a value. An adverse or qualifying reading holds the claim's favourable value until a designated reviewer disposes of it. Readings that disagree are listed under `disagreements`.

**Adverse wording in an original.** Restrictive or adverse wording in a registered original that binds a claim opens a task the same way. Examples are "prohibited", "cease", "not to enrol", "unless", "stopped" and "arrears". A designated clause review that covers the flagged sentence disposes of it.

**Disposition.** `dispose_interpretation` takes `accept` with a label, `qualify` with conditions, or `reject`:
- an accepted `adverse` sets the claim false;
- an accepted `supports` sets it true, but only for the claim's own bound passage.

Effects whose rules do not use that claim are unaffected.

## 5. Stateless preflight and the decision check

Every declared claim-source link on `/v1/decision-check`, `/v1/evidence-completeness` and `/v1/context/compile` gets a task: `claim_review.interpretation_tasks`, with ids beginning `PT-`.

Tasks never echo the caller's passage text. Each carries the passage path, length and SHA-256.

**Lexical routing.** A passage declared as `direct_support` is scanned. Matches route that exact passage (`claim_review.interpretation_routes`), with no caller-supplied `contradicts` needed. Each route carries `blocking`, `source` (`lexical` or `model`), the passage path and character span, and what to do next.
- **Strong wording holds the claim** (`adverse_wording_requires_review`, `blocking: true`). This is a directive, prohibition or withdrawal, for example "must not", "prohibits", "ordered … to stop" or "not authorised to".
- **Other possibly adverse wording only marks the passage to read first** (`adverse_wording_review_first`, `blocking: false`). Examples are "unless revoked", "pending" and "subject to".
- A negation shortly before strong wording, as in "is not prohibited", is not treated as strong.

**Model readings.** Resubmit to `/v1/decision-check` with `passage_interpretations` (`task_id`, `stance`, `source: "model"` and `attribution`). The OpenAPI `DecisionCheckRequest` has the full schema. The licensed MCP tool `mvr_decision_check` accepts the same field inside `payload`. It is not listed in that tool's input schema, which keeps the manifest small; the server validates it either way. An adverse, qualifying or disagreeing reading routes the passage and holds the claim. A supporting reading clears nothing. A refused reading is reported in `claim_review.issues` and routes nothing.

**What a reading cannot do.** Readings persist with their attribution and never become a fact or a permission. Recording a reading routes the passage. This release does not show that recording readings improves how review is prioritised.

**Governed review supersedes lexical routes.** When a linked review case has verified the exact claim-source link, lexical routes on that link are dropped (`interpretation_routes_superseded_by_governed_review`). Model routes stay.

**Settling links from a review case.** With `review_case_ref`, a link in the same workspace is settled by the linked review case only when it meets both conditions:
- the case has a designated review of the claim with the same `claim_id`;
- that claim is bound to the same original, matched by source hash.

Held and contested claims stay open.

## 6. Effects at the authority chain

When the case models effects, `verify_capability`, `commit_effect` and `check_permission` require all of these:
- **The exact identifier.** The capability's effect identifier equals a modelled effect exactly. An alias is named in the deny reason.
- **A supported effect.** That effect is `positive` or `conditional`.
- **The conditions.** Every condition holds for the exact request.
- **Separation of duties.** The reviewers of the basis neither approve nor perform the effect, and the approver does not perform it.

Each failure is a named deny reason:
- `REVIEW_EFFECT_PENDING`, `REVIEW_EFFECT_ADVERSE` or `REVIEW_EFFECT_REVOKED`;
- `REVIEW_EFFECT_NOT_MODELLED` or `REVIEW_EFFECT_ALIAS_MISMATCH:<id>`;
- `REVIEW_CONDITION_UNMET:<type>`;
- `SEPARATION_OF_DUTIES_*`.

`issue_permission_statement` returns `mvr.permission-statement/1` for one exact effect. The statement is receipt-chained and signed: lab sessions use lab keys, and production stays unsigned until the witnessed key ceremony. It is valid for at most 60 seconds. It records:
- the requested effect and its hash;
- the effect state and conditions;
- every dependency with its validity;
- the decision journal head;
- the capability hash;
- the revocation method.

A statement is not consumable and not authority. The bound executor still calls `verify_capability` and then `commit_effect` immediately before acting. The commit receipt now carries `permission_basis`: the effect state, conditions, the basis reviews and the journal head.

[`sdks/javascript/permission-verifier.mjs`](../sdks/javascript/permission-verifier.mjs) checks, offline:
- the signature;
- the exact effect;
- time;
- the executor;
- the conditions;
- the dependencies;
- with `requireCommit`, a matching single-use commit made after the statement.

**Restrictions bind every identifier of the same action.** A signed issuer prohibition or ceiling binds every identifier that resolves to the same action. A grant binds only its exact identifier.

## 7. What still needs people

The lab shows the mechanism end to end, with lab keys and proprietary lab fixtures. Three things need people:
- **A design partner.** Reaching the same result in production needs a real design-partner organisation to:
  1. register its keys;
  2. designate a reviewer it is accountable for;
  3. sign a harmless capability;
  4. run its own receiver against AMOS commits.
- **The key ceremony.** Signed production receipts need the witnessed key ceremony.
- **The production authority registry.** Production capabilities also need it.

See the [design-partner runbook](design-partner-runbook.md).
