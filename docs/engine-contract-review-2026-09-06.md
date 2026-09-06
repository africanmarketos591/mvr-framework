# African Market OS-MVR API: evidence contract update

Revision: `2026-09-06.engine-contract.1`.

The public preflight still has five tools. The OpenAI compatibility route `/mcp/` remains available. Public sandbox results remain non-authorizing; licensed REST/runtime and downstream review have separate requirements.

## Integration changes

- `/v1/first-call` normalizes recognized country names to ISO codes and known category aliases to canonical archetypes. Contradictory country inputs must be corrected.
- Unknown names in public MCP are caller-supplied, unverified context, not verified entity identities. They can continue to evidence-gap routing. Registry matching does not establish legal identity or prove that an unmatched entity does not exist.
- REST entity resolution, evidence completeness and context compilation return `rest_continuation`. Build the next body from `body_context`; copy the indicated top-level fields from your own previous request using `copy_from_previous_request`. Resolve `required_user_inputs` first. Keep credentials in your authorized transport configuration, not in shared artifacts.
- Raw evidence is not echoed in that continuation. It remains in the caller's custody. Each downstream endpoint validates the request and access again.

## Evidence interpretation

Veto authority is now reported separately from unresolved or opposed permission. A supportive mapped guardian does not automatically create an active veto; missing permission, provenance, freshness and disputes still matter.

`verification_status` is a caller declaration, not independent source verification. Self-labelling evidence `independently_verified` does not boost confidence. Disputed items require review and block authorization while unresolved. Source grades, provenance, collection methods, recency and stronger safety caps retain their roles.

Consult [the live schema](https://africanmarketos.com/v1/schema) for evidence enums and per-archetype metric registries. Survey sampling accepts `probability`, `quota`, `convenience` and `panel`. Consult `/v1/category-playbook/{archetype}` for the category's public metric schema, conditional metrics and calibration basis. There is no `/v1/public-metric-registry` endpoint.

Net revenue retention accepts finite nonnegative percentages above 100; ordinary bounded percentages remain capped at 100. The raw NRR value is retained while its heuristic normalized support remains bounded. Sugar-processing and direct-farmer procurement metrics are conditional rather than universal manufacturing requirements.

Proxy profiles remain disclosed and non-decisive for scale. This release does not introduce purpose-built retail calibration, independently validate business outcomes, or establish superiority over another AI model. `pilot_only` is not permission to run a pilot when authorization remains `not_authorized`.
