# MVR API Version Map

This page is the canonical version guide for MVR API public integration.

## Machine-Readable Version Contract

Every integration should preserve these fields separately:

| Field | Current value | Meaning |
|---|---|---|
| `core_api_version` | `v6.32.0` | Protected Worker/API runtime. |
| `mcp_protocol_versions` | `2026-07-28`; `2025-11-25`; `2025-06-18` | Supported Streamable HTTP MCP contracts: stateless modern requests plus both initialize-based compatibility versions. |
| `mcp_contract_version` | `mvr-mcp@2026-08-08.1` | Public and licensed MCP schemas, discovery metadata, and transport contract. |
| `tool_profile_version` | `consumer-7+preflight-5+licensed-runtime-5@2026-08-08.1` | MCP family: seven-tool compatibility, five-tool keyless preflight, and five-tool licensed runtime. The registry still publishes only the keyless preflight. |
| `sdk_version` | `typescript@6.32.4;python@6.32.4` | Current published SDK lines, kept distinct by language. |
| `policy_version` | `mvr-agent-preflight-policy@2026-08-08.2` | Host-policy middleware, selection boundary, and distinct API-versus-human-service routing. |
| `calibration_version` | `v6.32.0-framework-provisional` | Public default; licensed calibration is resolved by active profile and manifests. |
| `deployment_revision` | `2026-08-08.agent-routing-reconciliation.4` | In-band application build identifier. The provider-generated deployment revision is recorded separately after deployment. |
| `deployment_provider_revision` | `Recorded in release evidence after deployment` | Provider-generated Cloudflare version; not self-embedded because the provider creates it during deployment. |
| `host_recipe_version` | `2026-08-08.2` | Microsoft, Google, AWS, OpenAI, Anthropic, and xAI recipe family. |

Machine-readable source: `https://africanmarketos.com/.well-known/mvr-version.json`.

## Current Lines

| Surface | Current version | Status | Notes |
|---|---:|---|---|
| MVR Core API runtime | `v6.32.0` | Current | Protected Worker/API runtime. Do not infer a runtime bump from docs, registry, or package metadata updates. |
| MCP registry/server.json manifest | `6.32.6` | Current metadata patch | Registry and discovery metadata revision; same runtime contract. |
| OpenAPI contract family | `v1` | Current | Canonical source: `https://africanmarketos.com/api/openapi.json`; agent-curated source: `https://africanmarketos.com/api/openapi.agent.json`. |
| Minimal sandbox OpenAPI | `v1` | Current | Canonical source: `https://africanmarketos.com/api/openapi.agent.sandbox.json`; use this for public sandbox route registration. |
| TypeScript SDK generation line | `6.32.4` | Current | Package: `@africanmarketos/mvr-api-client`; published from immutable tag `v6.32.4`. |
| Python SDK generation line | `6.32.4` | Current | Package: `mvr-api-client`; published from immutable tag `v6.32.4`. |
| REST sandbox | `v6.32.0` runtime | Current, limited | Uses `X-API-Key: mvr-demo-key-2026` where the route contract requires it; non-commercial evaluation only. |
| MCP Registry public profile | `public-preflight-read-only-v1` | Current, limited | Exactly five keyless read-only tools at `/mcp/preflight`; non-commercial evaluation only. |
| OpenAI compatibility profile | `consumer-compatibility-7` | Current, limited | Seven tools at `/mcp`; retained for the existing OpenAI review submission. |
| Licensed MCP runtime | `licensed-runtime-5` | Current | The same five bounded tool names at `/mcp/runtime`; tenant key required. One key can select `full_advisory` or `strict_calibrated` per request without widening licensed rights. |
| Full expert MCP sandbox | `full-expert-22` | Current, limited | Broader expert catalogue at `/mcp/full`; not the default registry profile and not licensed production. |
| MCP stdio bridge | `0.1.0` | Source available | Local transport adapter for stdio-only hosts and directory evaluation; the protected MVR engine remains remote and server-side. |

## Historical / Archived Lines

| Surface | Status | Guidance |
|---|---|---|
| API v1 materials | Historical archive | Preserve for DOI and citation continuity. Do not use for new agent integrations. |
| SDK v2.6 material | Deprecated compatibility line | Use SDK `6.32.0` or later. |
| `mvr-framework-v3-2025` repo | Framework/archive context | Use `mvr-framework` as the current API discovery source. |

## Canonical Integration Rule

Agents and developers should treat the current public contract as:

```text
Runtime: MVR Core API v6.32.0
OpenAPI contract family: v1
OpenAPI: https://africanmarketos.com/api/openapi.agent.json
Sandbox OpenAPI: https://africanmarketos.com/api/openapi.agent.sandbox.json
MCP: io.github.africanmarketos591/mvr-api
Public MCP Registry profile: public-preflight-read-only-v1 (five keyless read-only tools)
MCP endpoint: https://africanmarketos.com/mcp/preflight
OpenAI compatibility endpoint: https://africanmarketos.com/mcp/
Licensed MCP runtime: https://africanmarketos.com/mcp/runtime
REST sandbox: X-API-Key: mvr-demo-key-2026 where the route contract requires it
```

Archived DOI records remain valuable for provenance and indexing. They should point forward to the current runtime and should not be treated as current endpoint contracts.

Registry, package, documentation, and discovery-manifest revisions may change without changing the protected Worker/API runtime version.
