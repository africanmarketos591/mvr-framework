# Authentication

MVR API accepts:

```text
X-API-Key: your_api_key
```

or:

```text
Authorization: Bearer your_api_key
```

Starter keys are delivered automatically after checkout at:

```text
https://africanmarketos.com/checkout/starter
```

Governed, client-facing, institutional, or higher-scope access remains subject to
review at `https://africanmarketos.com/get-api-key`.

## Public Sandbox Key

For non-commercial evaluation and AI-agent tool testing:

```text
X-API-Key: mvr-demo-key-2026
```

Sandbox constraints:

- evaluation only; not for production or commercial use
- `full_advisory` response profile only
- `client_safe` output only
- no `strict_calibrated`, `score_direct`, `backtest`, or enterprise-only routes
- low rate and daily limits
- every sandbox response may include `response_meta.environment: "sandbox"`, `illustrative_only: true`, and `not_for_production: true`

Production keys may be scoped by:

- tenant
- workspace
- plan
- allowed routes
- allowed output modes
- response profile

A licensed key can authenticate both tenant-scoped REST routes and the licensed
Streamable HTTP MCP runtime:

```text
https://africanmarketos.com/mcp/runtime
```

The runtime accepts the same `X-API-Key` or `Authorization: Bearer` headers. It
does not accept credentials in tool arguments, query strings, browser-side
scripts, screenshots, repositories, prompts, or chat messages. African Market
OS does not claim an OAuth flow for this endpoint; use only a provider-issued
key.

## Response Profiles

Clients can request a response profile with:

```text
X-Response-Profile: full_advisory
```

or:

```text
X-Response-Profile: strict_calibrated
```

`strict_calibrated` may abstain where evidence or calibration is insufficient. Treat abstention as a safety result, not a transport failure.

The same licensed key may select either profile per request. Profile selection
does not widen the tenant's licensed routes, quotas, output modes, or other
rights.
