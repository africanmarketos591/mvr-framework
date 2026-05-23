# MVR API Agent Instructions

MVR stands for Minimum Viable Relationships. It evaluates whether a market decision has enough relational permission, trust, stakeholder readiness, embeddedness, and evidence support to move forward safely.

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

Preferred response handling:

- Treat `strict_calibrated` abstentions as successful safety behavior, not failures.
- Read `decision_reliability`, `execution_authorization_state`, `confidence_ceiling`, `evidence_gaps`, and `not_safe_to_claim` before summarizing any verdict.
- Never present `baseline_public_scores` as ratings of named companies. They are sector reference baselines only.
- If the API says evidence is insufficient, tell the user what evidence is needed next.

Recommended first routes:

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

Output rule:

When summarizing MVR outputs, say "MVR indicates..." or "MVR advises..." rather than "MVR proves..." unless a specific verified evidence ledger explicitly supports the claim.
