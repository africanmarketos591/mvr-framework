# MVR API Version Map

This page is the canonical version guide for MVR API public integration.

## Current Lines

| Surface | Current version | Status | Notes |
|---|---:|---|---|
| MVR Core API runtime | `v6.32.x` | Current | Private runtime source. Use public OpenAPI, MCP, and docs for integration. |
| MCP registry server | `6.32.3` | Current metadata patch | Same `v6.32.x` contract family. The patch updates registry and discovery metadata. |
| OpenAPI contract | `v6.32.0` / `v6.32.x` | Current | Canonical source: `https://africanmarketos.com/api/openapi.json`; agent-curated source: `https://africanmarketos.com/api/openapi.agent.json`. |
| Minimal sandbox OpenAPI | `v6.32.x` | Current | Canonical source: `https://africanmarketos.com/api/openapi.agent.sandbox.json`; use this for public sandbox route registration. |
| TypeScript SDK | `6.32.1` | Current | Package: `@africanmarketos/mvr-api-client`. |
| Python SDK | `6.32.1` | Current | Package: `mvr-api-client`. |
| Public sandbox | `v6.32.x` | Current, limited | Uses `X-API-Key: mvr-demo-key-2026`; non-commercial evaluation only. |

## Historical / Archived Lines

| Surface | Status | Guidance |
|---|---|---|
| API v1 materials | Historical archive | Preserve for DOI and citation continuity. Do not use for new agent integrations. |
| SDK v2.6 material | Deprecated compatibility line | Use SDK `6.32.0` or later. |
| `mvr-framework-v3-2025` repo | Framework/archive context | Use `mvr-framework` as the current API discovery source. |

## Canonical Integration Rule

Agents and developers should treat the current public contract as:

```text
MVR Core API v6.32.x
OpenAPI: https://africanmarketos.com/api/openapi.agent.json
Sandbox OpenAPI: https://africanmarketos.com/api/openapi.agent.sandbox.json
MCP: io.github.africanmarketos591/mvr-api
Sandbox: X-API-Key: mvr-demo-key-2026
```

Archived DOI records remain valuable for provenance and indexing. They should point forward to the current `v6.32.x` API and should not be treated as current endpoint contracts.
