# First Outcome Cohort Operating Pack

Protocol: `mvr-outcome-first-cohort@2026-07-24.1`

This pack governs the first ten MVR decisions used to certify that prospective outcome collection operates correctly. It does not estimate predictive performance and it does not reduce the public publication floor.

## Purpose

The first cohort is scoped to one governed Enterprise tenant/workspace. It is not a global or cross-tenant MVR denominator. It tests whether that tenant/workspace can:

1. bind an eligible live decision to its original receipt
2. obtain externally recorded authorized-human consent
3. enroll each decision at most once
4. schedule 6-, 12-, and 18-month observations
5. keep personal data and raw evidence outside MVR
6. preserve abstentions and bounded verdicts without reinterpretation
7. separate outcome submission from independent review
8. withdraw and delete records when consent is withdrawn

## Cohort Rule

The cohort contains the first 10 eligible live decision receipts within one tenant/workspace that complete operator-verified consent and enrollment within seven days of the original decision.

Selection is consecutive by server-recorded eligible decision time, with the decision-reference hash as a deterministic tie-breaker. The server does not lock membership while any earlier offer still has an unresolved consent window. Once the first ten completed enrollments can be determined without a pending earlier case, it persists a tenant/workspace-scoped cohort manifest. Later state changes cannot rewrite that manifest. A case cannot be skipped because its verdict, geography, organization, later conduct, or expected outcome is inconvenient.

Withdrawal does not create a replacement slot. A decision that completed enrollment remains one of the locked ten and is marked withdrawn, while its case-bearing enrollment and observations are deleted under the withdrawal contract.

The authenticated `action=metrics` response exposes the same tenant/workspace's bounded `first_cohort_screening` register with:

- eligible offers
- consent tokens issued
- enrollment completed
- consent declined
- consent not completed within seven days
- duplicate enrollment attempts
- withdrawn enrollments

The response contains no names, email addresses, raw subject references, evidence, tenant identifiers, or decision narratives. It includes a one-way scope-reference hash and locked decision-reference hashes so membership can be audited inside the governed tenant/workspace.

## Eligibility

Include only decisions whose server-side snapshot confirms:

- live evaluation
- Enterprise plan
- same tenant/workspace as the screening and cohort manifest
- `evidence_backed` or `compiled_evidence` mode
- supported country
- bounded verdict or explicitly persisted `abstained` state
- non-sandbox
- non-trial
- non-backtest
- decision receipt persisted successfully
- outcome-follow-up offer persisted on the original response
- consent token requested and consumed within the seven-day enrollment window
- exact follow-up horizons `[6, 12, 18]`

Exclude:

- public or licensed sandboxes
- strict trials and canaries
- synthetic fixtures
- retrospective or backtest cases
- score-direct and exploratory calls
- reconstructed historical decisions
- cases without an external consent-record hash

## Roles

Each case has four accountable functions:

- **Decision owner:** controls the external consent relationship.
- **Consent issuer:** an elevated operator who attests to the external consent record and issues the one-time token.
- **Outcome submitter:** records the bounded observation when due.
- **Independent reviewer:** reviews the observation and must not be the submitting actor.

One person may hold the first two functions if authorized by the organization. The outcome submitter and independent reviewer must remain separate.

## Consent Procedure

1. The decision owner records consent outside MVR using the organization's approved notice.
2. The external record states the follow-up purpose, 6/12/18-month horizons, withdrawal route, retention class, and responsible owner role.
3. The consent issuer hashes the governed external record with SHA-256.
4. The issuer calls `action=issue_consent_token` with only the bounded attestation and hash.
5. The one-time token is used within 30 minutes for `action=enroll`.
6. The token is never logged, emailed, copied into an AI prompt, or retained after use.
7. Consent issuance, decline, enrollment, duplicate counting, and screening updates are serialized under one tenant/workspace screening mutation lock.

The MVR response does not prove identity. It proves only that an authorized operator attested to an external consent record and used a receipt-bound token.

## Observation Procedure

At each due horizon:

1. Confirm the horizon is due.
2. Inspect governed sources outside MVR.
3. Classify the result using the bounded outcome and execution enums.
4. Submit only reference IDs, bounded source classes, and hashes. The server persists reference IDs only as tenant-scoped HMAC tokens.
5. Keep the observation pending until a separate reviewer acts.
6. Do not submit free-text summaries and do not infer an outcome from silence, non-response, missing evidence, or withdrawal.

Domain-specific review questions:

| Decision domain | Questions for the governed source review |
| --- | --- |
| Market entry or pilot | Did the organization act within the authorized boundary? Did the bounded pilot continue, stop, or remain indeterminate? |
| Partnership | Did the proposed relationship form and remain operative within the agreed boundary? Were guardian or stakeholder conditions satisfied, disputed, or unresolved? |
| Investment | Did the observed milestone occur within the original decision scope? Was later action inside or beyond the authorized boundary? |
| Credit-adjacent | Did the non-credit preflight boundary hold? Was any lending or underwriting decision routed to the responsible licensed or human authority? |

These questions do not authorize launch, lending, investment, partnership, legal compliance, or regulatory approval.

## Review Procedure

The independent reviewer verifies:

- receipt and enrollment binding
- horizon due date
- source-reference hash availability
- classification support
- original authorization boundary
- submitter/reviewer separation
- absence of personal or raw evidence

Possible dispositions are `include`, `exclude`, `defer`, and `disputed`. Inclusion requires `source_verified` or `independent_confirmation`.

## Operational Acceptance

The first-cohort operation passes only when:

- one tenant/workspace-scoped first-ten manifest is persisted as `locked`
- receipt binding: 100%
- valid human-consent token binding: 100%
- duplicate decision enrollments: 0
- premature observations accepted: 0
- personal-data leaks in stored or returned records: 0
- self-reviewed observations included: 0
- scheduled horizons present: 100%
- withdrawals leave active records: 0
- withdrawn locked slots replaced: 0
- abstentions silently relabeled as outcomes: 0

Incomplete follow-up is reported as incomplete follow-up. It is not a model miss or success.

## Publication Boundary

The first ten cases are an operating cohort only. No accuracy, lift, reliability, failure-rate, calibration, or causal-impact number may be published from it.

A public performance result remains withheld until at least 50 unique prospectively enrolled decisions have an independently reviewed included observation and at least three geographies are represented. Any release then requires a separately locked protocol, denominator, horizons, exclusions, uncertainty, misses, and abstentions.

Machine-readable contract:

- `evaluations/outcome-first-cohort-v1/protocol.json`

Runtime certification must exercise the pending-earlier-window, out-of-order consent, immutable lock, withdrawal-slot, cross-tenant isolation, exact-horizon, and decline-versus-enrollment cases named in the machine protocol. A passing document validator alone is not runtime certification.

Validator:

```bash
python scripts/validate_outcome_first_cohort.py
```
