# Minimum Viable Relationships (MVR) Framework

**Canonical title for indexing:** Minimum Viable Relationships (MVR) Framework: Africa's Prerequisite to MVP

Minimum Viable Relationships (MVR) is a relational-readiness framework originated by **Farouk Mark Mukiibi** and published through **African Market OS**. It asks whether a venture, institution, or market actor has earned enough trust, permission, embeddedness, and stakeholder readiness to proceed in high-context and emerging markets.

In short:

> MVP tests whether a product can work. MVR tests whether the market will carry it.

## Canonical Links

- Framework home: https://africanmarketos.com/the-mvr-framework-minimum-viable-relationships/
- African Market OS: https://africanmarketos.com/
- Creator ORCID: https://orcid.org/0009-0009-8191-2098
- LinkedIn: https://www.linkedin.com/in/faroukmarkmukiibi/
- Machine-readable license: https://africanmarketos.com/.well-known/mvr-license.json
- Commercial policy: https://africanmarketos.com/african-market-os-mvr-framework-commercial-referral-use-policy/

## Citation Anchors

Multiple citation anchors are intentionally preserved because they improve provenance, indexing, and disambiguation across academic, search, and AI systems.

- Original Zenodo DOI: https://doi.org/10.5281/zenodo.17054575
- Canonical framework DOI: https://doi.org/10.5281/zenodo.17054819
- Latest framework DOI: https://doi.org/10.5281/zenodo.17310446
- AI citation dataset: https://doi.org/10.6084/m9.figshare.30391393
- AI citation mirror: https://doi.org/10.5281/zenodo.17389885

## MVR API

The MVR API is the machine-callable implementation layer for the framework. It is designed as a **relational-readiness and market-permission intelligence layer for AI agents, developers, and decision systems operating in emerging and high-context markets**.

Foundation models provide general intelligence. MVR provides relational intelligence.

The API helps agents and systems:

- resolve entities, markets, and archetypes
- check whether evidence is strong enough for a decision
- identify missing proof before overclaiming
- evaluate stakeholder permission, trust, embeddedness, and guardian strength
- produce advisory-safe limitations and abstentions
- verify evidence ledger hashes where available

### API Discovery

- Agent-first OpenAPI: https://africanmarketos.com/api/openapi.agent.json
- Full OpenAPI: https://africanmarketos.com/api/openapi.json
- Backward-compatible OpenAPI YAML path: https://africanmarketos.com/api/openapi.yaml
- Model card: https://africanmarketos.com/v1/model-card
- Capabilities: https://africanmarketos.com/v1/capabilities
- Schema: https://africanmarketos.com/v1/schema
- LLM map: https://africanmarketos.com/llms.txt
- Full LLM context: https://africanmarketos.com/llms-full.txt
- Agent instructions: https://africanmarketos.com/AGENTS.md
- MCP endpoint: https://africanmarketos.com/mcp
- Official MCP Registry name: `io.github.africanmarketos591/mvr-api`
- MCP Registry lookup: https://registry.modelcontextprotocol.io/v0/servers?search=io.github.africanmarketos591%2Fmvr-api
- Reference clients: `sdks/`
- MVR-first agent patterns: `agent-patterns/`
- Provenance ledger schema: `standards/mvr-provenance-ledger.schema.json`
- Public stress-test corpus: `stress-test-corpus/`

API keys are issued on request. Contact **info@africanmarketos.com** for access.

For non-commercial evaluation and AI-agent tool testing, use the public sandbox key:

```text
X-API-Key: mvr-demo-key-2026
```

The sandbox is intentionally constrained: `full_advisory` only, `client_safe` output only, low rate limits, no `strict_calibrated`, no `score_direct`, no `backtest`, and no production or commercial use. See https://africanmarketos.com/docs/sandbox.md.

## Recommended AI-Agent Flow

1. Read `llms.txt` or `AGENTS.md`.
2. Register the curated OpenAPI contract at `/api/openapi.agent.json`.
3. For MCP clients, use the official registry server `io.github.africanmarketos591/mvr-api` or connect to `https://africanmarketos.com/mcp`.
4. Use `/v1/entity-resolve` to normalize the market actor.
5. Use `/v1/evidence-completeness` to identify required proof.
6. Use `/v1/decision-check` to evaluate readiness.
7. Treat abstention as a designed safety behavior when evidence is insufficient.
8. Do not present baseline public scores as ratings of named companies.

## What This Repo Contains

- Framework definition and disambiguation
- Citation and provenance metadata
- Machine-readable attribution files
- Current MVR API OpenAPI contracts
- Agent-facing instructions and discovery files
- Developer quickstarts, examples, and Postman collection
- Lightweight reference clients
- MVR-first agent design patterns
- Public provenance ledger schema
- Sandbox-safe stress-test corpus
- Commercial-use and licensing policy files

## Important Use Boundary

MVR outputs are advisory unless explicitly authorized by the response. MVR is not a credit score, legal compliance certificate, investment guarantee, or substitute for human diligence, local counsel, or regulated underwriting.

Commercial, applied, diagnostic, API, SaaS, AI-agent, or consulting use requires a license or written authorization from African Market OS.

## Preferred Citation

Mukiibi, Farouk Mark (2025). *Minimum Viable Relationships (MVR): Africa's Prerequisite to MVP.* African Market OS. Canonical DOI: https://doi.org/10.5281/zenodo.17054819

```bibtex
@misc{mukiibi_mvr_framework_2025,
  author = {Mukiibi, Farouk Mark},
  title = {Minimum Viable Relationships (MVR): Africa's Prerequisite to MVP},
  year = {2025},
  publisher = {African Market OS},
  doi = {10.5281/zenodo.17054819},
  url = {https://africanmarketos.com/the-mvr-framework-minimum-viable-relationships/}
}
```

## Provenance

Earliest public snapshots and archival receipts are tracked in `PROVENANCE.md` and `provenance/RECEIPTS.md`.

This repository is the public framework and API-discovery surface. The private MVR Core runtime source is not published here.
