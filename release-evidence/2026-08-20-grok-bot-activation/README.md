# Grok Bot activation playbook release evidence

This release publishes a bounded activation and safety playbook for the Grok Bot early beta announced by xAI on 2026-08-11. It does not claim that African Market OS has been executed inside Grok Bot, listed in a Grok marketplace, endorsed by xAI, or selected automatically by the host.

## What shipped

- A copyable client instruction beginning with `mvr_first_call` and following only the returned `mcp_next_tool` arguments.
- A four-role team pattern for coordination, evidence collection, preflight execution, and synthesis.
- A shared-computer warning that separate Bots on one account are not credential isolation.
- Human approval requirements for payment, terms, credential entry, external messages, and consequential use.
- A keyless five-tool public preflight route at `https://africanmarketos.com/mcp/preflight`.

## Verification

- Private Worker suite: 150/150 pass.
- Public-safe Worker CI: pass.
- Public MCP contract validator: local and live pass.
- Live `/mcp/` compatibility profile: seven tools retained.
- Live `/mcp/preflight`: five read-only tools retained.
- Cloudflare provider revision: `62c5ecda-57d2-423f-8f75-3630cc6caeed`.
- Scheduled trigger remained `0 6 * * *`.

The earlier Grok.com custom-connector and xAI Responses API evidence remains separately labelled and is not reused as Grok Bot host evidence.
