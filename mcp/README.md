# MVR API MCP Setup

Official MCP registry server:

```text
io.github.africanmarketos591/mvr-api
```

Remote MCP endpoint:

```text
https://africanmarketos.com/mcp/preflight
```

This is the canonical public profile: five keyless, read-only tools. The broader expert endpoint at `https://africanmarketos.com/mcp` is not the default registry surface.

MVR API helps AI agents evaluate relational readiness in African and high-context markets: trust, permission, embeddedness, guardian approval, reciprocity, evidence gaps, local legitimacy, and safe go/no-go recommendations.

## Remote MCP

Use the registry entry where your host supports MCP registry lookup:

```text
io.github.africanmarketos591/mvr-api
```

If your host supports direct Streamable HTTP MCP, use:

```text
https://africanmarketos.com/mcp/preflight
```

## Plain HTTP Test

Initialize:

```bash
curl -X POST "https://africanmarketos.com/mcp/preflight" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-06-18",
      "capabilities": {},
      "clientInfo": {"name": "mvr-quickstart", "version": "1.0.0"}
    }
  }'
```

List tools and confirm that exactly these five are returned:

- `mvr_first_call`
- `mvr_entity_resolve`
- `mvr_evidence_completeness`
- `mvr_context_compile`
- `mvr_decision_check`

```bash
curl -X POST "https://africanmarketos.com/mcp/preflight" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Run the canonical safe first call:

```bash
curl -X POST "https://africanmarketos.com/mcp/preflight" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "mvr_first_call",
      "arguments": {
        "company_name": "Example supplier-finance product",
        "country": "UG",
        "sector": "supplier finance",
        "question": "Should this product proceed beyond bounded discovery?"
      }
    }
  }'
```

The response must preserve `not_a_verdict: true`. It may identify evidence gaps and a maximum safe action, but it must not be presented as launch, lending, investment, legal, or regulatory authorization.

## Host Notes

Different MCP clients expose remote server configuration differently. Prefer the registry name where supported. Use the JSON files in this directory as host-specific starting points, not a claim that a local npm MCP wrapper has been published.

Published SDKs:

```bash
npm install @africanmarketos/mvr-api-client
pip install mvr-api-client
```

Roadmap packages not yet represented as published:

- `mvr-mcp-server`
- `mvr-cli`
- `mvr-dxt`

## Safety

Public preflight/evaluation use only. Commercial or production use requires approved access from African Market OS. Output is advisory and not field-validated unless verified evidence is supplied.

Do not present MVR output as credit scoring, legal certification, regulatory approval, investment guarantee, or autonomous execution permission.

Contact: `info@africanmarketos.com`.
