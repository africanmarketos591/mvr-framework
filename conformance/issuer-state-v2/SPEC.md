# Issuer state version 2: normative rules

This file defines every rule AMOS applies to `mvr.issuer-state/2`. It covers each hash and signature preimage, each registration and evaluation check in order, and how a current issuer state contributes to an allow or deny at capability verification. [`vectors.json`](vectors.json) holds the expected results. An implementation that follows this file reproduces them; [`check.py`](check.py) is one that does.

Everything here is a lab protocol. It is not production authority, legal interpretation or identity verification. The keys in the vectors are published on purpose and sign nothing else.

**Notation.**
- `now` is the evaluation instant in milliseconds since 1970-01-01T00:00:00Z.
- A step "fails with `CODE` (status)" stops processing and returns that code.
- Each list is checked in order. The first failing step decides.

## 1. Encoding

### 1.1 Canonical JSON: `C(value)`

- **Objects:** keys sorted by UTF-16 code units (JavaScript's default string sort), recursively. No whitespace.
- **Arrays:** keep their order.
- **Strings:** escaped exactly as ECMAScript `JSON.stringify`:
  - `"` → `\"` and `\` → `\\`;
  - U+0008, U+000C, U+000A, U+000D and U+0009 → `\b`, `\f`, `\n`, `\r`, `\t`;
  - any other code point below U+0020 → `\u00xx` (lowercase hex);
  - a lone surrogate → `\udxxx` (lowercase hex);
  - every other character is written literally. This includes U+007F, U+2028 and U+2029.
- **Numbers:** ECMAScript `Number::toString`.
  - Integers below 10^21 are written in plain decimal.
  - Otherwise the shortest round-trip digits are used, with an exponent outside the range 10^-7 ≤ |x| < 10^21: `1e+21`, `1e-7`, `2.5e-8`.
  - `-0` is written `0`.
  - Issuer-state documents themselves only contain integers.
- **Literals:** `true`, `false`, `null`.
- **Output:** the UTF-8 encoding of the result.

`D(value)` is the lowercase hex SHA-256 of `C(value)`.

### 1.2 Signatures

The signing payload is `S(type, document)` = UTF-8 of `MVR-AUTHORITY-V1` + LF + `type` + LF + `C(document)`. LF is U+000A. `type` is the document's own `type` field.

- **Algorithm:** Ed25519 as in RFC 8032, pure, no prehash, deterministic. Verification rejects `s ≥ L`. It accepts only when the encoding of `[s]B − [k]A` equals the signature's first 32 bytes.
- **Public keys:** base64 of the 44-byte DER SPKI. That is the 12-byte prefix `302a300506032b6570032100` followed by the 32-byte key.
- **Private keys in the vectors:** the 32-byte seed. PKCS#8 is the prefix `302e020100300506032b657004220420` followed by the seed.
- **Base64:** decoded with the WHATWG forgiving-base64 algorithm (`atob`):
  - remove ASCII whitespace (TAB, LF, FF, CR, SPACE);
  - drop one or two trailing `=` when the length is a multiple of 4;
  - the remaining length must not be 1 modulo 4;
  - the remaining characters must be in `A–Z a–z 0–9 + /`.
- **Any failure means invalid:** a decoding failure, a key of the wrong shape, or a signature that is not 64 bytes all make the signature invalid.

### 1.3 Instants

An instant is a string that fully matches `[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3})?Z`. Its value in milliseconds follows V8's `Date.parse`:

- month 01–12 and day 01–31. A day beyond the end of the month rolls forward, so `2026-02-30` is 2 March.
- hour 00–23, or exactly `24:00:00` / `24:00:00.000`, which is the following midnight.
- minute and second 00–59.

Any other value is NaN. Every comparison with NaN is false.

Output instants are `YYYY-MM-DDTHH:MM:SS.mmmZ`.

### 1.4 Predicates on values

| Name | True when |
|---|---|
| `text(v, n)` | `v` is a string, contains a character outside the ECMAScript whitespace set below, and has at most `n` UTF-16 code units |
| `id(v)` | `v` is a string fully matching `[A-Za-z0-9][A-Za-z0-9._:-]{2,119}` |
| `hex(v)` | string, `[a-f0-9]{64}` |
| `country(v)` | string, `[A-Z]{2}` |
| `currency(v)` | string, `[A-Z]{3}` |
| `case_id(v)` | string, `RC-[a-f0-9]{64}` |
| `safe(v)` | a JSON number with an integer value and absolute value at most 2^53 − 1. `5` and `5.0` qualify; booleans never do |
| `exact(v, keys)` | `v` is a JSON object whose key set equals `keys` |

The ECMAScript whitespace set is U+0009, U+000A, U+000B, U+000C, U+000D, U+0020, U+00A0, U+1680, U+2000–U+200A, U+2028, U+2029, U+202F, U+205F, U+3000 and U+FEFF.

Every pattern check needs a JSON string first. A one-element array never passes as its own text.

## 2. Constructors

Each constructor is a preimage AMOS hashes or signs. `vectors.json` → `preimages` gives the full preimage text and SHA-256 for one document of each kind.

| Constructor | Preimage | Where the result goes |
|---|---|---|
| `issuer_state_document` | `C(doc)` | stored `document_sha256`; the case evaluation reports it |
| `issuer_state_signing_payload` | `S(doc.type, doc)` | signed by the source-issuer anchor key → `signature_b64` |
| `assertion` | `C(doc` without `source_review` and `condition_receipts)` | `source_review.document.assertion_sha256` |
| `review_signing_payload` | `S('mvr.issuer-state-review/1', source_review.document)` | signed by the reviewer key in the standing credential → `source_review.signature_b64` |
| `standing_reference` | `C(credential document)` | `source_review.document.standing_sha256` (equals the stored credential `document_sha256`) |
| `condition` | `C(condition)` | each receipt's `condition_sha256` |
| `condition_scope` | `C(doc` with `condition_receipts` replaced by `[])` | each receipt's `scope_sha256`. It includes `source_review`, so build receipts after the review |
| `condition_resolution_signing_payload` | `S('mvr.condition-resolution/1', receipt.document)` | signed by the resolver key → receipt `signature_b64` |
| `source_record_reference` | `C(source record document)` | `required_references[].sha256` for kind `source_record` |
| `closure_reference` | `C(closure content)` | `required_references[].sha256` for kind `closure` (equals the stored `content_sha256`) |
| `anchor_document` | `C(anchor document)` | stored anchor `document_sha256` |

**Build order:**
1. Write the document with `source_review: null` and `condition_receipts: []`.
2. Compute `assertion`.
3. Sign the review and attach it.
4. Compute `condition_scope`.
5. Sign one receipt per condition.
6. Sign the whole document with the issuer key.

## 3. Stored state

An evaluator reads these rows. `vectors.json` → `initial_store` holds them exactly as AMOS persisted them.

- **Anchor:** `{contract_version, anchor_id, document, document_sha256, status, trust_tier, vetting, …}`.
- **Credential:** `{document, document_sha256, signature_b64, status, …}`.
- **Source record:** `{document, document_sha256, signature_b64, status, …}`.
- **Closure:** `{closure_id, content, content_sha256, status}`.
- **Case:** `{case_id, status, context_sha256, preflight_context}`. A case that holds a capability also lists the capability's `effect_type` and `accepted_open_residuals`.
- **Issuer-state row:** written by registration as `{document, document_sha256, signature_b64, case_context_sha256}` and keyed by `record_id`. Record ids are shared by every case in the tenant.
- **Case heads:** an ordered map from slot `issuer_anchor_id + ':' + action` to `record_id`. A new slot is appended. Replacing a slot keeps its position. Slots always contain `:`, so they are never integer-like keys.

Revocation sets a row's `status` to `revoked` and changes nothing else.

## 4. Dependency state

### 4.1 Anchor state for role R

Read the anchor. It fails as `AUTHORITY_ANCHOR_ID_INVALID` when `id(anchor_id)` is false. It fails as `AUTHORITY_ANCHOR_NOT_FOUND` when:
- the row is missing,
- `contract_version` is not `mvr.authority-chain/1`,
- `anchor_id` differs, or
- `document_sha256 ≠ D(document)`.

Otherwise the reasons are, in order:
- `ANCHOR_` + the uppercased status, when the status is not `active`;
- `ANCHOR_NOT_YET_VALID` when `not_before > now`;
- `ANCHOR_EXPIRED` when `not_after ≤ now`;
- `ANCHOR_ROLE_MISMATCH` when `anchor_role ≠ R`.

The anchor is usable when there are no reasons.

### 4.2 Credential state, at delegation depth d (starting at 0)

`CREDENTIAL_NOT_FOUND` when the id is invalid, the row is missing, `document.credential_id` differs, or `document_sha256 ≠ D(document)`. Otherwise the reasons are, in order:

- **Issuer anchor** (`standing_issuer`): if unusable, its reasons with the prefix `ISSUER_`. Otherwise, if `S(doc.type, doc)` does not verify with the anchor key, `CREDENTIAL_SIGNATURE_INVALID`.
- **Status and window:**
  - `CREDENTIAL_` + the uppercased status, when the status is not `active`;
  - `CREDENTIAL_NOT_YET_VALID` when `not_before > now`;
  - `CREDENTIAL_EXPIRED` when `not_after ≤ now`.
- **Delegation**, only when `delegation.mode` is `delegated`:
  - at d > 0: `DELEGATION_DEPTH_EXCEEDED`;
  - otherwise take the parent's state at d = 1:
    - if the parent is unusable: `DELEGATING_CREDENTIAL_UNUSABLE`;
    - else if the parent's `max_further_delegation` is below 1, or the parent has a different `issuer_anchor_id`: `DELEGATION_NOT_AUTHORIZED`;
    - else if the jurisdictions or residual codes are not a subset of the parent's, or `not_after` is later than the parent's: `DELEGATION_SCOPE_EXPANDED`.

The credential is usable when there are no reasons.

### 4.3 Source record state

`SOURCE_RECORD_NOT_FOUND` when the row is missing, `document.record_id` differs, or `document_sha256 ≠ D(document)`. Otherwise the reasons are, in order:
- if the issuer anchor (`source_issuer`) is unusable, its reasons with the prefix `ISSUER_`; otherwise, if the signature over `S(doc.type, doc)` does not verify, `SOURCE_RECORD_SIGNATURE_INVALID`;
- `SOURCE_RECORD_` + the uppercased status, when the status is not `active`;
- `SOURCE_RECORD_NOT_YET_VALID` when `valid_from > now`;
- `SOURCE_RECORD_EXPIRED` when `valid_until ≤ now`.

### 4.4 Closure state

The closure is unusable when any of these holds:
- the row is missing;
- `closure_id` differs;
- `content_sha256 ≠ D(content)`;
- the status is not `active`;
- `content.expires_at ≤ now`;
- the credential `content.credential_id` is unusable;
- any source record in `content.source_record_ids` is unusable.

## 5. Document validation `V(doc)` (all status 422)

**v1 fields:**
`type, record_id, issuer_anchor_id, case_id, subject, action, geography, state, valid_from, valid_until, conditions, supersedes, statement`.

**v2 fields:** the v1 fields plus `original_document_sha256, source_review, ceiling, condition_receipts`.

A document is v2 exactly when `type` is `mvr.issuer-state/2`.

1. **`ISSUER_STATE_DOCUMENT_INVALID`** unless all of these hold:
   - `exact(doc, fields of its version)`;
   - `type` is `mvr.issuer-state/1` or `mvr.issuer-state/2`;
   - `id(record_id)` and `id(issuer_anchor_id)`;
   - `case_id(case_id)`.
2. **`ISSUER_STATE_SCOPE_INVALID`** unless all of these hold:
   - `text(subject, 200)`;
   - `action` is in the action catalogue (`vectors.json` → `constants.action_ids`, also published by `/v1/authority-chain/contract`);
   - `exact(geography, [country, region])`;
   - `country(geography.country)`;
   - `region` is `null` or `text(region, 200)`.
3. **`ISSUER_STATE_DOCUMENT_INVALID`** unless all of these hold:
   - `state` is one of `permitted`, `prohibited`, `conditional`, `revoked`;
   - `conditions` is an array of at most 20 entries, and in v1 every entry is `text(·, 200)`;
   - `supersedes` is `null` or an `id`;
   - `text(statement, 1000)`.
4. **v2 only.**
   1. `ISSUER_STATE_REVIEWED_SCOPE_INVALID` unless all of these hold:
      - `hex(original_document_sha256)`;
      - `exact(ceiling, [amount_minor, currency])`;
      - `safe(ceiling.amount_minor)` and it is ≥ 0;
      - `currency(ceiling.currency)`;
      - `condition_receipts` is an array of at most 20 entries.
   2. Each condition passes §5.1.
   3. `ISSUER_STATE_CONDITIONS_INVALID` unless all of these hold:
      - the condition ids are unique;
      - a `conditional` state has at least one condition.
5. **`ISSUER_STATE_WINDOW_INVALID`** unless both of these hold:
   - `valid_from` and `valid_until` are instants;
   - `valid_from < valid_until` and `valid_until − valid_from ≤ 366 days`.

Receipts are not validated at registration; §10 checks them at every evaluation.

### 5.1 Condition validation (status 422)

1. **`CONDITION_INVALID`** unless all of these hold:
   - `exact(condition, [condition_id, predicate, required_references, resolver_credential_id, waiver_allowed])`;
   - `id(condition_id)` and `id(resolver_credential_id)`;
   - `waiver_allowed` is a boolean;
   - `required_references` is an array of 1 to 10 entries.
2. **`CONDITION_REFERENCE_INVALID`** unless:
   - every reference is `exact(r, [kind, id, sha256])` with `kind` in {`source_record`, `closure`}, `id(id)` and `hex(sha256)`;
   - and the pairs `kind:id` are unique.
3. **`CONDITION_PREDICATE_INVALID`** unless the predicate is exactly one of:
   - `{type: "all_references_current"}`;
   - `{type: "amount_at_most", amount_minor, currency}` with `safe(amount_minor)`, `amount_minor ≥ 0` and `currency(currency)`;
   - `{type: "within_time_window", not_before, not_after}`: two instants with `not_before < not_after`.

## 6. Issuer check `I(doc, signature, now)`

1. **`ISSUER_STATE_ANCHOR_INTEGRITY_FAILED` (503)** unless:
   - the anchor row for `doc.issuer_anchor_id` exists;
   - its `contract_version` is `mvr.authority-chain/1`;
   - its `anchor_id` matches;
   - its `document_sha256 = D(document)`.
2. **`ISSUER_STATE_LAB_ISSUER_REQUIRED` (403)** unless `trust_tier` is `lab_fixture` and `document.anchor_role` is `source_issuer`.
3. **`ISSUER_STATE_ISSUER_INACTIVE` (409)** unless:
   - the status is `active`;
   - `not_before ≤ now < not_after`;
   - the anchor's `jurisdictions` include `doc.geography.country`.
4. **`ISSUER_STATE_WINDOW_INVALID` (422)** unless `doc.valid_until ≤ anchor.not_after`.
5. **`ISSUER_STATE_SIGNATURE_INVALID` (403)** unless `signature` verifies `S(doc.type, doc)` with the anchor's public key.

## 7. Review check `R(doc, now)`, v2 only (all status 422)

**The 15 review fields:**
`type, assertion_sha256, original_document_sha256, clause_text, clause_locator, target_claim, relationship, reviewer_credential_id, standing_sha256, reviewed_at, valid_until, extractor_name, extractor_version, model_version, runtime_model_version`.

Let `b` = `source_review.document`.

1. **`ISSUER_REVIEW_REQUIRED`** unless:
   - `source_review` is an object whose keys are only `document` and `signature_b64`;
   - `signature_b64` is a string of exactly 88 UTF-16 code units;
   - `b` is an object with exactly 15 keys, and every review field is `text(·, limit)`. The limit is 8000 for `clause_text`, 1000 for `target_claim` and 500 otherwise;
   - `b.type` is `mvr.issuer-state-review/1`.
2. **`ISSUER_REVIEW_BINDING_CHANGED`** unless:
   - `b.assertion_sha256 = D(assertion)`;
   - `b.original_document_sha256 = doc.original_document_sha256`;
   - `b.relationship` is one of `direct_support`, `qualifies`, `contradicts`;
   - `b.runtime_model_version` equals the engine constant (`constants.issuer_review_engine_version`, currently `v6.32.0`). Changing engine versions therefore needs fresh reviews.
3. **`ISSUER_REVIEW_PERMISSION_RELATIONSHIP_INVALID`** when `doc.state` is `permitted` and `b.relationship` is not `direct_support`.
4. **`ISSUER_REVIEW_VALIDITY_INVALID`** unless:
   - `b.reviewed_at` (start) and `b.valid_until` (end) are both instants;
   - `start ≤ now < end`;
   - `end − start ≤ 7 days`;
   - `doc.valid_until ≤ end`.
5. **`ISSUER_REVIEW_STANDING_INVALID`** unless, for the credential `b.reviewer_credential_id`:
   - it is usable (§4.2) and its document has a `reviewer_public_key_spki_b64`;
   - its stored `document_sha256 = b.standing_sha256`;
   - its competence jurisdictions include `doc.geography.country`;
   - its residual codes include `PERMISSION_STATUS_UNASSESSED`;
   - `credential.not_before ≤ start` and `credential.not_after ≥ end`.
6. **`ISSUER_REVIEW_SIGNATURE_INVALID`** unless `source_review.signature_b64` verifies `S(b.type, b)` with the reviewer key.
7. **`DECLARED_RELATIONSHIP_TEXT_CONFLICT`** when `doc.state` is `permitted` or `conditional`, `b.relationship` is `direct_support`, and §8 finds a restriction in `b.clause_text`.

**Result:**

```
{reviewer_credential_id, reviewer_principal_sha256 = credential subject_principal_sha256, standing_sha256,
 review_valid_until = b.valid_until, assertion_sha256, legal_truth_asserted: false, source_authenticity_verified: false}
