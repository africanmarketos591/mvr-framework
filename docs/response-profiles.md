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

## Sandbox Boundary

The public sandbox key `mvr-demo-key-2026` is locked to `full_advisory`. If a request asks for `strict_calibrated`, the API rejects it with `403` and explains that a licensed tenant key is required. This is intentional: sandbox calls are for learning the API contract and testing agent chains, not for compliance-grade calibration.
