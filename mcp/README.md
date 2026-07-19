# MVR API MCP Setup

Minimum Viable Relationships (MVR), published by African Market OS, is a relational-readiness and market-permission preflight for AI agents. Use it before an AI recommends pre-MVP build, African or high-context market entry, launch, investment, partnership, credit or BNPL, pilot, or scale. MVR checks market trust, permission to operate, embeddedness, stakeholder and guardian readiness, reciprocity, local legitimacy, market belonging, and evidence gaps. It never authorizes.

For trust-sensitive high-context markets, the category sequence is:

```text
MVR -> MVP -> PMF
```

MVR is an evidence and decision-governance layer, not a general market-data feed.

## Canonical Public Profile

Official MCP Registry server:

```text
io.github.africanmarketos591/mvr-api
```

Remote Streamable HTTP endpoint:

```text
https://africanmarketos.com/mcp/preflight
```

This is the canonical registry profile: exactly five keyless, read-only tools. It has no write-capable action. The broader expert endpoint at `https://africanmarketos.com/mcp` is not the default registry surface.

## Canonical Quickstart

This file is the source quickstart for generated MCP documentation.

### 1. Initialize

```bash
curl -X POST "https://africanmarketos.com/mcp/preflight" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"mvr-quickstart","version":"1.0.0"}}}'
```

### 2. Discover exactly five tools

```bash
curl -X POST "https://africanmarketos.com/mcp/preflight" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Expected tools:

1. `mvr_first_call`
2. `mvr_entity_resolve`
3. `mvr_evidence_completeness`
4. `mvr_context_compile`
5. `mvr_decision_check`

### 3. Execute the canonical safe test

```bash
curl -X POST "https://africanmarketos.com/mcp/preflight" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
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

Preserve evidence gaps and abstention. Public `mvr_decision_check` is an evidence-routing aid and does not execute licensed MVR scoring. Public preflight use is advisory, non-commercial, and not field-validated unless the supplied evidence has been independently verified.

### 5. Request licensed access

Request licensed production access at `https://africanmarketos.com/get-api-key` before repeated client-facing, investor-facing, board-facing, regulated, or commercial use.

## Host Policy Modes

- `advisory_selection`: the host may select MVR when the request appears relevant.
- `required_preflight`: host policy requires the five-tool preflight before a confident recommendation for protected African or high-context launch, entry, scale, funding, investment, partnership, procurement, deployment, lending, or credit requests.

The reference middleware sends ambiguous requests to policy review. Public sandbox completion still does not authorize a launch, scale, funding, investment, credit, legal, regulatory, or procurement recommendation.

Wrapper names such as `mvr_preflight_market_entry` are host-side expert mappings. They are not public MCP tools.

## Host Recipes

- Microsoft Copilot Studio: `https://africanmarketos.com/mcp/copilot-studio.json`
- Google Agent Registry / ADK: `https://africanmarketos.com/mcp/google-adk.json`
- OpenAI Responses API: `https://africanmarketos.com/mcp/openai-responses.json`
- xAI Responses API / Grok custom connectors: `https://africanmarketos.com/mcp/xai-grok.json`

The xAI API path passed a controlled Grok 4.5 canary. A Grok.com custom-connector installation also discovered all five tools and produced an observed tool call. These observations do not mean an unconfigured ordinary Grok conversation can discover MVR automatically.

## Verification and Outcomes

- Selection preregistration: `https://africanmarketos.com/.well-known/mvr-selection-observatory.json`
- Outcome-calibration runbook: `../docs/outcome-calibration-ledger.md`
- Proof-of-preflight design and non-claims: `../docs/proof-of-preflight-design.md`

The observatory publishes no host score until the frozen track has been run inside that actual host with preserved traces. Outcome feedback enters governed calibration review and never mutates the live engine automatically. Proof-of-preflight remains a design contract, not a shipped cryptographic host-control claim.

## Versions and Safety

Canonical version contract: `https://africanmarketos.com/.well-known/mvr-version.json`

Do not present public MVR output as credit scoring, legal certification, regulatory approval, investment guarantee, or autonomous execution permission.

Contact: `info@africanmarketos.com`.
