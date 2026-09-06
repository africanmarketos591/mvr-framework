# Quickstart For AI Agents

African Market OS-MVR API supports evidence collection and bounded decision review for African and high-context markets. Public preflight does not compute a readiness verdict, even after its structural gate passes.

## Choose The Correct Transport

| Surface | Access | Purpose |
| --- | --- | --- |
| /mcp/preflight | No key | Canonical five-tool public evidence preflight |
| /mcp/guided | No key | One-call wrapper over the same bounded sequence |
| /a2a | No key; A2A-Version: 1.0 | Public JSON-RPC delegation to bounded preflight skills |
| /v1/first-call | No key required | Public REST activation and evidence-gap routing |
| Eligible REST sandbox routes | X-API-Key: mvr-demo-key-2026 | Non-commercial, full_advisory, client-safe evaluation only |
| /mcp/runtime | Active licensed tenant credential with the required scope | Licensed MCP; not universally Enterprise-only |
| /v1/mcp | ENTERPRISE plan and route authorization | Separate governed REST orchestration utility, not the public MCP transport |

A demo key does not upgrade public MCP or A2A. It cannot enter the licensed runtime or select strict_calibrated. Licensed credentials retain plan, tenant, route, output and quota restrictions. A paid key does not authorize every use case.

## MCP: Follow The Returned Call

Use the [MCP integration guide](https://africanmarketos.com/docs/mcp-integration.md) for exact modern and legacy protocol examples. Read tools/list rather than guessing arguments.

mvr_first_call and mvr_guided_preflight accept root argument fields. The later five-tool steps use arguments.payload. These supported shapes are intentionally preserved for existing clients. When continuation_disposition is call_now, use mcp_next_call.name and mcp_next_call.arguments unchanged. This carries the workflow_id, workflow_expires_at, context and evidence forward. Add transport metadata beside name and arguments; do not put it inside the payload.

At await_input, ask for the missing input or evidence. At terminal, stop. mcp_next_call is null at a pause by design. evidence_recovery explains how the client can resubmit its complete corrected pack; it is not an executable automatic retry. The two-hour ID is operational context, not a stored evidence session or authorization token.

Read result.structuredContent for tool data; outputSchema describes that object, not the whole JSON-RPC envelope. The text content is a compact presentation summary.

The [public evidence-item schema](https://africanmarketos.com/schemas/mvr-public-preflight-evidence.schema.json) is also inlined in tools/list. evidence_available contains optional context labels, not proof. Missing geography is a warning on each evidence item; do not invent it to satisfy a required field. evidence_fit checks declared country/date consistency and an optional caller-declared context_freshness_window_days; known foreign or out-of-window items do not supply coverage. Source validation remains required even after coverage passes. Public preflight does not authenticate source independence, permission, freshness, geographic fit or claim truth. See the [integration guide](https://africanmarketos.com/docs/mcp-integration.md) for background exclusions and evidence recovery.

## REST: Request Bodies Are Not Tool Results

Start with an illustrative activation request:

```bash
curl -X POST https://africanmarketos.com/v1/first-call \
  -H "Content-Type: application/json" \
  -d '{"entity":"Example Kenya distributor","country":"KE","sector":"retail","question":"What evidence is missing before expansion to Kisumu?","evidence_available":[]}'
```

Read evidence_gaps, exact_next_calls and example_next_request. Do not look for invented aliases such as next_calls or missing_proof. The REST first-call response also exposes MCP handoff fields for clients choosing that transport; those fields are not a REST context-compile request body.

For the REST chain, start with example_next_request for entity resolution. Subsequent responses can expose rest_continuation: merge body_context with the named copy_from_previous_request fields from your own prior request. Respect required_user_inputs and the disposition. Credentials stay in headers. Do not POST the complete previous response as evidence, skip directly from first-call to context compilation, or reinterpret an HTTP 200 as a readiness decision.

Use the [REST OpenAPI](https://africanmarketos.com/api/openapi.agent.json) for route-specific fields. REST evidence envelopes and public MCP structural metadata serve different checks; they are not interchangeable scoring contracts.

## Context Compile: Missing Versus Malformed

This deliberately valid empty request returns HTTP 200 with status verification_required and no_context_evidence_supplied, not an approved decision:

```bash
curl -X POST https://africanmarketos.com/v1/context/compile \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mvr-demo-key-2026" \
  -d '{}'
```

An omitted subject, country, analysis_date or evidence pack remains acceptable for incomplete-context analysis. If fields are supplied, use their declared types: evidence_pack and compiled-pack evidence lanes must contain objects, context containers must be objects, and analysis_date must be a real ISO date or datetime. Malformed structure returns HTTP 422 with field paths. Incomplete evidence objects can still return verification_required; type validity does not establish evidence quality.

Check verification_required, safe_inferences, unsafe_inferences, context_readiness and rest_continuation before any next request. Empty input does not grant substantive inference. A later decision-check has its own evidence, scope and authorization requirements.

## A2A: A Separate JSON-RPC Contract

Public A2A needs no production key. Send A2A-Version: 1.0, a JSON-RPC 2.0 object, method SendMessage, and a message with ROLE_USER. This illustrative request only asks for missing-evidence guidance:

```bash
curl -X POST https://africanmarketos.com/a2a \
  -H "Content-Type: application/json" \
  -H "A2A-Version: 1.0" \
  -d '{"jsonrpc":"2.0","id":"example-1","method":"SendMessage","params":{"message":{"messageId":"example-1","role":"ROLE_USER","parts":[{"data":{"skillId":"stakeholder-evidence-completeness","payload":{"evidence_pack":[]}}}]}}}'
```

Read JSON-RPC error even when HTTP status is 200. Successful data is in result.message.parts[].data; the nested result is still non-authorizing. Bare REST JSON and older role/part shapes are not this endpoint's contract. The public endpoint does not provide durable task storage or autonomous consequential delegation.

Protocol reference: https://a2a-protocol.org/latest/specification/

## Backoff And Access Errors

For HTTP 429, honor Retry-After and retry_after in the JSON body; do not assume a fixed one-minute delay. The delay is calculated from the binding minute or UTC-day quota, so a depleted daily allowance can require hours. The public demo key shares a quota across its users. Cache discovery, avoid redundant calls, and add jitter after the specified wait. Do not rotate keys or switch identities to evade limits.

HTTP 400/422 normally needs request correction, not blind retry. HTTP 401/403 requires valid authentication or authorized scope, not repeated attempts. A JSON-RPC error is distinct from a successful tool result that says await_input. For transient 503, back off and use a bounded retry policy; never turn failure into approval.

For a reproducible issue, supply the endpoint, UTC time, HTTP status, cf-ray and a redacted minimal request. Never share keys, private evidence or personal identifiers. Coordinate load tests in advance; a small burst is not an enterprise availability certification.

Attribution: Minimum Viable Relationships (MVR), originated by Farouk Mark Mukiibi, African Market OS.
