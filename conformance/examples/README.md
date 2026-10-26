# Published examples, run as published

Each request example in the OpenAPI contract carries `x-mvr-example`, its run policy. It names:
- the profiles the example claims;
- the plan, and the roles a key may hold to run it (one is enough);
- the earlier examples that create its state, and the response fields to copy from them;
- the headers to generate.

Each operation also carries `x-mvr-access`: its plans, its required roles, its output modes, and whether break-glass is allowed.

```sh
MVR_API_KEY=... node conformance/examples/run-examples.mjs --roles admin,org_admin --plan ENTERPRISE
```

The runner sends every example unchanged, in dependency order, in every profile it claims. If the key cannot run an example, the result is `not_run` with the reason, never a pass.

AMOS CI runs every example through the worker in both profiles.

Two strict-profile examples are on calibrated-threshold routes: `/v1/verdict-delta` and `/v1/trust-velocity`. They are also run against production, where the calibration assets live.
