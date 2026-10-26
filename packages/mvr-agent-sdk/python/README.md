# MVR Agent SDK for Python

> **Compatibility package:** New integrations should install `mvr-api-client`. Version 0.2.0 is a maintenance release for existing users. It adds a request timeout, a deployment pin and an explicit User-Agent. Version 0.1.0 stays published for provenance.

Public-safe wrapper for calling the MVR API before an AI agent recommends market entry, MVP launch, funding, partnership, scale, CFO action, or due diligence in African and other high-context markets.

The SDK does not contain MVR scoring logic, calibration weights, private labels, private evidence, Worker source, or benchmark answer keys. It routes requests to the live MVR API, where protected computation remains server-side.

## Install

```bash
pip install mvr-agent-sdk
```

## Quickstart

```python
from mvr_agent_sdk import MvrPreflightClient

mvr = MvrPreflightClient(api_key="mvr-demo-key-2026")

result = mvr.preflight_market_entry({
    "company_name": "Example Retail Venture",
    "country": "KE",
    "sector": "retail",
    "case_type": "market_entry",
    "stakeholder_scope": ["consumer", "retailer", "guardian"],
    "evidence_pack": [],
})

print(result)
```

## Options (0.2.0)

```python
import os

mvr = MvrPreflightClient(
    api_key=os.environ["MVR_API_KEY"],
    timeout=30.0,                                   # default 30 s; every request has a deadline
    expected_revision="2026-10-26.favourable-path.2",  # optional; the server answers 409 DEPLOYMENT_REVISION_MISMATCH on any other revision
    user_agent="my-agent/1.0",                      # optional
)
```

- A User-Agent is always sent. urllib's default is refused at the edge (Cloudflare error 1010), so 0.1.0 could fail there.
- `mvr.last_deployment_revision` holds the revision that served the last response.
- Errors carry `status`, `code`, `response` and `deployment_revision`.

## Boundary

The public sandbox is for non-commercial evaluation only. Production, customer-facing, investor, accelerator, NGO, DFI, enterprise, consulting, or repeated automated use requires a licensed MVR API key from African Market OS.

No reverse engineering, scraping for model replication, or AI training on API outputs is authorized.

Docs: https://africanmarketos.com/agent-sdk

Contact: info@africanmarketos.com
