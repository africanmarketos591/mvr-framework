# Governed authority operations

The licensed `/mcp/runtime` now exposes the five analysis tools plus one `mvr_authority_operation` tool. The five-stage analysis continuation remains unchanged. This new tool calls a governed REST operation directly and does not consume an analysis continuation.

Arguments are `{ "operation": "authority", "request": { "action": "get", "kind": "anchor", "id": "your-anchor-id" } }`.

| Operation | Governed route |
| --- | --- |
| `authority` | `POST /v1/authority-chain` |
| `review_case` | `POST /v1/review-cases` |
| `reviewer_attestation` | `POST /v1/reviewer-attestations` |
| `verify_receipt` | `POST /v1/authority-receipts/verify` |
| `executor_outcome` | `POST /v1/authority-chain`, action `record_effect` only |

Configure the provider-issued credential in the MCP host. Credential-like fields in tool arguments are rejected. Each target route rechecks the key's endpoint scope, roles, tenant and workspace. A key's access to MCP does not grant access to the authority routes. Consult the target route's contract for the complete action request. The operation envelope is deliberately opaque; its output schema is extensible and does not claim that all operations share a response structure.

Authority, review, receipt and executor job inspection/retry routes also appear in the governed REST catalogue at `POST /v1/mcp` with `action: "tools/list"`, filtered by the caller's access. Authority and review operations use action-specific `operation_id` and reject generic replay keys. Capability verification and current-state reads are never served from a replay cache. Job retries retain their existing idempotency, role and uncertain-effect checks.

Inspect structured content, errors and serving revision. Text remains bounded to 4,500 characters; both licensed manifests remain within the 205,000-character budget. A successful operation or valid receipt is not permission to execute. Only the institution's narrowly scoped capability and a fresh current-validity response govern the named effect.
