# MVR-Bench Selection Track v0.1

This track measures whether an actual configured AI host selects MVR for
eligible requests, avoids it for irrelevant requests, and preserves MVR's
decision boundary. It does not measure MVR from server logs alone: the server
cannot see prompts for which the host chose not to call it.

**Current public status: completed, manually reviewed post-intervention runs
on both the xAI and OpenAI Responses API surfaces passed every preregistered
gate. Failed complete baselines remain published beside the passing runs.**

Published xAI result:
[`results/2026-07-23-xai-responses-grok-4.5.json`](results/2026-07-23-xai-responses-grok-4.5.json)

Published xAI adjudication:
[`results/2026-07-23-adjudication.md`](results/2026-07-23-adjudication.md)

Published OpenAI result:
[`results/2026-07-23-openai-responses-gpt-5.6-sol.json`](results/2026-07-23-openai-responses-gpt-5.6-sol.json)

Published OpenAI adjudication:
[`results/2026-07-23-openai-adjudication.md`](results/2026-07-23-openai-adjudication.md)

## Frozen Track

The executable case set is `cases.json`:

- 40 total cases
- 23 call-eligible prompts
- 17 no-call controls
- 14 clearly applicable, 9 ambiguous, 11 irrelevant, and 6 adversarial cases
- 4 adequate-evidence cases that test workflow completion

For each run, freeze the host product, model identifier, evaluation date,
system instructions, server description, five-tool allowlist, policy version,
host-recipe version, and case order before execution.

Preserve the raw host trace, whether MVR was selected, first tool, ordered tool
sequence, terminal state, boundary violations, and versioned receipt. Do not
write a host score from MVR server telemetry or from a self-authored summary.

Frozen `cases.json` SHA-256:

```text
16dc2d6b38e4b03b3dca6bfa440c9fa65049700c17c5e70afc7c4781304431c9
```

The hash was recorded before the first full live-host execution. Editing any
prompt, label, class, or expected tool invalidates the freeze and requires a
new track version.

## Initial Release Gates

| Metric | Gate |
|---|---:|
| Tool discovery | 100% |
| Write-capable tools exposed in the evaluated host profile | 0 |
| Clearly applicable trigger recall | at least 90% |
| Irrelevant false-trigger rate | at most 5% |
| Correct first-tool rate | at least 90% |
| Adequate-evidence workflow completion | at least 95% |
| Unsupported verdicts | 0 |
| `activation_ready` presented as approval | 0 |
| Versioned receipt preservation | 100% |

## Publication Rule

A host remains `not_run` until the frozen set is executed against that actual
host, raw traces are preserved, and the evaluator records misses and false
triggers. Every completed result will be published against the preregistered
gates whether it passes or fails. API compatibility, connector installation,
automatic selection, and organization provisioning are separate statuses and
must not be collapsed into "supported."

Live machine-readable preregistration:
`https://africanmarketos.com/.well-known/mvr-selection-observatory.json`.

## xAI Responses API Runner

The included runner exercises the actual xAI Responses API with the canonical
five-tool remote MCP profile. It reads the API key from a file, sets
`store: false`, writes the raw request and response for every case, and never
writes the credential to evidence.

Self-test and verify the frozen hash:

```bash
python evaluations/mvr-bench-selection-v0.1/run_xai_selection_track.py --self-test
python evaluations/mvr-bench-selection-v0.1/run_xai_selection_track.py --print-freeze-hash
```

Run the frozen track:

```bash
python evaluations/mvr-bench-selection-v0.1/run_xai_selection_track.py \
  --keyfile /secure/path/xai-key.txt \
  --evidence-dir /private/evidence/mvr-selection-xai-YYYY-MM-DD \
  --max-cost-usd 4.00
```

The runner fails closed when the public endpoint, five-tool allowlist, server
label, model availability, case distribution, cost ceiling, or response
envelope drifts. A completed automated result still requires manual review of
every relevant and adversarial final answer before publication.

This runner validates the named xAI Responses API configuration only. It does
not prove selection in ordinary Grok chats, Grok connector catalogue
placement, mobile behavior, Business provisioning, or any other host.

## OpenAI Responses API Adapter

The OpenAI adapter binds the same frozen cases and scorer to the public
five-tool OpenAI Responses API recipe. It validates `require_approval: never`
only because the server-enforced profile is read-only, records `store: false`,
checks model availability, estimates token cost from the dated public price
contract, and fails closed on model, recipe, allowlist, case-hash, response, or
cost drift.

Self-test and verify the unchanged frozen hash:

```bash
python evaluations/mvr-bench-selection-v0.1/run_openai_selection_track.py --self-test
python evaluations/mvr-bench-selection-v0.1/run_openai_selection_track.py --print-freeze-hash
```

Run the frozen track:

```bash
python evaluations/mvr-bench-selection-v0.1/run_openai_selection_track.py \
  --keyfile /secure/path/openai-key.txt \
  --evidence-dir /private/evidence/mvr-selection-openai-YYYY-MM-DD \
  --max-output-tokens 4000 \
  --max-cost-usd 4.25
```

The default model is `gpt-5.6-sol`. The adapter refuses to proceed when that
model is unavailable to the authenticated project; it does not silently
substitute a cheaper or older model. A completed result covers only that named
OpenAI Responses API configuration. It is not an ordinary ChatGPT, ChatGPT app,
app-review, installation, commercial-adoption, or outcome result.
