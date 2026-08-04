# Input Integrity and MCP Perimeter Release Evidence

This release closes four bounded integrity defects without changing the protected MVR scoring engine:

- non-market or unrecognized country inputs fail before workflow and commercial-route issuance;
- unstructured evidence labels are reported separately from structured evidence items;
- unknown `/.well-known/*` paths return a public 404 rather than falling into licensed-route authentication;
- public MCP first-call text is compact while `structuredContent` remains authoritative.

It also promotes one decision-domain-specific evidence unlock into the first three actions returned by `mvr_first_call`.

The final policy pass removes mandatory-handoff language, preserves host and authorized-human control, restricts credit-adjacent use to evidence-gap routing, and publishes machine-readable prohibitions against natural-person scoring, protected-characteristic proxies, regulated credit decisions, and automatic incumbent vetoes.

The evidence record in `INPUT_INTEGRITY_LIVE_CANARY.json` was captured after deployment and includes the Cloudflare provider revision. It is a technical release receipt, not a market verdict, external certification, or claim that the MVR framework is independently validated.
