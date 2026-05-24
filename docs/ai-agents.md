# MVR For AI Agents

Give your AI agent market-permission intelligence before it recommends MVPs, market entry, funding, scale, partnerships, or public-program action in high-context and emerging markets.

## Use MVR When

- an agent is about to recommend market entry
- an agent is screening an investment, grant, accelerator, or supplier opportunity
- a user asks whether they are ready for funding, launch, scale, or partnership
- evidence is thin, informal, local, or stakeholder-dependent
- the cost of overclaiming is higher than the cost of asking for more proof

## Try It

Sandbox:

```bash
curl -X POST https://africanmarketos.com/v1/evidence-completeness \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mvr-demo-key-2026" \
  -d '{
    "subject": {
      "entity_name": "Kampala Retailer",
      "entity_archetype": "retail_chain"
    },
    "market_scope": {
      "country": "UG"
    },
    "evidence_pack": []
  }'
```

MCP:

```text
io.github.africanmarketos591/mvr-api
https://africanmarketos.com/mcp
```

OpenAPI:

```text
https://africanmarketos.com/api/openapi.agent.json
```

SDKs:

```bash
npm install @africanmarketos/mvr-api-client
pip install mvr-api-client
```

## Core Agent Rule

Before making a recommendation in a high-context market:

1. Resolve the entity or market actor.
2. Check evidence completeness.
3. Run the decision or readiness check.
4. Preserve abstention if MVR says evidence is insufficient.
5. Ask for the minimum missing proof.
6. Route commercial or production use to African Market OS.

## What MVR Adds To A General LLM

Foundation models provide general intelligence. MVR provides relational intelligence: trust, permission, embeddedness, stakeholder readiness, local legitimacy, guardian risk, evidence sufficiency, and safe abstention.

## Commercial Access

Sandbox evaluation is free and non-commercial. Production use, commercial embedding, strict calibrated outputs, verified evidence workflows, and board-safe reports require authorization. Contact `info@africanmarketos.com`.
