# African Market OS WebMCP Decision Readiness Lab

Live demo: https://africanmarketos.com/webmcp-challenge/

This is the public-safe source snapshot for the African Market OS WebMCP Challenge submission. It demonstrates how a browser agent and a human can work together on a high-context market decision without exposing private founder reflections, protected scoring logic, payment authority, credentials, or confidential evidence.

## What It Demonstrates

- A visible decision-readiness workspace for a human user.
- Five page-specific browser tools registered through `document.modelContext.registerTool()`.
- A bounded call to the public African Market OS `/v1/first-call` endpoint.
- Conversion of the response into evidence-gap next steps.
- Human-controlled routing to the free diagnostic, evidence builder, Work With Us route, or Starter checkout.

## WebMCP Tools

The live page registers:

- `amos_scope_market_decision`
- `amos_run_public_first_call`
- `amos_extract_evidence_gap_plan`
- `amos_prepare_human_next_step`
- `amos_get_webmcp_demo_script`

The tools are intentionally separate from the existing remote MCP server at `https://africanmarketos.com/mcp/preflight`. WebMCP is used here for browser-human collaboration inside the visible page; the remote MCP server remains the backend integration route for agent hosts.

## Safety Boundary

This demo is public and non-confidential. Do not submit private founder reflections, personal case records, credentials, card details, regulated data, or confidential diligence evidence.

The browser agent may prepare or open a route for an authorized human. It must not purchase, accept terms, submit payment, submit a form, or treat a sandbox preflight as legal, credit, investment, procurement, or regulatory authorization.

## How To Test

Use the live URL in ChatGPT's in-app browser or Chrome with WebMCP enabled.

Suggested prompt:

```text
Open this page and use its WebMCP tools to scope a Uganda supplier-finance market-entry decision, run the public MVR first-call preflight, explain why the result is not a verdict, produce a three-step evidence gap plan, and prepare the correct human next step without submitting a form or making a purchase.
```

Expected result:

1. The agent discovers five browser tools.
2. It populates the visible decision fields.
3. It calls only `/v1/first-call`.
4. It returns evidence gaps and boundaries.
5. It prepares or opens only a human-controlled route.

## Implementation Notes

The production route is served by the African Market OS Worker. This folder contains the public-safe static source used for review and explanation. The protected Worker source, private scoring runtime, calibration assets, secrets, tenant configuration, and customer data are not part of this repository.

## License

The code in `webmcp-challenge/**` is licensed under the Apache License 2.0, as stated in this repository's top-level `LICENSE` rights map and the local `LICENSE` file in this folder.
