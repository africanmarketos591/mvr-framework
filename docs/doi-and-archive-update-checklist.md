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

For editable Zenodo records or new versions, add these related identifiers.
Keep the existing DOI concept DOI/version DOI alive; do not delete the old
records. If Zenodo does not allow editing a published field, create a new
version and put this text in the description/change notes.

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

Recommended version note:

```text
Metadata refresh for AI-agent and developer discoverability. This version does
not publish private Worker source code or private calibration assets. It links
the already-indexed MVR Framework DOI record to the current MVR API v6.32.x
OpenAPI, MCP, sandbox, and agent-instruction discovery surface.
```

Recommended related-identifier relationship types:

- `IsSupplementedBy`: `https://africanmarketos.com/api/openapi.agent.json`
- `IsSupplementedBy`: `https://africanmarketos.com/AGENTS.md`
- `IsSupplementedBy`: `https://africanmarketos.com/llms.txt`
- `IsSupplementedBy`: `https://africanmarketos.com/mcp`
- `IsSupplementedBy`: `https://registry.modelcontextprotocol.io/v0/servers?search=io.github.africanmarketos591%2Fmvr-api`
- `IsSupplementedBy`: `https://github.com/africanmarketos591/mvr-api-ts-client`
- `IsSupplementedBy`: `https://github.com/africanmarketos591/mvr-api-py-client`

Verified public Zenodo records that should be linked forward:

- `10.5281/zenodo.17054819` currently links the canonical framework page and GitHub repo.
- `10.5281/zenodo.17310446` has strong MVR keywords but should add current API/MCP links.
- `10.5281/zenodo.17389885` is the AI citation/provenance mirror and should add current API/MCP links.

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

Recommended Figshare title suffix if a new version is created:

```text
Metadata refresh: MVR API v6.32.x discovery links, MCP registry, and public sandbox
```

Recommended Figshare keywords to add:

```text
MVR API; Minimum Viable Relationships; AI agents; MCP; OpenAPI; llms.txt;
AGENTS.md; relational readiness; evidence completeness; market permission;
African Market OS; Farouk Mark Mukiibi
```

Recommended Figshare link block:

```text
Current implementation links:
- Agent OpenAPI: https://africanmarketos.com/api/openapi.agent.json
- Full OpenAPI: https://africanmarketos.com/api/openapi.json
- Sandbox guide: https://africanmarketos.com/docs/sandbox.md
- AI-agent instructions: https://africanmarketos.com/AGENTS.md
- LLM discovery file: https://africanmarketos.com/llms.txt
- MCP endpoint: https://africanmarketos.com/mcp
- MCP registry: io.github.africanmarketos591/mvr-api
- Canonical GitHub repo: https://github.com/africanmarketos591/mvr-framework
```

## Do Not Do

- Do not delete older DOI records.
- Do not replace indexed DOI landing pages with unrelated content.
- Do not publish private Worker source.
- Do not publish private calibration weights, scoring formulas, or production
  tenant data.
