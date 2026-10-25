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

Two authority actions answer the permission question directly. `check_permission` (read-only, any workspace account) returns the permission position for one exact effect on a case: its level, what is still allowed, the smallest set of accountable acts that would change it, and the dependency graph it re-read. `commit_effect` (bound executor only) is the commit-time re-check described in [durable executor outcomes](durable-authority-executor.md). Call both through `operation: "authority"`. See [permission path](permission-path.md).

Configure the provider-issued credential in the MCP host. Credential-like fields in tool arguments are rejected. Each target route rechecks the key's endpoint scope, roles, tenant and workspace. A key's access to MCP does not grant access to the authority routes. Retrieve the complete machine contract through this same tool with `{ "operation": "get_contract", "request": { "contract_version": "mvr.authority-mcp/1", "operation": "authority" } }`. Substitute any operation from the table. The result includes request and response schemas, referenced component definitions and examples. Discovery grants no execution authority. The unsigned receipt example is deliberately a verification failure. Read the complete contract from structuredContent.

Authority, review, receipt and executor job inspection/retry routes also appear in the governed REST catalogue at `POST /v1/mcp` with `action: "tools/list"`, filtered by the caller's access. Authority and review operations use action-specific `operation_id` and reject generic replay keys. Capability verification and current-state reads are never served from a replay cache. Job retries retain their existing idempotency, role and uncertain-effect checks.

Inspect structured content, errors and serving revision. Text remains bounded to 4,500 characters; both licensed manifests remain within the 205,000-character budget. A successful operation or valid receipt is not permission to execute. Only the institution's narrowly scoped capability and a fresh current-validity response govern the named effect.

Protected analysis handoffs use one-use opaque tokens. The server holds private case and attestation references, binds the token to the tenant, key, profile, serving revision, next tool and exact published arguments, and checks expiry and current review state. Send `structuredContent.mcp_next_call` unchanged. Do not reattach protected references or reconstruct arguments. A consumed, expired or changed-input workflow must restart at first-call. A handoff too large for bounded text is referenced in structuredContent, never truncated.

Runtime-job retry is a mutation requiring admin authority, fresh authority state, `payload.job_id` and a host-supplied `idempotency_key`. Read-only classification is false. Generic replay keys remain forbidden for authority and review state operations.

See [the developer rerun guide](../conformance/authority/DEVELOPER-RERUN.md) for executable protected-reference fixtures in both profiles.
