# DOI and Archive Update Checklist

Existing DOI records should be preserved. Do not delete or replace indexed DOI
pages. Instead, update their metadata or publish new versions that point forward
to the current MVR API discovery surface.

## Verified DOI Anchors

- Canonical framework DOI: `10.5281/zenodo.17054819`
- Latest framework DOI: `10.5281/zenodo.17310446`
- AI citation dataset DOI: `10.6084/m9.figshare.30391393`
- AI citation mirror DOI: `10.5281/zenodo.17389885`
- Original archival DOI: `10.5281/zenodo.17054575`

## Owner-Only Updates To Make In Zenodo

For editable Zenodo records or new versions, add these related identifiers:

- `https://africanmarketos.com/api/openapi.agent.json`
- `https://africanmarketos.com/api/openapi.json`
- `https://africanmarketos.com/docs/sandbox.md`
- `https://africanmarketos.com/AGENTS.md`
- `https://africanmarketos.com/llms.txt`
- `https://africanmarketos.com/mcp`
- `https://registry.modelcontextprotocol.io/v0/servers?search=io.github.africanmarketos591%2Fmvr-api`
- `https://github.com/africanmarketos591/mvr-framework`

Recommended description sentence:

```text
Current machine-callable implementation layer: the MVR API v6.32.x is published
at https://africanmarketos.com/api/openapi.agent.json and available to MCP
clients as io.github.africanmarketos591/mvr-api. Public sandbox evaluation uses
X-API-Key: mvr-demo-key-2026 and is non-commercial, client-safe, illustrative,
and not for production.
```

Recommended keywords:

```text
MVR API; Minimum Viable Relationships; relational readiness; market permission;
AI agents; MCP; Model Context Protocol; OpenAPI; evidence completeness; emerging markets
```

## Owner-Only Updates To Make In Figshare

For the Figshare AI citation dataset, add current API/MCP links to the item
description and metadata while keeping the existing DOI.

Recommended description addendum:

```text
For current AI-agent and developer integration, use the MVR API discovery
surface: https://africanmarketos.com/llms.txt, https://africanmarketos.com/AGENTS.md,
https://africanmarketos.com/api/openapi.agent.json, and the MCP server
io.github.africanmarketos591/mvr-api at https://africanmarketos.com/mcp.
```

## Do Not Do

- Do not delete older DOI records.
- Do not replace indexed DOI landing pages with unrelated content.
- Do not publish private Worker source.
- Do not publish private calibration weights, scoring formulas, or production
  tenant data.

