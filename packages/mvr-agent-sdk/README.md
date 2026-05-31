# MVR Agent SDK

Public-safe SDK scaffolds for AI agents that need to call the MVR API before making African or high-context market-entry, funding, partnership, scale, CFO, or due-diligence recommendations.

The SDK is a wrapper only. It does not contain the MVR scoring engine, calibration weights, private labels, private evidence, worker source, or benchmark answer keys.

## Sequence

1. `POST /v1/auth-check`
2. `POST /v1/entity-resolve`
3. `POST /v1/evidence-completeness`
4. `POST /v1/context/compile` when evidence needs consolidation
5. `POST /v1/decision-check` last

## JavaScript

```bash
cd npm
npm install mvr-agent-sdk
```

```js
import { MvrPreflightClient } from "mvr-agent-sdk";

const mvr = new MvrPreflightClient({
  apiKey: process.env.MVR_API_KEY
});

const result = await mvr.preflightMarketEntry(payload);
```

## Python

```bash
cd python
pip install mvr-agent-sdk
```

```python
from mvr_agent_sdk import MvrPreflightClient

mvr = MvrPreflightClient(api_key=os.environ["MVR_API_KEY"])
result = mvr.preflight_market_entry(payload)
```

## Boundary

Sandbox use is for non-commercial evaluation only. Production, customer-facing, investor, accelerator, NGO, DFI, enterprise, consulting, or repeated automated use requires a licensed MVR API key from African Market OS.

Contact: info@africanmarketos.com

## Publishing Boundary

This repository package is safe to publish because it is a thin client wrapper only. It contains no scoring formula, no calibration weights, no private labels, no private evidence, no Worker source, and no private benchmark answer keys.
