# Calibration Attestation and Outcome Scope

Application revision: `2026-09-06.engine-contract.7`. This documents technical contracts, not scientific validation or institutional approval.

## Readiness Is Not One Boolean

`GET /v1/calibration-health` runs representative runtime checks. In `full_advisory`, unperformed manifest/freshness checks are `null`, not failed checks. The strict report actually checks the representative assets' manifests. Compare the same profile and scope before comparing flags.

`GET /v1/calibration-health?coverage=full` additionally checks every enumerated manifest against its stored asset. It fails closed when the inventory is unavailable/empty, a namespace cannot be mapped, or an asset fails schema, approval, freshness, or hash checks. Assets with no manifest are outside this enumeration; this is not proof of a complete inventory of every KV value.

`GET /v1/calibration-readiness` and `POST /v1/admin/calibration-readiness` use those same two implementations. The export always includes full-manifest coverage. Read:

- `strict_calibrated_report`: representative runtime checks;
- `full_coverage`: inventory-wide counts and failure reasons;
- `full_corpus_attested`: true only when both checks pass;
- `calibration_attestation_status` and the `full_manifest_matrix` procurement check.

`status: ok` means the document was generated. It does not mean every check passed. A failed asset outside the representative set must make `full_corpus_attested` false even if the smoke check passes. Separate live requests are observations at different times, not an atomic KV snapshot.

By default, the export carries aggregate full-coverage counts, not private asset names or values. Authorized operators may explicitly request full reports. Approval metadata and matching content hashes do not establish empirical accuracy, source truth, ownership, or independent validation.

The document's SHA-256 supports content-integrity checking, not author authentication. Optional HMAC requires a server-held secret and is not public-key third-party attestation. Never disclose the secret to a buyer. A provenance discrepancy must be reconciled against an approved source; computing a fresh hash alone cannot approve an asset.

Quarantined, revoked, or retired manifests are excluded from both strict and advisory model use, including the public pulse path. They remain in the full inventory denominator and make full-corpus attestation fail. `quarantined_records`, `attested_records`, `active_manifest_records`, and `active_manifest_attestation_status` distinguish active coverage from unresolved historical records. An active-subset pass is not a full-corpus pass. Recovery preserves the original artifact hashes and approval history; restoration requires source reconstruction and authorized review, not merely re-hashing.

## Three Different Outcome Surfaces

| Surface | What it establishes |
| --- | --- |
| `/v1/outcomes/benchmark-delta` | Arithmetic difference between caller-supplied baseline/current scores. Its empty GET is guidance, not a database census or model comparison. |
| `/v1/outcome-ledger`, `action: metrics` | Authenticated tenant/workspace counts and publication-gate status. Inspect pagination and scope. Zero here is not automatically zero across all tenants. |
| `/v1/backtest-case/submit` | Retrospective case registration, separate from prospective consent, enrollment, observation, and review. |

The [existing outcome protocol](outcome-first-cohort-operating-pack.md) preserves actual decision receipts, explicit operator-attested human consent, scheduled horizons, independent review, and withdrawal. A snapshot lock is not consent to follow-up. Synthetic tests and retrospective cases are not prospectively observed customers.

Neither 10, 50, nor 100 cases by itself establishes superiority. A performance study also needs a prespecified comparator, population, endpoints, case independence, uncertainty, exclusions, abstentions, and missingness accounting. Operational usefulness can be evaluated earlier without presenting it as predictive validation.

## Integration Scope

The broad REST catalogue deliberately includes operations with incomplete request schemas and differing maturity labels. It is not an assertion that every route is stable or a finished SDK workflow. The keyless first-call contract, licensed DecisionCheckRequest/EvidenceItem definitions, evidence-completeness schema, and consent-gated outcome-ledger schema already exist. The prior release added inputs for calibration-readiness export, snapshot lock, and benchmark-delta. This release adds programme evidence-workflow inputs, including context compilation and snapshot creation. These documentation changes do not promote maturity labels, broaden authorization, or automatically share private founder reflections.

Published evidence fields include `evidence_origin`, `collection_method`, `source_family`, `provenance_ledger`, `privacy_envelope`, and `structured_values`. See the [canonical REST specification](https://africanmarketos.com/api/openapi.agent.json), [runtime schema](https://africanmarketos.com/v1/schema), and [declared-lineage contract](declared-evidence-lineage-2026-09-06.md). Structural admission and declared source diversity do not authenticate sources or establish independent observations.

The [benchmark status map](benchmark-status-map.md) distinguishes authored development fixtures, configured-host selection tests, and the unfinished comparative protocol. Do not combine their numbers or call fixtures vendor executions.
