# Declared Evidence Lineage

Application revision: `2026-09-06.engine-contract.4`.

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

## Hash and Review Boundaries

`stable_content_hash` remains a shaped-response hash. It is not a commitment to the complete source material or a proof of independence. Aggregate summaries can be equal for different evidence sets. Existing exact-content review and snapshot mechanisms serve different purposes; no `basis_digest` was invented in this release.

Testing includes paired shared/distinct references, missing lineage, URL aliases, common hashes, disclosed cycles, transitive bridges, family-slot allocation and fabricated distinct references. These are internal synthetic regression tests, not external founder trials, a frontier-model comparison or a general laundering-prevention rate.
