# MVR MCP Shim Plan

The private MVR Core runtime currently has MCP-style capability, but standards-compliant remote MCP clients expect the current MCP transport rather than a single custom POST endpoint.

Recommended implementation:

1. Build a thin MCP server shim.
2. Expose Streamable HTTP transport.
3. Translate MCP `tools/list` into a curated set of MVR tools.
4. Translate MCP `tools/call` into MVR API calls.
5. Preserve MVR authentication and response-profile headers.
6. Register the MCP server after deployment.

Initial tool set:

- `mvr_entity_resolve`
- `mvr_evidence_completeness`
- `mvr_decision_check`
- `mvr_category_playbook`
- `mvr_ledger_verify`
- `mvr_model_card`

Do not expose every internal route. Keep admin, backtest, and sensitive enterprise routes out of the public MCP surface.
