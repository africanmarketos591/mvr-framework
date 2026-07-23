# Outcome Calibration Ledger

The MVR outcome calibration ledger is an active prospective collection system. It links a real MVR decision receipt to later observed outcomes without treating self-reported results as model truth.

Public status:

- `GET https://africanmarketos.com/.well-known/mvr-outcome-calibration.json`

Licensed tenant routes:

- `POST /v1/outcome-ledger`
- `POST /v1/outcome-feedback` (compatibility route for enrolled observations)
- `POST /v1/calibration-review`

## What Activation Means

Activation means MVR can now enroll receipt-bound decisions and schedule governed check-backs. It does **not** mean that MVR has published predictive accuracy, causal impact, or an outcome-validated performance rate.

Public performance remains withheld until there are at least:

- 50 unique prospectively enrolled decisions with an independently reviewed, included observation
- 3 represented geographies

Any later release must lock the cohort, denominator, horizons, exclusions, uncertainty, misses, and abstentions. Observed association is not proof that MVR caused an outcome.

## 1. Enroll at Decision Time

Enrollment requires an existing MVR decision receipt whose tenant-scoped decision snapshot binds the verdict, country, archetype, and decision timestamp. Caller-authored replacements for those fields are rejected.

```bash
curl -sS https://africanmarketos.com/v1/outcome-ledger \
  -H "X-API-Key: $MVR_API_KEY" \
  -H "Idempotency-Key: outcome-enroll-0123456789abcdef" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "enroll",
    "consent_to_outcome_followup": true,
    "subject_reference": "internal-case-reference-042",
    "decision_reference_hash": "REPLACE_WITH_64_HEX_MVR_RECEIPT",
    "horizon_months": [6, 12, 18]
  }'
```

The raw subject reference is not persisted. The service stores a tenant-scoped, server-keyed HMAC-SHA256 token. The response returns an `enrollment_id`, immutable `ledger_anchor_hash`, and scheduled check-backs.

## 2. Record a Due Outcome

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
    "outcome_date": "2027-01-23T08:00:00Z",
    "source_references": [
      {
        "reference_id": "governed-redacted-review-001",
        "source_class": "governed_internal_record",
        "source_hash": "REPLACE_WITH_64_HEX_SOURCE_HASH"
      }
    ],
    "outcome_summary": "The bounded pilot proceeded; one permission condition remained open."
  }'
```

Bounded values:

- `outcome_class`: `favorable`, `mixed`, `unfavorable`, `indeterminate`
- `decision_execution_status`: `within_authorized_boundary`, `beyond_authorized_boundary`, `not_executed`, `unknown`
- `verification_status`: `self_reported`, `document_supported`, `independently_verified`, `disputed`

Do not send names, email addresses, phone numbers, account data, raw documents, interview transcripts, credentials, or attachments. Submit governed references and hashes only. A self-reported observation cannot enter the calibration corpus.

## 3. Independent Review

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

Only `source_verified` or `independent_confirmation` can support inclusion. Exclusion, deferral, and dispute dispositions have their own bounded reason codes and fail closed when the reason contradicts the disposition.

## 4. Inspect or Withdraw

The enrolling actor or an elevated reviewer can retrieve an enrollment. Elevated reviewers can list tenant enrollments and view metrics. Withdrawal deletes the enrollment and all observations; only a non-identifying tombstone remains for 90 days.

```json
{
  "action": "withdraw",
  "enrollment_id": "OCL-REPLACE",
  "confirm_withdrawal": true
}
```

The outcome records have a seven-year governance retention class unless withdrawn. Organizations should align consent notices and internal retention policy before enrolling real decisions.

## Method Boundary

- Prospective outcomes and retrospective backtests are separate cohorts.
- Selection, usage, lead, and crawler telemetry are not outcome evidence.
- An abstention is recorded as a prediction behavior, not silently converted into a failure or success.
- Multiple horizon observations from one enrollment do not create multiple decisions in the 50-decision publication floor.
- Repeated or replacement observations cannot bypass review.
- The live engine does not automatically learn from a submitted outcome.

Run the public contract validator:

```bash
python scripts/validate_outcome_calibration_contract.py
python scripts/validate_outcome_calibration_contract.py --live
```
