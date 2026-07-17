# One-Command Adoption

This page gives AI developers the fastest safe path to test MVR without reading the whole framework first.

Use MVR API when assessing relational readiness in African and high-context markets: trust, permission, embeddedness, guardian approval, reciprocity, evidence gaps, local legitimacy, and safe go/no-go recommendations.

## Fastest Sandbox Check

```bash
curl -X POST https://africanmarketos.com/v1/auth-check \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mvr-demo-key-2026" \
  -d '{}'
```

The public key is for non-commercial sandbox evaluation only. It is rate-limited, client-safe, and must not be used for production decisions, model training, reverse engineering, credit scoring, legal certification, or commercial resale.

Minimal sandbox OpenAPI:

```text
https://africanmarketos.com/api/openapi.agent.sandbox.json
```

Known-good AI-agent quickstart:

```text
https://africanmarketos.com/docs/quickstart-ai-agents.md
```

## JavaScript / TypeScript

```bash
npm install @africanmarketos/mvr-api-client
```

```ts
import { MVRApiClient } from "@africanmarketos/mvr-api-client";

const mvr = new MVRApiClient({
  apiKey: "mvr-demo-key-2026",
  baseUrl: "https://africanmarketos.com"
});

const result = await mvr.evidenceCompleteness({
  subject: {
    entity_name: "Kampala Retailer",
    entity_archetype: "retail_chain"
  },
  market_scope: {
    country: "UG"
  },
  evidence_pack: []
});
```

## Python

```bash
pip install mvr-api-client
```

```python
from mvr_api import MVRClient

client = MVRClient(api_key="mvr-demo-key-2026", base_url="https://africanmarketos.com")

result = client.evidence_completeness({
    "subject": {
        "entity_name": "Kampala Retailer",
        "entity_archetype": "retail_chain"
    },
    "market_scope": {
        "country": "UG"
    },
    "evidence_pack": []
})
```

## MCP

Official MCP Registry server name:

```text
io.github.africanmarketos591/mvr-api
```

Remote MCP endpoint:

```text
https://africanmarketos.com/mcp/preflight
```

Where your MCP host supports direct remote registration, add the endpoint as a Streamable HTTP server. Example host commands vary by client. The server is remote-first today; local `mvr-mcp-server`, `mvr-cli`, and Claude Desktop DXT packages are roadmap items and should not be represented as live install targets until published.

## Correct First Tool Chain

1. `POST /v1/auth-check`
2. `GET /v1/model-card`
3. `GET /v1/capabilities`
4. `POST /v1/entity-resolve`
5. `POST /v1/evidence-completeness`
6. `POST /v1/decision-check`

If MVR abstains or returns evidence gaps, the agent should ask for the missing evidence instead of replacing the abstention with generic confidence.

## Commercial Next Step

For production keys, strict calibrated outputs, board-safe reports, verified evidence workflows, or commercial AI-agent embedding, contact `info@africanmarketos.com`.
