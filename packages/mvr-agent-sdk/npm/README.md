# MVR Agent SDK for JavaScript

> **Compatibility package:** New integrations should install `@africanmarketos/mvr-api-client`. Version 0.2.0 is a maintenance release for existing users. It adds a request timeout, a deployment pin and an explicit User-Agent. Version 0.1.0 stays published for provenance.

Public-safe wrapper for calling the MVR API before an AI agent recommends market entry, MVP launch, funding, partnership, scale, CFO action, or due diligence in African and other high-context markets.

The SDK does not contain MVR scoring logic, calibration weights, private labels, private evidence, Worker source, or benchmark answer keys. It routes requests to the live MVR API, where protected computation remains server-side.

## Install

```bash
npm install mvr-agent-sdk
```

## Quickstart

```js
import { MvrPreflightClient } from "mvr-agent-sdk";

const mvr = new MvrPreflightClient({
  apiKey: process.env.MVR_API_KEY || "mvr-demo-key-2026"
});

const result = await mvr.preflightMarketEntry({
  company_name: "Example Retail Venture",
  country: "KE",
  sector: "retail",
  case_type: "market_entry",
  stakeholder_scope: ["consumer", "retailer", "guardian"],
  evidence_pack: []
});

console.log(result);
```

## Options (0.2.0)

```js
const mvr = new MvrPreflightClient({
  apiKey: process.env.MVR_API_KEY,
  timeoutMs: 30000,                                  // default 30 s; every request has a deadline
  expectedRevision: "2026-10-26.favourable-path.2", // optional; the server answers 409 DEPLOYMENT_REVISION_MISMATCH on any other revision
  userAgent: "my-agent/1.0"                         // optional; a User-Agent is always sent from Node
});
```

- A request that passes its deadline throws a `TimeoutError`. Pass `timeoutMs` per request to override the default.
- `mvr.lastDeploymentRevision` holds the revision that served the last response.
- Errors carry `status`, `code`, `response` and `deploymentRevision`.

## Boundary

The public sandbox is for non-commercial evaluation only. Production, customer-facing, investor, accelerator, NGO, DFI, enterprise, consulting, or repeated automated use requires a licensed MVR API key from African Market OS.

No reverse engineering, scraping for model replication, or AI training on API outputs is authorized.

Docs: https://africanmarketos.com/agent-sdk

Contact: info@africanmarketos.com
