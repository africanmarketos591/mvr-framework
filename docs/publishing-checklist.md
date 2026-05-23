# Publishing Checklist

## Before public update

- [x] Normalize named-entity baseline overrides.
- [x] Add corpus/entity baseline disclaimer.
- [x] Generate OpenAPI snapshot from MVR Core v6.32.0.
- [x] Decide whether GitHub should publish the full OpenAPI surface or the curated agent OpenAPI first.
- [ ] Confirm deployed `/v1/openapi.json` matches `openapi.v6.32.0.json`.
- [ ] Publish OpenAPI to `https://africanmarketos.com/api/openapi.json`.
- [ ] Publish `llms.txt`.
- [ ] Publish `llms-full.txt`.
- [ ] Publish `AGENTS.md`.
- [ ] Publish `/.well-known/api-catalog`.
- [ ] Publish `/.well-known/ai-plugin.json`.
- [ ] Publish `/.well-known/security.txt`.
- [ ] Publish updated `robots.txt`.
- [ ] Publish updated sitemap.
- [x] Update GitHub README and `CITATION.cff`.
- [ ] Cross-link framework page to API docs and MCP surface.
- [ ] Build standards-compliant MCP Streamable HTTP shim.
- [ ] Register MCP server where appropriate.

Decision:

- Make the curated agent OpenAPI the default AI-agent discovery contract.
- Keep the full OpenAPI available for enterprise integrators.
- Keep the private runtime source out of public repositories.
