# n8n: MVR First-Call Preflight

This importable workflow calls the keyless, read-only African Market OS public MCP profile and returns a bounded MVR activation result.

## Boundary

- Calls only `mvr_first_call` at `https://africanmarketos.com/mcp/preflight`.
- Does not use or embed an API key.
- Does not send an evidence pack, confidential documents, personal data, or raw interview records.
- Does not call `mvr_decision_check` or produce a go/no-go verdict.
- Can return only `DISCOVERY_ONLY` or `ABSTAIN_TECHNICAL`.
- Always returns `action_authorized: false` and `human_review_required: true` on a successful public call.
- Disables n8n success and error execution-data retention in the exported workflow settings.

The public MCP response is advisory and does not authorize launch, lending, investment, partnership, scale, legal, or regulatory action.

## Import And Test

1. In n8n, import `mvr-first-call-preflight.n8n.json`.
2. Keep the workflow inactive while reviewing the example input.
3. Replace the fictional example fields with non-confidential decision context.
4. Run the workflow manually.
5. Confirm the final node returns `not_a_verdict: true`, `live_mvr_scoring_executed: false`, and `action_authorized: false`.

Run the repository validator before publishing or modifying the template:

```bash
python scripts/validate_n8n_first_call.py
```

## Production Workflows

Do not extend this public template into an authorization workflow. Licensed production use requires tenant-scoped credentials, the current production contract, explicit evidence handling and retention rules, and recorded human approval. Request access at https://africanmarketos.com/get-api-key.
