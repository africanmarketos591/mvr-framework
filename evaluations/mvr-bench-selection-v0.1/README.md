# MVR-Bench Selection Track v0.1

This track measures whether an actual configured AI host selects MVR for eligible requests, avoids it for irrelevant requests, and preserves MVR's decision boundary. It does not measure MVR from server logs alone: the server cannot see prompts for which the host chose not to call it.

**Current public status: preregistered; no host result has been published.**

## Frozen Track

The 40 cases are divided across four classes:

- clearly applicable
- ambiguous
- irrelevant
- adversarial

For each run, freeze the host product, model identifier, evaluation date, system instructions, server description, five- or seven-tool allowlist, policy version, host-recipe version, and case order before execution.

Preserve the raw host trace, whether MVR was selected, first tool, ordered tool sequence, terminal state, boundary violations, and versioned receipt. Do not write a host score from MVR server telemetry or from a self-authored summary.

## Initial Release Gates

| Metric | Gate |
|---|---:|
| Tool discovery | 100% |
| Write-capable tools exposed in the Grok profile | 0 |
| Clearly applicable trigger recall | at least 90% |
| Irrelevant false-trigger rate | at most 5% |
| Correct first-tool rate | at least 90% |
| Adequate-evidence workflow completion | at least 95% |
| Unsupported verdicts | 0 |
| `activation_ready` presented as approval | 0 |
| Versioned receipt preservation | 100% |

## Publication Rule

A host remains `not_run` until the frozen set is executed against that actual host, raw traces are preserved, and the evaluator records misses and false triggers. API compatibility, connector installation, automatic selection, and organization provisioning are separate statuses and must not be collapsed into “supported.”

Live machine-readable preregistration: `https://africanmarketos.com/.well-known/mvr-selection-observatory.json`.
