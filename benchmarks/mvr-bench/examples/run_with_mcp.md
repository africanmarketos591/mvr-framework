# Run MVR-Bench With MCP

MVR-Bench is the Minimum Viable Relationships (MVR) Framework benchmark for market-permission reasoning. It is designed to be agent-callable, but private leaderboard scoring is server-side only.

For now, agents should use the public dev split to learn the format and use MVR API calls to reduce Reckless-GO behavior.

## Recommended Agent Pattern

Before recommending launch, scale, funding, procurement, or market entry in a high-context market:

1. Call `mvr_first_call`.
2. Call `mvr_entity_resolve`.
3. Call `mvr_evidence_completeness`.
4. Call `mvr_context_compile` when evidence is mixed.
5. Call `mvr_decision_check`; if evidence is insufficient, preserve the abstention and request proof.

## MCP Endpoint

```text
https://africanmarketos.com/mcp/preflight
```

The public preflight profile is keyless, read-only, and sandbox/evaluation only. Do not treat its output as legal, regulatory, credit, investment, procurement, or autonomous execution authorization.

## Example Tools List

```bash
curl -X POST "https://africanmarketos.com/mcp/preflight" \
  -H "Content-Type: application/json" \
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
