# MVR Agent SDK for JavaScript

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

## Boundary

The public sandbox is for non-commercial evaluation only. Production, customer-facing, investor, accelerator, NGO, DFI, enterprise, consulting, or repeated automated use requires a licensed MVR API key from African Market OS.

No reverse engineering, scraping for model replication, or AI training on API outputs is authorized.

Docs: https://africanmarketos.com/agent-sdk

Contact: info@africanmarketos.com
