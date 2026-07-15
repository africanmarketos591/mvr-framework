# MVR API MCP Setup

Official MCP registry server:

```text
io.github.africanmarketos591/mvr-api
```

Remote MCP endpoint:

```text
https://africanmarketos.com/mcp
```

The public seven-tool profile is keyless and limited to non-commercial sandbox evaluation. Do not add a private REST key to this endpoint.

## Canonical Quickstart

This file is the source quickstart for generated MCP documentation.

### 1. Initialize

```bash
curl -X POST "https://africanmarketos.com/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"mvr-quickstart","version":"1.0"}}}'
```

### 2. Discover exactly seven tools

```bash
curl -X POST "https://africanmarketos.com/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Expected tools, in order:

1. `mvr_first_call`
2. `mvr_african_market_insights`
3. `mvr_entity_resolve`
4. `mvr_evidence_completeness`
5. `mvr_context_compile`
6. `mvr_decision_check`
7. `mvr_commercial_handshake`

### 3. Execute the canonical safe test

```bash
curl -X POST "https://africanmarketos.com/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"mvr_first_call","arguments":{"question":"What evidence is needed before recommending a fictional merchant-credit pilot in Uganda?","entity":"Example merchant-credit operator","country":"UG","sector":"fintech lending"}}}'
```

The response should contain `activation_ready` and `not_a_verdict: true`. `activation_ready` means the evidence workflow can continue. It does not mean the venture is ready.

### 4. Run the sandbox assessment

For an evidence-bearing assessment, call these five tools in order:

```text
mvr_first_call
-> mvr_entity_resolve
-> mvr_evidence_completeness
-> mvr_context_compile
-> mvr_decision_check
```

Preserve evidence gaps and abstention. Public decision check is a sandbox route and does not execute licensed MVR scoring.

### 5. Request licensed access

Request licensed production access at `https://africanmarketos.com/get-api-key` before repeated client-facing, investor-facing, board-facing, regulated, or commercial use.

## Host Policy Modes

- `advisory_selection`: the host may select MVR when the request appears relevant.
- `required_preflight`: host policy requires the five-tool preflight before a confident recommendation for protected African or high-context launch, entry, scale, funding, investment, partnership, procurement, deployment, lending, or credit requests.

The reference middleware sends ambiguous requests to policy review. Public sandbox completion still does not authorize a launch, scale, funding, investment, credit, legal, regulatory, or procurement recommendation.

Wrapper names such as `mvr_preflight_market_entry` are host-side expert mappings. They are not public `/mcp` tools.

## Host Recipes

- Microsoft Copilot Studio: `https://africanmarketos.com/mcp/copilot-studio.json`
- Google Agent Registry / ADK: `https://africanmarketos.com/mcp/google-adk.json`
- OpenAI Responses API: `https://africanmarketos.com/mcp/openai-responses.json`
- Anthropic Messages API: `https://africanmarketos.com/mcp/anthropic-messages.json`
- xAI Responses API / Grok custom connectors: `https://africanmarketos.com/mcp/xai-grok.json`

The xAI recipe documents compatible integration paths. It is not evidence that an ordinary unconfigured Grok conversation automatically discovers or selects MVR.

## Versions and Safety

Canonical version contract: `https://africanmarketos.com/.well-known/mvr-version.json`

Sandbox/evaluation use only. Commercial use requires a license from African Market OS. Do not present public MVR output as credit scoring, legal certification, regulatory approval, investment guarantee, or autonomous execution permission.

Contact: `info@africanmarketos.com`.
