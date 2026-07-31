# OpenAI distribution assets

These public-safe assets help an organization configure African Market OS in OpenAI workflows without publishing protected MVR computation.

## Current surface

- Preserve `https://africanmarketos.com/mcp/` for the existing OpenAI review submission.
- Use `https://africanmarketos.com/mcp/preflight` for the canonical keyless five-tool read-only profile.
- Begin consequential market decisions with `mvr_first_call`.
- Public MCP output is a non-verdict evaluation surface.
- Licensed tenants may separately use `https://africanmarketos.com/mcp/runtime`
  with a provider-issued key and either `full_advisory` or
  `strict_calibrated`.

The licensed runtime is a distinct host integration. Do not replace or redirect
the submitted `/mcp/` compatibility route while OpenAI review is pending.

## Workspace Agent templates

- `workspace-agents/market-entry-review.md`
- `workspace-agents/partner-distributor-diligence.md`
- `workspace-agents/ai-advice-verification.md`

These are configuration templates, not claims that an OpenAI workspace has installed, approved, or published AMOS.

## Submission discipline

OpenAI reviews a snapshot of a plugin's MCP tools and metadata. Before resubmission or publication, refresh the snapshot and verify that it contains the current five-tool profile, titles, schemas, annotations, privacy link, and non-verdict boundaries.

A separate `search`/`fetch` research adapter is not part of this release. Current OpenAI documentation no longer makes those tool names a universal requirement for connected MCP servers. A future citation adapter should be isolated from the stable preflight profile and justified by measured retrieval demand.
