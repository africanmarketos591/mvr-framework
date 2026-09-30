# Retest10 engineering decision

Target revision: `2026-09-30.outsider-retest10.1`.

## Independently reproduced findings

- **N16 confirmed on Retest9 production.** An abstained licensed MCP decision returned `local_relational_assessment.score_summary: null`, which failed its advertised object-only output schema. Preserve the honest null value, mark the shared OpenAPI component nullable, and expose object-or-null through the MCP JSON Schema projection. Do not manufacture scores or a verdict.
- **N15 confirmed on Retest9 production.** ROI accepted an unknown `simulation` object and ignored it. Reject unknown caller fields with a named 422 validation error. Keep documented financial aliases and explicit simulation controls. Publish existing gateway output/profile/detail controls so they remain accepted. Server metadata is exempt only after the common gateway has rejected caller-supplied internal fields.
- **Public regression gap confirmed.** OpenAPI Sanity previously checked parsing and metadata only. It now rejects anonymous POST request contracts across all eight published specifications, including referenced contracts and permissive union branches. Its mutation tests run in the same public job.
- **Sandbox mirror drift found.** The two sandbox files still described an older six-route surface. Regenerate them from the actual served five-step preflight specification, together with the full and agent mirrors.

## Pulse observation corrected

The supplied record's one pulse 503 reports `atomic_rate_limit_backend_required`. It is a fail-closed response when atomic rate limiting is unavailable, not evidence of a route crash. The subsequent unscoped 200 responses report `scope_not_supplied`; they do not establish a continuing degraded upstream dependency. A scoped request without signals reports `fog_of_war_data_starvation`. Preserve these distinctions and do not bypass the rate limiter. One transient record does not establish its infrastructure root cause.

## Durable regression coverage

- Public gate: 32 positive/negative mutation cases; local references, composed schemas, permissive branches, missing contracts, malformed references and intentionally empty contracts.
- Private catalogue: all 179 POST contracts, field-type mutations, owned compatibility fixtures, terminal templates and all 50 distinct published request examples, including schema-level alternatives rather than only the first example per route. Historical raw traffic remains an optional compatibility audit, not a source of test credentials or production mutations.
- Licensed output: both response profiles through all five MCP steps, including the abstaining final response; positive and abstained HTTP output across three output modes and both detail levels. Invalid score-summary scalars and incorrectly typed candidate flags must still fail validation.
- ROI: unknown and underscore-prefixed controls fail with their names; supported aliases and body transport controls remain valid; equivalent deterministic inputs preserve ROI output.
- Existing full Worker, security, storage, history, calibration, scoring and frontend regressions remain required before release. Deployment and live acceptance evidence are recorded separately; this document alone is not deployment attestation.

The public check guarantees **zero anonymous POST contracts**, not complete semantic equivalence between every possible request and every runtime path. It deliberately permits extensible objects with named fields and intentional empty-object endpoints.

## Compatibility and safety

Nullable output describes existing behaviour. Rejecting ignored ROI fields is an intentional validation tightening: use `simulation_iterations` and `simulation_seed`, not `simulation` or `monte_carlo`. No scoring formula, evidence permission, authorization ceiling, calibration approval, key entitlement or durable-storage binding is changed. No quarantine is cleared or rehashed.

MCP requires structured output to conform to the declared output schema ([official tools specification](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)). OpenAPI 3.0 represents nullability using `nullable`, unlike JSON Schema's null type ([official OpenAPI specification](https://spec.openapis.org/oas/v3.0.3.html)).

## Host evidence boundary

The supplied Your dot screenshot shows the setup screen, not a configured AMOS connection or successful execution. Dots host integration and Grok Bot host execution remain unverified. Existing broader xAI API and Grok.com connector evidence is not invalidated, but it cannot certify those separate hosts. No Dot was created and no privacy choice changed during this review.
