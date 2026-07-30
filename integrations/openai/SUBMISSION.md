# OpenAI submission and rescan record

This file is the copy-ready release record for the existing OpenAI review submission and related OpenAI distribution surfaces. It does not claim approval or publication.

## Existing review submission

- Preserve submitted endpoint: `https://africanmarketos.com/mcp/`
- Canonical keyless preflight profile: `https://africanmarketos.com/mcp/preflight`
- Canonical first tool: `mvr_first_call`
- Current public profile: exactly five read-only tools
- Privacy: `https://africanmarketos.com/privacy-policy/`
- Integration guide: `https://africanmarketos.com/connect-ai/`
- Commercial route for an authorized human: `https://africanmarketos.com/checkout/starter`
- Governed route: `https://africanmarketos.com/get-api-key/`

## Snapshot rescan checklist

1. Refresh the reviewed MCP snapshot from the preserved `/mcp/` endpoint.
2. Verify the current five-tool titles, schemas, read-only annotations, and use/non-use boundaries.
3. Verify public responses remain non-verdicts and do not expose calibration, private labels, credentials, or protected runtime logic.
4. Verify the privacy link and the authorized-human purchase boundary.
5. Do not claim approval, placement, or OpenAI endorsement until the account shows it.

## Additional OpenAI assets

- Three Workspace Agent templates are provided in `workspace-agents/`.
- The same focused skill folders used by the Anthropic plugin can be adapted for an OpenAI plugin without publishing protected computation.
- A future in-chat evidence receipt UI should display evidence gaps, maximum safe action, and verification links only. It must not reproduce the protected scorer or calibration.
- A separate `search`/`fetch` adapter is intentionally deferred. It should be isolated from the stable preflight profile and added only when a measured research workflow needs it.
