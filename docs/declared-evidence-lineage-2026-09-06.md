# Declared Evidence Lineage

Application revision: `2026-09-06.engine-contract.5` (source grouping introduced in `.4`).

African Market OS-MVR API now distinguishes multiple items carrying the same disclosed source reference from items carrying distinct references. This strengthens the existing evidence-completeness prefilter; it is not source authentication or a new independent-evidence certification product.

## Existing Routes

- `/v1/evidence-completeness` exposes the privacy-bounded `evidence_lineage` summary in client-safe and compact responses. Existing board-use dependence warnings remain when independence is unsubstantiated.
- Public `mvr_evidence_completeness`, `mvr_context_compile` and `mvr_decision_check` carry the same summary. `/mcp/` and `/mcp/preflight` remain available; the guided workflow uses these same checks.
- Licensed dependence checks consume shared document references alongside existing declared groups and dependency metadata. Known shared references can reduce declared independence; distinct IDs cannot establish it.

## Submit References, Not Private Documents

Use a data-minimized `source_url` or an explicit `provenance_ledger.source_doc_id` / `source_locator`. Declared parent/upstream source IDs and supplied SHA-256 source hashes can also disclose overlap. The check does not fetch these references. Do not submit credentials, private URLs containing secrets, or personal identifiers.

HTTP(S) fragments and selected tracking parameters do not create new source documents. Meaningful query selectors and different paths remain distinct. Shared-reference grouping is transitive. Different documents at one publisher are not automatically treated as the same source.

Public structural completeness requires three identifiable source components covering three source-family slots, plus the existing stakeholder and guardian/formal-evidence requirements. Relabelling one shared document cannot supply several diversity slots. Missing source references produce evidence gaps rather than fabricated roots.

## Read the Summary Correctly

`evidence_lineage` contains:

- `policy_version: mvr_declared_source_lineage_v1`
- reported, identified and unlocated item counts;
- `observed_source_component_count` and shared-reference component sizes;
- `basis: caller_declared_references_not_authenticated`;
- `independence_verified: false` and `authorization_issued: false`;
- explicit limitations, including undisclosed common ancestry and source authenticity.

These are connected components of declared references, **not verified independent roots**. Shared references suggest dependence; they do not establish fraud. Distinct references can still conceal copied evidence or a common dataset.

The legacy `verified_source_families` array is retained for compatibility and represents caller-labelled coverage, not authenticated independent families. `caller_labelled_source_families` and `source_family_labels_are_not_independence` clarify that meaning. Use `source_family_component_count` for the structural diversity check.

Passing the public gate means only that the declared structure can continue to evaluation. It does not establish evidence truth, grant market permission, certify a company or authorize an investment or payment.

### Shared Material Within Sufficient Coverage

A pack can contain a shared pair and still have three source components covering three source families. That is not contradictory: the shared material counts together, while other components may provide sufficient structural coverage. Do not block all sharing or interpret a structural pass as independent corroboration.

Public responses identify `evidence_gate_scope: public_structural_coverage_only`. If declared overlap is present, `evidence_notices` includes `declared_source_overlap` with `blocking: false`, even when the gate passes. The ordinary next-action text and compact MCP text also surface the notice. `evidence_gaps` remains reserved for missing requirements; a notice is not a concealed blocker. Both `shared_reference_detected: false` and `independence_verified: false` can occur together and mean only that no disclosed reference overlap was found.

Licensed completeness is a different question from suitability for consequential use. Submit the real intended use through the supported `requested_use` fields. Existing board-review reliance checks block when independence is unresolved; an ordinary `decision_ready` completeness status is not board approval. Agents and humans must respect the returned warnings, blockers and authorization boundary. Neither buying a license nor declaring more document IDs removes those requirements.

### Version and Calibration Scope

Source grouping is identified by `evidence_lineage.policy_version`. The broader agent policy, application deployment and provisional numerical calibration have separate version fields because they govern different artifacts. The `.5` update changes disclosure, not component-count thresholds or numerical calibration. Regression tests check both the structural gates and existing calibration behavior; calibration asset health is not a substitute for those tests.

The default `/v1/calibration-health` response separates the requested-profile report from a separately executed strict readiness check. An advisory namespace's `manifest_valid: null` and `freshness_valid: null` mean those checks were not run in that namespace inspection. `validation_scope` states what was checked. `false` must not be interpreted as equivalent to `null`. Strict-profile inspections continue checking manifest approval, asset hashes and freshness, and fail when their requirements fail.

The default health coverage remains `smoke_validation_only`, not full validation. The existing `?coverage=full` path performs the separate complete manifest-matrix check. Neither mode validates market outcomes or the truth of caller-submitted evidence.

## Hash and Review Boundaries

`stable_content_hash` remains a shaped-response hash. It is not a commitment to the complete source material or a proof of independence. Aggregate summaries can be equal for different evidence sets. Existing exact-content review and snapshot mechanisms serve different purposes; no `basis_digest` was invented in this release.

Testing includes paired shared/distinct references, missing lineage, URL aliases, common hashes, disclosed cycles, transitive bridges, family-slot allocation and fabricated distinct references. These are internal synthetic regression tests, not external founder trials, a frontier-model comparison or a general laundering-prevention rate.
