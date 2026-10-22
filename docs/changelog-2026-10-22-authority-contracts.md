# Authority contract update

Revision: `2026-10-22.authority-chain.4`.

- `authority-fields/2` is the default on REST and MCP. Explicit legacy requests remain available until the sunset `2027-01-21T00:00:00Z`.
- The bounded executor checks contact, counterparty and exact resource/amount constraints as well as ceilings. The server returns the complete signed effect scope.
- A signed action may specify `amount_minor` and `resource_scope.resource_id` for exact matching. Omitting these retains the existing amount-ceiling/resource-prefix semantics.
- Public MCP successes identify the serving revision in the header and JSON-RPC result metadata.
- Review-case schemas express action-specific identifiers and the runtime's subject identity/country requirements.
- Each MCP profile has its own published output schema. Shared tool names do not imply shared response structure or semantics. See `schemas/mvr-mcp-profile-outputs.json` and the integration guide.

Verification uses synthetic AMOS lab fixtures. This release does not activate receipt signing or claim independent conformance, institutional permission, factual verification, or external execution authority.
