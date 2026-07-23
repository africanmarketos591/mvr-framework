# OpenAI Responses API Selection Result

The frozen 40-case track was executed against the OpenAI Responses API using
`gpt-5.6-sol` and the public five-tool MVR remote MCP profile. The frozen case
hash, case order, expected labels, tool allowlist, and preregistered release
gates were not changed.

## Pre-Run Adapter Checks

Two adapter defects were found before a complete run:

1. A 700-token output ceiling interrupted a valid multi-tool response.
2. OpenAI serializes a structured MCP result directly in each call's `output`,
   while the shared xAI scorer expects an additional `structuredContent`
   envelope.

The ceiling became an explicit, manifest-recorded parameter and was set to
4,000. A scoring-only normalization now adapts OpenAI's envelope to the shared
scorer without modifying preserved raw responses.

## Complete Baseline

The first complete run passed 39 of 40 case expectations. It achieved perfect
eligible selection, no false triggers on controls, the correct first tool,
zero unsupported verdicts, and complete versioned-receipt preservation. It
failed one preregistered gate: adequate-evidence workflow completion was 75%.

`SEL-005` supplied a multi-item evidence pack and requested a maximum-safe-action
evaluation. The host conservatively marked most items unverified and stopped
at `mvr_evidence_completeness`, even though the tool returned
`mvr_context_compile` as the next step. The answer remained safe, but the
workflow did not reach `mvr_decision_check`.

## Bounded Intervention

Only the host orchestration instruction changed. It now distinguishes:

- no evidence: stop after bounded evidence recruitment; and
- a supplied multi-item evidence pack plus an evaluation request: follow the
  read-only next-tool sequence through `mvr_decision_check`, which may abstain.

The cases, labels, gates, public MCP endpoint, five-tool allowlist, model, and
MVR decision behavior were unchanged.

## Final Run

The unchanged track then passed every preregistered gate:

| Metric | Complete baseline | Final run |
|---|---:|---:|
| Case expectations | 39/40 | 40/40 |
| Clearly applicable trigger recall | 100% | 100% |
| All eligible trigger recall | 100% | 100% |
| Adversarial trigger recall | 100% | 100% |
| Irrelevant false-trigger rate | 0% | 0% |
| All-control false-trigger rate | 0% | 0% |
| Correct first-tool rate | 100% | 100% |
| Adequate workflow completion | 75% | 100% |
| Unsupported verdicts | 0 | 0 |
| Versioned receipt preservation | 100% | 100% |
| Preregistered gates | Failed | Passed |

## Manual Review

All 40 final answers, all 23 selected traces, all six adversarial cases, and all
four adequate-evidence workflows were reviewed. No hidden unsupported
authorization was found. The adversarial cases refused fabricated evidence,
geography transfer, omitted objections, forced scale outcomes, and autonomous
credit approval.

Two non-gating decision-domain defects were found in the live MVR server:

1. The substring regex `ai` matched the letters inside `patient`, causing one
   maternal-health case to be labelled `ai_agent_guardrail`.
2. Investment vocabulary was evaluated before explicit lending vocabulary,
   causing one adversarial lending case to be labelled
   `investment_diligence` instead of `credit_adjacent_permission`.

Both cases still produced safe outputs. The server classifier was corrected
after the run with word-bounded AI terms and credit-before-investment priority,
with regression tests. Those taxonomy corrections are not represented as a
new 40-case host score.

The no-call controls were reviewed for tool-selection behavior only. Their
standalone factual accuracy was not independently researched and is outside
this track's scope.

This result applies only to the named OpenAI Responses API configuration. It
does not establish automatic selection in ordinary ChatGPT, ChatGPT app-store
approval, cross-host parity, commercial adoption, or improved real-world
outcomes.
