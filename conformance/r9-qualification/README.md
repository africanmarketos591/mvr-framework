# R9 qualification, live

```
MVR_API_KEY=<Enterprise key> node conformance/r9-qualification/run-live.mjs --output r9-live.json
```

One run against production, both profiles:

| Area | What is checked |
|---|---|
| Effect sufficiency | `effect-decision/r9-heldout` set A (56 cases) and set B (16 cases, new wording) over REST and MCP: zero false favorable, every market row exact, missing-link and qualifier precedence on every row, no external authorization, irrelevant additions identical, internal controls `not_relevant`; REST and MCP identical; every response names the release manifest |
| Audit | `audit-findings/heldout-r9` (24 cases, ten routes) against the R9 bar |
| Relevance | eight internal non-market controls terminate before market evidence work on licensed first call (both profiles), public preflight, guided preflight, claim audit and the effect route |
| Contracts | `/v1/capabilities` names exactly the tools `tools/list` returns; the exact-effect and submission tools publish detailed output schemas; every OpenAPI 429 declares `Retry-After` and `RateLimit-*`; the buyer SDK alias table equals the server action ontology |

Related live runners: `interpretation-submission/run-live.mjs` (routing, reviewer-bound dispositions, propagation, withdrawal), `enterprise-conformance/run-live.mjs` (positive exact capability, feed, buyer adapter). All case data are proprietary lab fixtures.
