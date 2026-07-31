# Response Profiles

MVR exposes two core response postures.

## full_advisory

Use for:

- planning
- exploration
- evidence recruitment
- analyst orientation
- identifying missing proof

It may provide directional guidance while preserving caveats and confidence ceilings.

## strict_calibrated

Use for:

- high-stakes internal systems
- agent workflows that must not overclaim
- gated execution paths

It may return abstentions such as:

- insufficient evidence
- insufficient calibration
- missing required lanes
- excessive proxy dependence

Agent rule:

If MVR abstains, do not override it with generic LLM reasoning. Explain why it abstained and list the minimum evidence needed next.

## Licensed Runtime

A licensed tenant key can select either response profile on authenticated REST
requests and on the five-tool Streamable HTTP MCP runtime at:

```text
https://africanmarketos.com/mcp/runtime
```

Select the profile with `X-Response-Profile`. One key does not mean unrestricted
access: tenant route rights, quotas, output modes, revocation, and calibration
gates still apply independently of profile selection.

## Sandbox Boundary

The public sandbox key `mvr-demo-key-2026` is locked to `full_advisory`. If a request asks for `strict_calibrated`, the API rejects it with `403` and explains that a licensed tenant key is required. The keyless MCP preflight is also a non-verdict evaluation surface. These public paths are for learning the contract and testing agent chains, not for compliance-grade calibration.
