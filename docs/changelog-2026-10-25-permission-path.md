# Changelog: 2026-10-25.permission-path.2

`2026-10-25.permission-path.1` was deployed at 12:35 UTC on 25 October and replaced by `.2` the same day. The licensed live check found that keys using the `client_safe` output mode got `status: ok` from `check_permission`, `commit_effect`, `record_effect` and the outcome ledger actions without their result fields (`permission_position`, `dependency_graph`, `commit_id`, `committed_at`, `commit_valid_until`, `commit_time_check_performed`, `outcome_entry`, `review_outcome_ledger`), because the per-route output allowlists predated these actions. The filter removed fields only and changed no decision; the isolated evaluation route was unaffected. `.2` passes these fields, plus `action` and `issuer_state`, which the published authority contract already declared. All release evidence is from `.2`.

## Added

- **Permission position.** `check_permission` on `/v1/authority-chain` returns the permission level for one exact effect (`prohibited`, `not_permitted`, `planning_only`, `conditionally_permitted`, `permitted_up_to_ceiling`, `fully_permitted`), the narrowest action still allowed, the smallest set of accountable acts that would change it, and the dependency graph it re-read. Review cases carry a case-level position; the five decision routes carry an analysis-level position naming every blocking gate, the decisive reviews and the evidence that cannot change the claim gate. See [permission path](permission-path.md).
- **Commit-time check.** `commit_effect` re-checks the whole chain atomically at the moment of the effect and records a single-use commit valid for at most 15 seconds. New receipt kind `effect_commit`; `record_effect` links its commit. The reference executor takes an optional `commitEffect`.
- **Review outcome ledger.** `record_case_outcome` and `get_review_outcome_ledger` on `/v1/review-cases`: declared, hash-chained outcomes and workspace metrics (prevented bad approvals, unnecessary holds, incidents, hold precision, reviewer time, hold durations). Not verified, not causal, no monetary value.
- **Original PDF review.** `register_review_document` accepts `content_base64` for `.pdf` originals. Server-side extraction with the deterministic `amos-pdf-text/1`; a [public verifier](../conformance/original-review/pdf/README.md) re-checks receipts. See [PDF review](pdf-original-review.md).
- **Public registers.** Six new free adapters beside GLEIF: GLEIF parent relationships, ROR, Crossref (including retraction notices), World Bank projects, EU VIES VAT (name match only; no personal data stored) and SEC EDGAR. See [public registers](public-registers.md).
- Workbench: PDF upload, register picker, permission panel with an exact-effect check, and outcome recording with ledger metrics.

## Changed

- Wording that conditions or withdraws permission now also includes "cannot", "unless", "provided that", "conditional on/upon", "suspended", "not approved" and "pending approval" when labelled as direct support. These passages need further review.
- Conformance package: request and response schemas, examples and signed receipt fixtures include the two new actions and the commit receipt. The committed-executor harness shows a revocation between verification and commit stopping the effect.
- Workbench: when a passage bind finished, the page moved keyboard focus back to the read-only original, so a reviewer already typing a note lost the rest of it and the review was rejected. The selection is still restored; focus now moves only when nothing else has it.
- `schemas/mvr-mcp-profile-outputs.json` is regenerated: the published copy lacked the `permission_position` declarations that production already served. Worker CI now fails when any Worker-served public contract file (version, MCP output profiles, field contract, authority documents and receipts) differs from the public copy.
- `schemas/authority-documents.json` had not been regenerated since 23 October, so it lacked the `issuer-state/2` and condition-resolution document schemas that production already served. It is regenerated from the Worker in this release.

## Unchanged boundaries

AMOS issues no authority. Production capabilities stay closed until the named-person key ceremony. No real institution, issuer or reviewer is onboarded. Customer-controlled receivers and effect-system fencing remain untested.
