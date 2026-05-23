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

