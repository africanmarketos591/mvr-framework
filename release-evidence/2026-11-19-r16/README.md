# R16 live evidence, 19 November 2026

Build: `2026-11-18.exact-reducer.13`, manifest `MVRRM-6cdcce04115ef3d6b0d6761702eed431`, Cloudflare version `491daeb5-9af6-4f89-87e5-e344bcb8b51e`, source `bf3a04bebc09e9402408a5744a5028389bbaffda`. The provider's bytes matched the prepared bundle; bindings, runtime and renderer were unchanged. The first R16 build, `2026-11-18.exact-reducer.12` (Cloudflare version `613856fa-f3d0-4974-aade-7e57c0d339b1`), served production from 10:36 to 11:21 UTC and is recorded here as well.

The explanation and limits are in [`docs/r16-response-2026-11-19.md`](../../docs/r16-response-2026-11-19.md). These are AMOS-authored cases, not the independent evaluator's cohort. No request was retried.

| File | Contents |
|---|---|
| `first-exposure.json` | Baselines, first scores and later scores for each frozen set, with each set's exposure status |
| `exact-reducer-12-*.json` | First exposure on `.12`: the fresh R16b holdouts, the R16 audit holdout, the evaluator's exposed R16 wording and the handoff matrix |
| `r16c-*-live.json`, `r16-audit-closing-live.json` | First exposure on `.13` of the R16c closing sets and the R16 audit closing set |
| `r16-audit-holdout-live.json`, `handoff-matrix-r16-live.json` | The same checks on `.13` |
| `r16b-*-live.json`, `r16-direct-*-live.json`, `r16-explicit-*-live.json` | Development sets on `.13`. They were exposed before deployment and carry no first-exposure claim. |
| `evaluator-exact-r16-live.json` | The evaluator's three cohort rows, six miss exemplars and nine audit phrasings, rebuilt from its public-safe excerpts. These are exposed regression cases. |
| `handoff-matrix-r16-live.json` | Each REST and MCP entry point, followed exactly as emitted, including REST to REST through `rest_next_call` and the MCP-origin REST example |
| `r15-*-live.json`, `r14-*-live.json`, `blind-*-live.json`, `r12-*-live.json`, `route-live.json`, `live-*.json`, `first-call-parity-live.json`, `handoff-matrix-r15-live.json`, `evaluator-exact-r14-live.json` | Earlier suites on `.13`, under the published label corrections |
| `throttle-recovery-live.json` | One real 429 and its recovery |
| `receiver-isolation-*.json` | Isolated receiver scenarios, including the deferred key succession, the observer packet and its offline verification with evidence groups |
| `ordered-report.json`, `transport-summary.json` | Reconnect session summary and three no-retry transport runs |
| `deployment-verification*.json` | Provider verification of each deployment |

Receiver results come from AMOS-operated stores. They do not establish buyer operation or production authority.
