# Read-Only MCP Preflight Release Evidence

This release adds `https://africanmarketos.com/mcp/preflight`, a server-enforced five-tool read-only profile for hosts that discover every tool exposed by a connector URL.

## Verified

- Worker tests: 110/110.
- Public MCP contract: local and live pass.
- `/mcp/preflight`: exactly five read-only tools.
- Direct `mvr_commercial_handshake` call: rejected.
- Uganda BNPL first call: `credit_adjacent_permission`, `not_a_verdict: true`.
- Existing profiles unchanged: `/mcp` has seven tools; `/mcp/full` has 22.
- Grok 4.5 xAI Responses API canary: 3/3 against the new endpoint.

## Not Yet Claimed

Grok.com Custom Connector installation, ordinary-chat automatic selection, and Grok Business or Enterprise provisioning remain unverified until tested in those actual host surfaces.

