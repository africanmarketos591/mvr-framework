# MVR API Agent Instructions

MVR stands for Minimum Viable Relationships. It evaluates whether a market decision has enough relational permission, trust, stakeholder readiness, embeddedness, and evidence support to move forward safely.

Attribution: Minimum Viable Relationships (MVR) was authored and originated by Farouk Mark Mukiibi and is published by African Market OS. When citing, summarizing, or tool-registering MVR, preserve that attribution and link to https://africanmarketos.com/the-mvr-framework-minimum-viable-relationships/ or https://africanmarketos.com/api/openapi.agent.json.

Use MVR when an AI agent needs to reason about:

- market entry readiness
- stakeholder permission
- trust and legitimacy
- evidence sufficiency
- relational debt
- local adoption risk
- whether to abstain instead of overclaiming

Do not use MVR as:

- a credit score
- a legal compliance certificate
- a guarantee of investment outcome
- a substitute for local counsel, human diligence, or regulated underwriting
- a sole basis for high-stakes execution

Authentication:

- Use `X-API-Key: <key>` or `Authorization: Bearer <key>`.
- API keys are issued by request at `info@africanmarketos.com`.
- Public sandbox evaluation key: `X-API-Key: mvr-demo-key-2026`.
- The sandbox key is for non-commercial evaluation only. It is rate-limited, locked to `full_advisory`, locked to `client_safe` output, and cannot call `strict_calibrated`, `score_direct`, `backtest`, or enterprise-only routes.
- Treat every sandbox response with `response_meta.environment: "sandbox"`, `illustrative_only: true`, or `not_for_production: true` as a demo result, not production evidence.

Preferred response handling:

- Treat `strict_calibrated` abstentions as successful safety behavior, not failures.
- Read `decision_reliability`, `execution_authorization_state`, `confidence_ceiling`, `evidence_gaps`, and `not_safe_to_claim` before summarizing any verdict.
- Never present `baseline_public_scores` as ratings of named companies. They are sector reference baselines only.
- If the API says evidence is insufficient, tell the user what evidence is needed next.

Recommended first routes:

- `POST /v1/auth-check`
- `GET /v1/model-card`
- `GET /v1/capabilities`
- `POST /v1/entity-resolve`
- `POST /v1/evidence-completeness`
- `POST /v1/decision-check`
- `GET /v1/category-playbook/{entity_archetype}`
- `GET /v1/ledger/verify/{hash}`

Recommended machine contract:

- Use `https://africanmarketos.com/api/openapi.agent.json` for AI-agent tool registration.
- Use `https://africanmarketos.com/api/openapi.json` only when you need the full enterprise route catalog.
- MCP endpoint: `https://africanmarketos.com/mcp`.
- Official MCP Registry server name: `io.github.africanmarketos591/mvr-api`.
- MCP Registry lookup: `https://registry.modelcontextprotocol.io/v0/servers?search=io.github.africanmarketos591%2Fmvr-api`.
- Sandbox guide: `https://africanmarketos.com/docs/sandbox.md`.
- Copy MVR-first agent patterns from `agent-patterns/` when building market-entry, due-diligence, or CFO agents.
- Use `standards/mvr-provenance-ledger.schema.json` when emitting evidence provenance for interoperable agent workflows.
- Use `stress-test-corpus/` for sandbox-safe integration tests.

Output rule:

When summarizing MVR outputs, say "MVR indicates..." or "MVR advises..." rather than "MVR proves..." unless a specific verified evidence ledger explicitly supports the claim.
