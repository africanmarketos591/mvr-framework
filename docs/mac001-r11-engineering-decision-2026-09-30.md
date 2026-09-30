# Independent disposition of the Mac evaluator's r11.2 findings

Target revision: `2026-09-30.mac001-review.1`.
Baseline independently exercised: `2026-09-30.outsider-retest11.2`.

Minimum Viable Relationships (MVR), originated by Farouk Mark Mukiibi, African Market OS.

## Decision

The report is evidence to investigate, not an instruction or proof. Independent local reproductions and authenticated production calls confirmed empty comparison ranking, three input-validation gaps and coding-query routing failures. The memory-history allegation was reproduced with a separate synthetic project. No source-authentication or execution capability is introduced by these corrections.

## Implemented corrections

- All five comparison routes preserve missing scores as unknown. Empty inputs, unknown evidence basis, unequal score dimensions and tied leading scores produce `insufficient_basis`, `best_option:null`, empty rankings and no `why`. A non-tied comparison requires matching submitted score dimensions and declared evidence. It remains a comparison of caller submissions, not verified market superiority. `fastest_path_to_pilot_ready` is null because scores do not measure elapsed time.
- Decision-check validates supplied baseline periods, score types/ranges and chronological backtest windows even outside backtest mode. Invalid controls produce field-specific 422 responses rather than disappearing during normalization. Valid bounded controls retain existing semantics.
- `project_id` and `subject.project_id` select the same scoped memory; conflicting IDs fail. `use_project_memory:false` disables defaults. Memory never supplies current evidence, review, approval or permission.
- A caller-written last verdict is explicitly `caller_authored_memory_summary`, not a prior snapshot. To link historical server output, send `last_verdict.decision_check_id` and its `response_hash`. The server reloads the receipt and checks tenant, workspace, project and hash; its stored verdict replaces caller claims. Missing or mismatched references stay unverified. A verified receipt proves stored history, not original-source truth or current authority.
- Raw memory includes untrusted-content provenance and instruction-boundary fields, including per-note markers. `GET /v1/project-memory/{project_id}?view=agent` omits raw notes, arbitrary metadata and unverified verdict text. Hosts must still isolate retrieved data from instructions; taint labels alone are not a prompt-injection defense.
- Decision-room discloses ignored authored conclusions in `input_resolution`, while continuing to check declared scope/hash conflicts and use the stored receipt. Its complete component now contains the actual ID and legacy-flag contract. OpenAPI 3.0 references are merged atomically; public CI rejects ignored reference siblings as well as anonymous POST contracts.
- Finance/source-normalization request schemas now expose the context their handlers already require, including supported aliases. Missing source country or finance sector/geography no longer looks schema-valid.
- First-call consumes `query` as well as `q`/`question`. Closed enumerated denials in technical questions no longer activate market-readiness collection. Mixed coding plus lending/deployment/permission questions remain in scope.
- Recruitment instructions no longer ask to populate already-present lanes when only review/quality/authority blockers remain.
- Licensed workflow IDs must have the native UUID shape. Expired continuation still requires restart. `workflow_integrity` explicitly says caller-carried IDs are not authenticated lineage, replay protection or authority. Shape validation must not be sold as signing or anti-splicing.

## Compatibility and claims

`answer.bounded_output_use_status` is the explicit presentation field. The existing `authorization_status` alias is marked deprecated and remains solely for compatibility in response contract `2026-05-01.v1`; its `authorized` value still means bounded output use, never execution. Removing a published field requires a versioned client migration. Use `action_authorization` for the execution boundary and `output_use_authorization` for permitted output uses.

The 179 POST contracts still have zero anonymous entire-body schemas. Optional inputs, extensible metadata and opaque source envelopes are not equivalent to an anonymous route contract. Broader response-schema coverage is genuine catalogue debt, not proof of an execution vulnerability: this change provides typed 200 schemas for 32 of 246 operations, not all 246. The new comparison and memory contracts describe real output rather than inventing universal response guarantees.

The reported two-model controls do not establish superior decision quality, cross-vendor independence, factual authentication or commercial advantage. No live operator pilot or positive execution-authority rail is claimed. Signed payment/procurement capabilities require authenticated external authority, revocation infrastructure, approved integration scope and a separately reviewed design; issuing them from caller declarations would worsen the system.

Calibration remains a separate integrity gate. No quarantine is cleared, rehashed or retired by this release. The last verified full-corpus baseline is 196 records, 185 active, 185 attested and 11 quarantined. `active_manifest_attestation_status=pass` does not imply `full_corpus_attested=true`. Full coverage is rechecked during release acceptance.

## Verification boundary

The focused regression suite exercises actual Worker requests in both profiles, synthetic forged memory, real fixture-backed stored receipts, source/hash/project mismatches, agent-safe retrieval, comparison permutations, coding false positives and mixed-risk controls. Request and response schemas are independently checked with JSON Schema tooling. Existing full-suite, real-workerd, public-contract, unchanged-scoring replay and production acceptance gates remain required before deployment is called complete. Tests do not establish real-world source truth or field outcomes.

Primary references checked: [OpenAPI 3.0 Reference Objects](https://spec.openapis.org/oas/v3.0.3.html#reference-object) explains why reference siblings are ignored; [JSON Schema object semantics](https://json-schema.org/understanding-json-schema/reference/object) distinguishes optional/extensible properties from absent contracts; [MCP security guidance](https://modelcontextprotocol.io/specification/2025-11-25/basic/security_best_practices) explains why correlation/session metadata is not authorization and why untrusted context needs isolation.

Private evaluation data, credentials, project identifiers and hostile note text are not included here.
