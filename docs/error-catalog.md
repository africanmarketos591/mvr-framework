# MVR API Error Catalog

Common public and sandbox responses:

- `401` or `403`: missing key, invalid key, unauthorized route, sandbox profile violation, or crawler training blocked.
- `400`: malformed JSON, invalid response profile, invalid output mode, or missing required request fields.
- `422`: evidence is insufficient, strict calibrated mode cannot safely proceed, or the request asks for an unsupported claim.
- `429`: rate limit reached. Use the licensed access path for recurring workflows.
- `5xx`: system or upstream failure. Retry with idempotency where applicable.

Designed abstention is not a failure. If MVR returns insufficient evidence, ask for the missing proof instead of forcing a confident answer.

Production and commercial access:

https://africanmarketos.com/get-api-key

## Stable codes added 2026-10-26

**Credentials:**
- `401 INVALID_CREDENTIAL`: the key is unknown, expired or inactive. This answer is always the same for a key no store holds, and it never depends on the paid-entitlement store.
- `503 CREDENTIAL_AUTHORITY_UNAVAILABLE`: a known paid key whose entitlement cannot be confirmed right now. Retry after `Retry-After`.
- `503 CREDENTIAL_STORE_UNAVAILABLE`: the key store could not be read. Retry after `Retry-After`.

**Review cases:**
- `REVIEW_DESIGNATION_INVALID`, with `detail.reasons`. The designation was refused for one of these reasons:
  - `DESIGNATION_NOT_BOUND_TO_ACCOUNT`
  - `DESIGNATION_COMPETENCE_MISSING`
  - `DESIGNATION_JURISDICTION_MISSING`
  - `DESIGNATION_CONFLICT_DECLARED`
  - `DESIGNATION_SAME_ORGANIZATION_AS_SUBJECT`
  - or a credential state such as `CREDENTIAL_REVOKED`
- `REVIEW_DESIGNATION_CASE_CREATOR`: the case creator tried to act as the designated reviewer.
- `REVIEW_RESTRICTIVE_WORDING_ACKNOWLEDGEMENT_REQUIRED`: a designated approval of restrictive wording needs `acknowledge_restrictive_wording: true`.
- `REVIEW_TOOLS_EFFECT_TYPE_UNKNOWN`: a modelled effect identifier that is not in the action ontology.
- `REVIEW_INTERPRETATION_TASK_MISMATCH`, `REVIEW_INTERPRETATION_TASK_NOT_FOUND`, `INTERPRETATION_ATTRIBUTION_INVALID`, `INTERPRETATION_DISPOSITION_INVALID`: errors in interpretation tasks, attributions or dispositions.
- `REVIEW_RECORDING_ACCOUNT_REQUIRED`: only the recording reviewer can withdraw a review.
- `REVIEW_DECISION_DEPENDENCIES_CURRENT`: a dependency check found nothing to record.
- `REVIEW_DECISION_INTEGRITY_FAILED (503)`: the stored decision journal does not match its head.

**Authority chain** (deny reasons, not errors):
- `REVIEW_EFFECT_PENDING`, `REVIEW_EFFECT_ADVERSE`, `REVIEW_EFFECT_REVOKED`
- `REVIEW_EFFECT_NOT_MODELLED`, `REVIEW_EFFECT_ALIAS_MISMATCH:<id>`
- `REVIEW_CONDITION_UNMET:<type>`
- `SEPARATION_OF_DUTIES_EXECUTOR_REVIEWED`, `SEPARATION_OF_DUTIES_APPROVER_REVIEWED`, `SEPARATION_OF_DUTIES_APPROVER_EXECUTES`

`ISSUER_STATE_CASE_ACTION_MISMATCH` now carries a `detail` naming both identifiers, and `same_action_by_alias`.

**Explain:**
- `NARRATIVE_MODE_UNSUPPORTED`: `narrative_mode` must be one of `technical`, `analyst`, `executive`, `board`, `client_safe` or `field_team`.
