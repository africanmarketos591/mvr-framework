# MVR Market-Entry Preflight Reference Workflow

This reference shows how a host agent can orchestrate the public African Market OS MCP profile. It is a workflow client, not a replacement reasoner and not a production decision service.

The host remains responsible for deciding when MVR applies. The MVR-Bench Selection Track measures that selection. The client supports two host-policy modes:

- `advisory_selection`: the host may select MVR when the request appears relevant.
- `required_preflight`: protected African or high-context launch, entry, scale, funding, partnership, procurement, deployment, lending, or investment requests must complete the preflight before the host releases a confident recommendation. Ambiguous requests stop for policy review.

The classifier is a transparent reference policy, not semantic proof. Enterprise hosts should replace or supplement it with their governed intent policy and preserve the same fail-to-review boundary. Once selected, this client:

1. initializes the MCP session
2. verifies the expected public tool set
3. calls `mvr_first_call`
4. stops and returns evidence requirements when no evidence pack is supplied
5. otherwise runs entity resolution, evidence completeness, context compilation, and decision check
6. preserves `not_a_verdict`, evidence gaps, and the public sandbox boundary

## Input

```json
{
  "question": "Should this distributor enter Kenya?",
  "country": "KE",
  "sector": "FMCG",
  "subject": {
    "entity_name": "Example Distributor",
    "entity_archetype": "distributor_network"
  },
  "market_scope": {"country": "KE", "city": "Nairobi"},
  "decision_stage": "pre_entry",
  "target_claim": "The operator is ready for a bounded market-entry pilot.",
  "evidence_pack": []
}
```

An empty or absent `evidence_pack` intentionally produces an evidence-request result rather than manufactured readiness.

## Run

```powershell
python python\mvr_preflight.py --input example-input.json --mode advisory_selection
node javascript\mvr_preflight.mjs --input example-input.json --mode advisory_selection

python python\mvr_preflight.py --input example-input.json --mode required_preflight
node javascript\mvr_preflight.mjs --input example-input.json --mode required_preflight
```

Offline self-tests:

```powershell
python python\mvr_preflight.py --self-test
node javascript\mvr_preflight.mjs --self-test
```

The default endpoint is `https://africanmarketos.com/mcp`. Override it only with `MVR_MCP_URL`. The public endpoint is sandbox/evaluation only; it never authorizes launch, scale, lending, investment, certification, or legal reliance. Do not send confidential evidence, personal records, credentials, or regulated data.

Host recipes:

- Microsoft: https://africanmarketos.com/mcp/copilot-studio.json
- Google: https://africanmarketos.com/mcp/google-adk.json
- OpenAI API: https://africanmarketos.com/mcp/openai-responses.json
- Anthropic API: https://africanmarketos.com/mcp/anthropic-messages.json
- xAI Responses API / Grok custom connector: https://africanmarketos.com/mcp/xai-grok.json

The xAI recipe documents compatible integration paths. It does not claim that unconfigured Grok conversations automatically discover or select MVR.