```

## 8. Declared relationship text rule (`declared-relationship-text/1`)

**Matching conventions:**
- Patterns are matched case-insensitively. Only ASCII letters fold.
- `\b` uses ASCII word characters.
- `\s` is the ECMAScript whitespace set (§1.4).
- Matching runs over UTF-16 code units.
- The clause is cut to its first 8192 code units. A review clause is at most 8000, so it is always scanned whole.

**Restrictive pattern:**

```
\b(?:must\s+not|may\s+not|shall\s+not|not\s+(?:authori[sz]ed|permitted|allowed)|does\s+not\s+authori[sz]e|cease\s+(?:distribution|operations|selling|trading)|stop\s+(?:distribution|selling|trading)|prohibited|revoked|suspended|subject\s+to|approval\s+in\s+principle|unless)\b
```

**Rule:** scan the matches left to right. A match that is exactly `revoked`, `suspended` or `prohibited` is skipped when the 30 code units before it end with this pattern:

```
\b(?:not|never|no longer)(?:\s+been)?\s*
```

The space in `no longer` is one literal space. The first match that is not skipped is a restriction.

For example, `has not been revoked` is skipped, and the later `is suspended` in `has not been revoked. Distribution is suspended` is a restriction.

The rule compares the clause with the fixed claim `The subject may perform the requested action.`. That claim always passes the rule's positive-action test and contains no restriction, so for issuer reviews the rule reduces to "a restriction exists in the clause".

This is a bounded English warning heuristic, not a legal reading.

## 9. Registration (`register_issuer_state`)

**Input:** `{document, signature_b64}`, the case named by `document.case_id`, and `now`.

1. `V(doc)`.
2. **`ISSUER_STATE_EXPIRED` (409)** unless `valid_until > now`.
3. `I(doc, signature_b64, now)`.
4. v2: `R(doc, now)`.
5. **`ISSUER_STATE_CASE_UNAVAILABLE` (409)** unless the case status is `active` and it has a `preflight_context`.
6. **`ISSUER_STATE_CASE_SCOPE_MISMATCH` (409)** unless all three match:
   - `doc.subject` equals the first non-empty value of `preflight_context.subject.entity_name`, `preflight_context.subject.entity_id`, `preflight_context.entity_name` and `preflight_context.entity`;
   - `doc.geography.country` equals `market_scope.country`;
   - `doc.geography.region` equals `market_scope.region`, or `null` when that is empty or missing.
7. **v2: `ISSUER_STATE_CASE_ACTION_MISMATCH` (409)** unless `preflight_context.intended_action = doc.action`. The identifiers must be identical; an alias of the same action is refused too. The refusal carries `detail`:
   - `case_intended_action`: `preflight_context.intended_action`, cut to its first 120 UTF-16 code units, or `null` when it is not a string;
   - `issuer_state_action`: `doc.action`;
   - `same_action_by_alias`: `true` when both identifiers name the same action under the alias table below, otherwise `false`;
   - `fix`: `"Use the identical action identifier in the case intended_action and the signed issuer state."`

   **Alias table.** Each legacy name is an alias of one versioned identifier:

   | Legacy name | Versioned identifier |
   |---|---|
   | `create_draft_record` | `amos.document.draft.create@1` |
   | `send_evidence_request` | `amos.communication.evidence.request@1` |
   | `schedule_meeting` | `amos.calendar.meeting.create@1` |
   | `contact_counterparty` | `amos.communication.counterparty.contact@1` |
   | `publish_document` | `amos.document.publish@1` |
   | `commit_spend` | `amos.finance.spend.commit@1` |

   Resolve each identifier through the table (an identifier not in the table resolves to itself). `same_action_by_alias` is `true` when both values are strings, they differ, and they resolve to the same identifier.
8. **Find the slot.** `slot` = `issuer_anchor_id:action`, and `prior` = the head of that slot, or `null`.
9. **Existing record.** If a row already exists for `record_id`:
   - when its `document_sha256 = D(doc)` and its signature is identical, return the idempotent result. The head does not move, so replaying an old record never restores it;
   - otherwise fail with **`ISSUER_STATE_RECORD_CONFLICT` (409)**.
10. **`ISSUER_STATE_SUPERSESSION_REQUIRED` (409)** unless `doc.supersedes = prior`.
11. **`ISSUER_STATE_CASE_LIMIT` (409)** unless the case has fewer than 40 slots or `prior` is not null.
12. **Write.** Store the row with `case_context_sha256 = case.context_sha256` and set `heads[slot] = record_id`.

Concurrent registrations serialize. Each one sees the head the previous one wrote.

**Results**, compared as JSON values (key order is irrelevant). `N` = `{issued_by_amos: false, amos_authorization: false, authority_source: "institution_signature_only", real_world_identity_verified_by_amos: false}`.

- **Registered:**

  ```
  {status: "registered", issuer_state: {record_id, state, supersedes, lab_fixture: true, production_authority: false},
   dependents_rechecked_on_next_read: true, …N}
  ```

- **Idempotent:**

  ```
  {status: "registered", issuer_state: {record_id, state, lab_fixture: true}, idempotent_record: true, …N}
  ```

- **Refused:** `{status, http_status, code, …N}`. `status` is:
  - `system_unavailable` at 500 or above;
  - `forbidden` at 403;
  - `not_found` at 404;
  - `conflict` at 409;
  - otherwise `invalid_input`.

## 10. Evaluation (current issuer state of a case)

It fails as a whole with **`ISSUER_STATE_INDEX_INVALID` (503)** if the case has more than 40 slots. Otherwise, for each slot in head order, with `saved` the stored row and `doc = saved.document`:

1. **`ISSUER_STATE_INTEGRITY_FAILED`** unless all of these hold:
   - the row and document exist;
   - `doc.record_id` is the head's record id;
   - `doc.case_id` is the case's id;
   - the slot equals `doc.issuer_anchor_id:doc.action`;
   - `saved.case_context_sha256` equals the case's `context_sha256`;
   - `saved.document_sha256 = D(doc)`.
2. `V(doc)`, then `I(doc, saved.signature_b64, now)`, then for v2 `review = R(doc, now)`.
3. Then the first of these that applies:
   1. `valid_from > now` → `ISSUER_STATE_NOT_YET_VALID`;
   2. `valid_until ≤ now` → `ISSUER_STATE_EXPIRED`;
   3. state `prohibited` → `ISSUER_STATE_PROHIBITED`; state `revoked` → `ISSUER_STATE_REVOKED`;
   4. v2: `condition_resolution` = §11. If it is not satisfied → `ISSUER_STATE_CONDITIONS_UNRESOLVED`;
   5. v1: a state other than `permitted`, or any condition at all → `ISSUER_STATE_CONDITIONAL` for a conditional state, otherwise `ISSUER_STATE_CONDITIONS_UNRESOLVED`. Text conditions never resolve.

A failing check in steps 1 and 2 becomes the row's reason. A failure without a code becomes `ISSUER_STATE_UNAVAILABLE`.

The review is checked before the dates. So once a review has expired, the reason is `ISSUER_REVIEW_VALIDITY_INVALID`, even if the state itself has also expired.

**Row:**

```
{record_id, issuer_anchor_id, action, state ("unavailable" without a document), blocking: reason ≠ null, reason,
 valid_until, conditions ([] if none), supersedes, document_sha256 (stored), lab_fixture: true}
