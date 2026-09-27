# Fourth Retest: Reproduction Contract

Target deployment: `2026-09-27.outsider-retest4.2`. Confirm the X-MVR-Deployment-Revision response header. Use an authorized licensed test workspace and synthetic records only.

Minimum Viable Relationships (MVR), originated by Farouk Mark Mukiibi, African Market OS.

## Completion and Snapshot Integrity

1. POST /v1/entity-timeline with an entity selector and limit. Follow pagination.cursor, including on empty pages. The last page has pagination.list_complete and analysis.history_complete both true. analysis_scope is current_page_only: accumulate prior pages before claiming complete history.
2. Run a synthetic decision-check. Create a snapshot using its decision_check_id and matching response_hash. Both supplied response_hash and semantic_decision_hash must match at every supplied location. Altering the semantic hash returns 422 naming semantic_decision_hash and the offending field, not a missing response hash.
3. Submit a different immutable_audit_hash or anti_corruption_audit_hash at top level or under decision_result. A governed snapshot preserves the server value and lists the ignored caller field under decision_snapshot.submission_review. That review is nested, not top-level. Locking retains source_decision_integrity; immutable_snapshot_hash is a separate receipt hash.
4. Owner snapshot retrieval lists amendments separately, with amendment_cursor and amendments_list_complete. An amendment does not rewrite the original immutable snapshot.

## Discoverability

- GET /v1/audit-events?category=governance&limit=50, or the admin alias with the required role, lists scoped governance summaries. Continue with governance_cursor until governance_list_complete. The ordinary security cursor is separate. The admin route also accepts documented POST fields; the non-admin alias is GET-only.
- Full [OpenAPI](https://africanmarketos.com/v1/openapi.json) publishes governance query parameters, the admin request and selected response schemas. [Runtime schema](https://africanmarketos.com/v1/schema) includes governance_response_contracts and route_registry query/response references. The intentionally narrower agent registration surface is not a grant to enterprise governance routes.
- Evidence-review review_eligibility distinguishes schema validity, reviewer authorization/declared independence, source authenticity, issuer standing and release eligibility. Legacy strict_eligible is not execution permission.
- Conflicting output modes and invalid mode enums return assessment_executed:false before evaluation. An absent flag cannot be interpreted as proof of nonexecution.
- Calibration-readiness, using an output mode allowed by that route, reports full_corpus_attested next to strict_calibrated_ready. Both use full-corpus readiness. strict_smoke_calibration_ready names only the representative subset. Quarantined calibration is not certified by a passing smoke subset.

## Timing and Disconnects

REST/MCP responses provide a Server-Timing mvr metric, including errors and replay responses. This is aggregate elapsed time to response construction, excluding delivery/background work. [Worker clocks advance after I/O](https://developers.cloudflare.com/workers/runtime-apis/performance/); the metric is not CPU time and does not precisely isolate network time. Existing body hashes are unchanged. No global Timing-Allow-Origin is added.

For a dropped connection retain UTC start/end, endpoint, protocol headers without credentials, deployment revision, client error and CF-Ray when available. Reproduce with bounded traffic. Do not blindly retry a mutation with a new idempotency key. The reported 14:45:57-14:46:21 UTC event cannot be correlated from aggregate provider data; it is not proven to be a client-side fault or a fixed server bug.

Unrelated unpublished request schemas remain explicitly marked incomplete. Synthetic acceptance tests do not establish issuer authenticity, execution permission, signed receipts or commercial superiority.
