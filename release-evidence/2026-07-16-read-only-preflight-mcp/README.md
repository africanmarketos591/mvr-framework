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

## Grok.com Observation Addendum

The Custom Connector was subsequently installed in `grok.com`, discovered all five tools, and executed `mvr_first_call` when explicitly requested. The first natural-language Uganda BNPL prompt did not automatically select MVR and used web search instead. Selection metadata was then strengthened and deployed without changing `core_api_version: v6.32.0`.

See `GROK_COM_OPERATOR_OBSERVATION_2026-07-16.json` for the explicit-execution pass, automatic-selection miss, remediation, hashes, and claim boundaries.

## Not Yet Claimed

Reliable ordinary-chat automatic selection, Grok Business or Enterprise provisioning, mobile/Grok-on-X connector behavior, and the frozen 40-case host result remain unverified or not run.
