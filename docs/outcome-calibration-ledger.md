# Outcome Calibration Ledger

The MVR outcome calibration ledger is an active prospective collection system. It links an eligible live MVR decision receipt to later observed outcomes without treating self-reported results as model truth.

Public status:

- `GET https://africanmarketos.com/.well-known/mvr-outcome-calibration.json`

Licensed tenant routes:

- `POST /v1/outcome-ledger`
- `POST /v1/outcome-feedback` (compatibility route for enrolled observations)
- `POST /v1/calibration-review`

## What Activation Means

Activation means MVR can offer governed follow-up for eligible decisions, bind independently recorded human consent, enroll a receipt once, and schedule later check-backs. It does **not** mean that MVR has published predictive accuracy, causal impact, or an outcome-validated performance rate.

Public performance remains withheld until there are at least:

- 50 unique prospectively enrolled decisions with an independently reviewed, included observation
- 3 represented geographies

Any later release must lock the cohort, denominator, horizons, exclusions, uncertainty, misses, and abstentions. Observed association is not proof that MVR caused an outcome.

## 1. Receive a Passive Follow-up Offer

An eligible live `mvr_decision_check` response can include `outcome_followup_offer`. The offer is passive:

- no enrollment has occurred
- no consent has been inferred
- no outcome has been recorded
- a model cannot approve or issue consent

The offer is limited to live Enterprise decisions in `evidence_backed` or `compiled_evidence` mode. This keeps enrollment and independent calibration review on one governed tenant plan. Sandbox calls, Standard or Pro calls, strict trials, backtests, synthetic fixtures, and retrospective reconstructions are excluded. Bounded verdicts and explicitly persisted abstentions can be followed; an abstention remains an abstention.

Enrollment must begin within seven days of the eligible decision. The decision receipt, tenant, workspace, decision state, country, mode, and timestamp are read from the server-side snapshot rather than caller-authored replacements.

## 2. Record Human Consent Outside MVR

The organization must first record authorized-human consent in its own governed system. Keep names, email addresses, signatures, forms, and other personal data outside MVR.

Create a SHA-256 hash of that external consent record. An elevated owner, administrator, policy, operations, or compliance actor can then request a short-lived token:

```bash
curl -sS https://africanmarketos.com/v1/outcome-ledger \
  -H "X-API-Key: $MVR_OPERATOR_API_KEY" \
  -H "Idempotency-Key: outcome-consent-0123456789abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "issue_consent_token",
    "subject_reference": "internal-case-reference-042",
    "decision_reference_hash": "REPLACE_WITH_64_HEX_MVR_RECEIPT",
    "horizon_months": [6, 12, 18],
    "consent_attestation": {
      "confirmed_by_authorized_human": true,
      "consent_version": "mvr-outcome-consent@2026-07-24.2",
      "followup_owner_role": "decision_owner",
      "recorded_at": "2026-07-24T08:00:00Z",
      "record_reference_hash": "REPLACE_WITH_64_HEX_EXTERNAL_CONSENT_RECORD_HASH"
    }
  }'
```

`confirmed_by_authorized_human` is an operator attestation to an external record. It is not independent identity proof. The server returns `consent_token_once` only once. The token expires after 30 minutes and is bound to the decision receipt, hashed subject reference, tenant, workspace, and horizons.

Allowed follow-up-owner roles are:

- `decision_owner`
- `authorized_delegate`
- `organizational_reviewer`

## 3. Enroll Once

Use the one-time token with the same subject reference and horizons:

```bash
curl -sS https://africanmarketos.com/v1/outcome-ledger \
  -H "X-API-Key: $MVR_API_KEY" \
  -H "Idempotency-Key: outcome-enroll-0123456789abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "enroll",
    "consent_token": "REPLACE_WITH_ONE_TIME_TOKEN",
    "subject_reference": "internal-case-reference-042",
    "decision_reference_hash": "REPLACE_WITH_64_HEX_MVR_RECEIPT",
    "horizon_months": [6, 12, 18]
  }'
```

The raw subject reference is not persisted. The service stores a tenant-scoped, server-keyed HMAC-SHA256 token. One decision receipt can create only one prospective enrollment. Replaying a consent token fails closed, while repeating an already enrolled receipt cannot inflate the cohort.

The response returns an `enrollment_id`, immutable `ledger_anchor_hash`, and scheduled check-backs. Each enrolled horizon remains independent. Reviewing the 6-month observation does not close the 12- or 18-month follow-up.

## 4. Record a Due Outcome

An observation must name one enrolled horizon and cannot be recorded before that check-back is due.

```bash
curl -sS https://africanmarketos.com/v1/outcome-feedback \
  -H "X-API-Key: $MVR_API_KEY" \
  -H "Idempotency-Key: outcome-observe-0123456789abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "enrollment_id": "OCL-REPLACE",
    "consent_to_outcome_processing": true,
    "horizon_months": 6,
    "outcome_class": "mixed",
    "decision_execution_status": "within_authorized_boundary",
    "verification_status": "document_supported",
    "outcome_date": "2027-01-24T08:00:00Z",
    "source_references": [
      {
        "reference_id": "governed-redacted-review-001",
        "source_class": "governed_internal_record",
        "source_hash": "REPLACE_WITH_64_HEX_SOURCE_HASH"
      }
    ]
  }'
```

