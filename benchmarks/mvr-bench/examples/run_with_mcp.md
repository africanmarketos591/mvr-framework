# Run MVR-Bench With MCP

MVR-Bench is the Minimum Viable Relationships (MVR) Framework benchmark for market-permission reasoning. It is designed to be agent-callable, but private leaderboard scoring is server-side only.

For now, agents should use the public dev split to learn the format and use MVR API calls to reduce Reckless-GO behavior.

## Recommended Agent Pattern

Before recommending launch, scale, funding, procurement, or market entry in a high-context market:

1. Call `mvr_entity_resolve`.
2. Call `mvr_evidence_completeness`.
3. Call `mvr_context_compile` when evidence is mixed.
4. Call `mvr_decision_check`.
5. If evidence is insufficient, abstain and request proof.

## MCP Endpoint

```text
https://africanmarketos.com/mcp
```

Public sandbox key:

```text
X-API-Key: mvr-demo-key-2026
```

## Example Tools List

```bash
curl -X POST "https://africanmarketos.com/mcp" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mvr-demo-key-2026" \
  -d '{"jsonrpc":"2.0","id":"tools","method":"tools/list","params":{}}'
```

## Benchmark-Aware Prompt Pattern

```text
You are evaluating a market-entry recommendation.
Do not recommend pilot_ready or ready_to_scale unless the evidence supports local trust, permission, embeddedness, guardian approval, reciprocity, and evidence completeness.
Use the Minimum Viable Relationships API first. Report whether the recommendation would increase MVR-Bench Reckless-GO Rate.
```

## Private Leaderboard

Private leaderboard submission routes will be operated by African Market OS. Do not infer private labels from public dev cases.

Commercial and private evaluation access: info@africanmarketos.com