```

A v2 row adds `review` (null if `R` failed), `condition_resolution` (null if not reached) and `ceiling`. Missing or empty `issuer_anchor_id`, `action`, `valid_until`, `supersedes` and `document_sha256` are `null`.

**Result:**

```
{contract: "mvr.issuer-state/1", states, blocking: any row blocking, caller_labels_override: false,
 prose_is_supporting_material: true, production_authority: false}
```

The `contract` value stays `mvr.issuer-state/1` for both document versions.

## 11. Conditions (v2)

The scope is `{scope_sha256: D(condition_scope), amount_minor: ceiling.amount_minor, currency: ceiling.currency}`. An `amount_at_most` condition is therefore tested against the ceiling the issuer signed. Capability verification separately keeps each effect at or below that ceiling (§12).

Each condition is processed in order. **A receipt matches** a condition when its `document.condition_sha256` equals `D(condition)` and its `document.resolver_credential_id` equals the condition's resolver. Exactly one receipt must match; otherwise the result is `CONDITION_UNIQUE_RECEIPT_REQUIRED`. The matching receipt is then checked:

1. **`CONDITION_SCOPE_REQUIRED`** unless the scope is well formed. It always is for a valid document.
2. **`CONDITION_SIGNED_RECEIPT_REQUIRED`** unless:
   - the receipt is `exact(·, [document, signature_b64])`;
   - its signature is a string of exactly 88 code units.
3. **`CONDITION_RECEIPT_INVALID`** unless the receipt document `d` satisfies all of these:
   - `exact(d, [type, receipt_id, condition_sha256, scope_sha256, resolver_credential_id, disposition, reason, issued_at, expires_at])`;
   - `type` is `mvr.condition-resolution/1`;
   - `id(receipt_id)`;
   - `condition_sha256 = D(condition)`;
   - `scope_sha256` equals the scope's;
   - the resolver matches;
   - `disposition` is `satisfied` or `waived`;
   - `reason` is a string with a non-whitespace character and at most 1000 code units;
   - `issued_at` and `expires_at` are instants, with `issued_at ≤ now < expires_at` and `expires_at − issued_at ≤ 1 day`.
4. **`CONDITION_WAIVER_NOT_AUTHORIZED`** when the disposition is `waived` and `waiver_allowed` is false.
5. **`CONDITION_RESOLVER_INVALID`** unless, for the resolver credential:
   - it is usable (§4.2) and its document has a reviewer key;
   - `credential.not_before ≤ issued_at`;
   - its competence includes the document's country and `PERMISSION_STATUS_UNASSESSED`;
   - the receipt signature verifies `S(d.type, d)` with that key;
   - `subject_principal_sha256` is `hex`;
   - `credential.not_after ≥ expires_at`.
6. **`CONDITION_DEPENDENCY_INACTIVE`** unless every reference is current and unchanged:
   - **`source_record`:** the source state (§4.3) is usable, its `jurisdiction` equals the document's country, and `D(source document) = sha256`;
   - **`closure`:** the closure state (§4.4) is usable, its `content.case_id` equals `doc.case_id`, and the stored `content_sha256 = sha256`.

   A waiver never revives revoked or altered evidence.
7. **`CONDITION_PREDICATE_FALSE`** when the predicate does not hold and the disposition is not `waived`:
   - `all_references_current` always holds;
   - `amount_at_most` holds when the scope currency equals the predicate currency and the scope amount is at most the predicate amount;
   - `within_time_window` holds when `not_before ≤ now < not_after`.
8. **Satisfied:**

   ```
   {condition_id, satisfied: true, disposition, receipt_id, resolver_principal_sha256, valid_until, source_truth_asserted: false}
   ```

   `valid_until` is the earlier of `expires_at` and, for a time window that was not waived, `not_after`.

A blocked condition is `{condition_id, satisfied: false, reason}`. An unexpected failure during steps 5–7 is `CONDITION_DEPENDENCY_UNAVAILABLE`, not `CONDITION_RESOLVER_INVALID`. That includes a resolver key or receipt signature that is not decodable base64.

**Result:** `{satisfied: every condition satisfied (true when there are none), conditions, scope_sha256}`.

## 12. Contribution to capability verification

At each `verify_capability`, AMOS evaluates the case again (§10) at that instant. The capability supplies `effect_type` T and `accepted_open_residuals`, and the request supplies `amount_minor` and `currency`.

1. **Issuer-state reasons**, in head order, all blocking reasons first:
   - each blocking row whose `action` is null or T contributes its `reason`;
   - then each row whose `action` is T and that has a `ceiling` contributes `ISSUER_STATE_CEILING_EXCEEDED` when the requested currency differs from the ceiling currency or the requested amount is above it. This also applies to a row that is not blocking.
2. **Case contradiction.** If the evaluation is blocking for any action, the case carries an open `REVIEW_CONTRADICTION` residual. Verification then reports `CASE_ACTIVE_CONTRADICTION`, plus `UNACCEPTED_OPEN_RESIDUAL:REVIEW_CONTRADICTION` unless `REVIEW_CONTRADICTION` is in `accepted_open_residuals`. **One blocking issuer state therefore holds the whole case, including unrelated actions.** An active reviewer attestation linked to the case with the relationship `contradicts` has the same effect. The vectors contain none.
3. **Other capability rules** are published with the authority conformance (`../authority/`), not here. They cover the capability's own signature and window, closures, executor binding, resource, amount cap, currency and uses. The vectors list any such reasons as `other_reasons`.

The decision is `allow` exactly when all three lists are empty.

## 13. Not established

- Signatures prove which configured lab key signed. They do not prove that a document is true, that its original exists, or that anyone has legal authority.
- Version 2 issuer state is lab-only. No production issuer is active.
- AMOS wrote both this file and `check.py`. `check.py` is a separate implementation in another language, sharing no code with AMOS. It is not an independent party's work. An outside implementation is still to come.