Bounded values:

- `outcome_class`: `favorable`, `mixed`, `unfavorable`, `indeterminate`
- `decision_execution_status`: `within_authorized_boundary`, `beyond_authorized_boundary`, `not_executed`, `unknown`
- `verification_status`: `self_reported`, `document_supported`, `independently_verified`, `disputed`

Do not send names, email addresses, phone numbers, addresses, account data, raw documents, interview transcripts, credentials, attachments, `outcome_summary`, or other free text. Submit bounded enums and governed references/hashes only. The raw `reference_id` is converted to a tenant-scoped server-keyed token before persistence; `source_hash` remains the content-integrity reference. A self-reported observation cannot enter the calibration corpus.

## 5. Independent Review

Bulk incorporation is disabled. Each observation requires an elevated reviewer who is different from the submitting actor.

```bash
curl -sS https://africanmarketos.com/v1/calibration-review \
  -H "X-API-Key: $MVR_REVIEWER_API_KEY" \
  -H "Idempotency-Key: outcome-review-0123456789abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "review_outcome",
    "enrollment_id": "OCL-REPLACE",
    "observation_id": "OCO-REPLACE",
    "disposition": "include",
    "reason_code": "source_verified",
    "reviewer_attestation": true,
    "review_note": "The governed source reference supports the bounded outcome classification."
  }'
```

Only `source_verified` or `independent_confirmation` can support inclusion. Exclusion, deferral, and dispute dispositions have bounded reason codes and fail closed when the reason contradicts the disposition. A supplied `review_note` is stored only as a keyed hash; the free text itself is not retained.

## 6. Inspect or Withdraw

The enrolling actor or an elevated reviewer can retrieve an enrollment. Elevated reviewers can list tenant enrollments and view metrics. Withdrawal deletes the case-bearing enrollment and all observations. A 90-day HMAC-pseudonymized audit tombstone remains for deletion accountability.

```json
{
  "action": "withdraw",
  "enrollment_id": "OCL-REPLACE",
  "confirm_withdrawal": true
}
```

To preserve a non-cherry-picked cohort denominator after withdrawal, the seven-year screening register and any locked first-cohort manifest retain only the member ordinal, a versioned server-keyed HMAC cohort token, bounded offer/enrollment/withdrawal timestamps, and aggregate counters. The withdrawal path removes the decision-reference hash and enrollment ID from those retained records. It retains no raw subject reference, contact field, evidence, or narrative. Organizations should disclose this bounded governance retention and align consent notices and internal retention policy before enrolling real decisions.

The `metrics` action also returns an identity-free `first_cohort_screening` block with eligible offers, consent tokens issued, enrollments, explicit declines, expired consent windows, duplicate attempts, and withdrawals. It is observational: it does not create or rewrite the first-cohort manifest. Enrollment and decline mutations finalize a determinable manifest under the screening lock, while the scheduled follow-up job resolves expiry-only transitions. An elevated operator can record an explicit decline with `action: "decline_followup"` and a bounded `decline_reason_code`; silence is counted only as an expired window after seven days and is never treated as an outcome.

## 7. Daily Follow-up Operations

The production scheduler scans the outcome queue once per day. It persists an aggregate operational summary and sends an operator alert when at least one check-back is due or an observation awaits governed review.

The summary is intentionally identity-free. It contains only:

- active enrollment count
- scheduled check-back count
- check-backs due now
- check-backs overdue by at least 30 days
- check-backs due in the next 30 days
- observations pending governed review
- due counts grouped by enrolled horizon month

It does not contain subject tokens, enrollment IDs, tenant or workspace identifiers, decision details, evidence references, contact data, or raw records.

## First Cohort

The first-cohort operating contract is published at [outcome-first-cohort-operating-pack.md](outcome-first-cohort-operating-pack.md). It governs the first ten consecutively eligible and consented decisions within one Enterprise tenant/workspace as an operational cohort, not a global denominator or performance cohort. Membership locks only after earlier consent windows resolve; a later withdrawal retains its locked slot and does not permit replacement.

## Method Boundary

- Prospective outcomes and retrospective backtests are separate cohorts.
- Selection, usage, lead, and crawler telemetry are not outcome evidence.
- An abstention is recorded as a prediction behavior, not silently converted into a failure or success.
- Multiple horizon observations from one enrollment do not create multiple decisions in the 50-decision publication floor.
- Repeated or replacement observations cannot bypass review.
- Silence, missing follow-up, or withdrawal is not imputed as a favorable or unfavorable outcome.
- The live engine does not automatically learn from a submitted outcome.

Run the public contract validators:

```bash
python scripts/validate_outcome_calibration_contract.py
python scripts/validate_outcome_calibration_contract.py --live
python scripts/validate_outcome_first_cohort.py
```
