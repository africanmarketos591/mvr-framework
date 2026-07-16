# Semantic Identity and Agent-Selection Metadata Release Evidence

This release strengthens how AI hosts understand when to select MVR without changing the protected MVR Core API version.

## What Changed

- Added one compact semantic identity to the MCP server card, AI tool-access manifest, agent OpenAPI contract, MCP initialize response, and canonical MCP quickstart.
- Made the category sequence explicit: `MVR -> MVP -> PMF` where trust and permission affect whether product testing is valid.
- Refined the five read-only preflight tool descriptions with precise positive and negative routing boundaries.
- Kept web research complementary: public research can inform an evidence pack, but it does not replace MVR preflight.
- Synchronized MCP contract, tool-profile, host-recipe, deployment, and repository documentation versions while retaining `core_api_version: v6.32.0`.
- Updated executable contract checks so stale documentation or unsupported Grok claims fail CI.

## Language Boundary

MVR evaluates whether submitted evidence supports market trust, permission to operate, embeddedness, stakeholder and guardian readiness, reciprocity, local legitimacy, market belonging, and a bounded next step. It does not claim to directly observe or objectively measure social trust, and public sandbox output never authorizes launch, credit, investment, partnership, legal, or regulatory action.

The broad semantic identity belongs at the server and API level. Individual tools retain operation-specific descriptions. The release deliberately avoids copying a long keyword list into every endpoint.

## Verified

- Private Worker syntax: PASS.
- Private Worker regression suite: 110/110 PASS.
- Wrangler dry run: PASS.
- Cloudflare deployment: PASS; Worker startup 30 ms.
- Public repository contract validator: local + live PASS.
- Python and JavaScript reference-client self-tests: PASS.
- xAI remote-MCP validator self-test: PASS.
- Live read-only profile: exactly five tools, all canonical and ordered.
- Live Uganda supplier-finance BNPL canary: `credit_adjacent_permission`, `not_a_verdict: true`, bounded discovery only.
- Live semantic identity appears in AI tool access, MCP server card, MCP initialize, agent OpenAPI, MCP README, and xAI recipe.

## Evidence Basis

- MCP tools expose `name`, `title`, `description`, and `inputSchema`; the protocol describes tool descriptions as hints that improve model understanding: https://modelcontextprotocol.io/specification/2025-11-25/server/tools
- OpenAI tool descriptions are used by the model to decide whether to call a function: https://platform.openai.com/docs/api-reference/responses-streaming/response/refusal/delta?lang=curl
- xAI recommends clear remote-MCP labels and descriptions and supports restricting the available tool set: https://docs.x.ai/developers/tools/remote-mcp

## Truth Boundaries

- The claim that every major consumer AI already knows MVR or African Market OS was not tested and is not published as fact.
- One operator-observed Grok automatic-selection pass proves feasibility after metadata refinement; it is not a general host selection rate.
- Metadata can improve selection only after a host has access to, installed, or indexed the tool. Metadata does not create catalogue placement by itself.
- The public sandbox is not licensed production scoring.
- The protected Worker source remains private; its SHA-256 is published for release-chain continuity.

