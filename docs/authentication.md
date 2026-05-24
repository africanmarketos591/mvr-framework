# Authentication

MVR API accepts:

```text
X-API-Key: your_api_key
```

or:

```text
Authorization: Bearer your_api_key
```

API keys are issued by request at `info@africanmarketos.com`.

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

Do not embed API keys in client-side browser code.

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
