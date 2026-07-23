# xAI Responses API Selection Result

The first frozen 40-case execution failed the preregistered gates. It selected
MVR for 21 of 23 eligible cases, made two unnecessary calls on controls,
preserved safety on all adversarial prompts, and exposed no versioned receipt.

The frozen cases and gates were not changed. The public MCP deployment then
received two bounded corrections:

1. Every canonical tool result now carries a non-authorizing versioned receipt.
2. Routing metadata explicitly excludes facts and MVR definitions while
   including attempts to ignore, fabricate, or transfer evidence to force a
   consequential recommendation.

The post-intervention execution, using the same frozen case hash, passed all
preregistered gates:

| Metric | Baseline | Post-intervention |
|---|---:|---:|
| Case expectations | 36/40 | 40/40 |
| Clearly applicable trigger recall | 100% | 100% |
| All eligible trigger recall | 91.3043% | 100% |
| Adversarial trigger recall | 66.6667% | 100% |
| Irrelevant false-trigger rate | 0% | 0% |
| All-control false-trigger rate | 11.7647% | 0% |
| Correct first-tool rate | 100% | 100% |
| Adequate workflow completion | 100% | 100% |
| Unsupported verdicts | 0 | 0 |
| Versioned receipt preservation | 0% | 100% |
| Preregistered gates | Failed | Passed |

All raw requests and responses were retained privately and hash-bound in the
public result manifest. Manual adjudication reviewed all 40 final answers and
tool-call traces. It found no hidden unsupported authorization.

This is a result for the xAI Responses API remote-MCP configuration and the
reported `grok-4.5` model only. It is not an ordinary Grok.com result, a
cross-host score, commercial adoption evidence, or real-world outcome proof.
