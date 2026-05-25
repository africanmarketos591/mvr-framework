# MVR API MCP Setup

Official MCP registry server:

```text
io.github.africanmarketos591/mvr-api
```

Remote MCP endpoint:

```text
https://africanmarketos.com/mcp
```

Public sandbox key for non-commercial evaluation:

```text
X-API-Key: mvr-demo-key-2026
```

MVR API helps AI agents evaluate relational readiness in African and high-context markets: trust, permission, embeddedness, guardian approval, reciprocity, evidence gaps, local legitimacy, and safe go/no-go recommendations.

## Remote MCP

Use the registry entry where your host supports MCP registry lookup:

```text
io.github.africanmarketos591/mvr-api
```

If your host supports direct Streamable HTTP MCP, use:

```text
https://africanmarketos.com/mcp
```

## Plain HTTP Test

List tools:

```bash
curl -X POST "https://africanmarketos.com/mcp" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mvr-demo-key-2026" \
  -d '{"method":"tools/list"}'
```

Call a narrow wrapper tool:

```bash
curl -X POST "https://africanmarketos.com/mcp" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mvr-demo-key-2026" \
  -d '{
    "method": "tools/call",
    "params": {
      "name": "mvr_preflight_market_entry",
      "arguments": {
        "company_name": "Mobile lending fintech",
        "country": "UG",
        "sector": "fintech",
        "stage": "pilot",
        "target_users": "Kampala micro-merchants",
        "known_partners": ["mobile money agents"],
        "evidence_available": ["field_observation", "licence"]
      }
    }
  }'
```

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

Sandbox/evaluation use only. Commercial use requires a license from African Market OS. Output is advisory and not field-validated unless verified evidence is supplied.

Do not present MVR output as credit scoring, legal certification, regulatory approval, investment guarantee, or autonomous execution permission.

Contact: `info@africanmarketos.com`.
