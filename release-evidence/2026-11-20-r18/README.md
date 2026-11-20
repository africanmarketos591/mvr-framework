# R18 live evidence, 20 November 2026

Build: `2026-11-18.exact-reducer.16`, manifest `MVRRM-7e6d6036c2315bc2a1d1c90279bffbf6`, Cloudflare version `d22ee80d-dea9-4d77-9075-f384e035a99f`, source `513e5c2f291b72917f3be8b0f3ca08700b4ac37b`. The provider's bytes matched the prepared bundle; bindings, runtime and renderer were unchanged.

The explanation and limits are in [`docs/r18-response-2026-11-20.md`](../../docs/r18-response-2026-11-20.md). These are AMOS-authored cases, not the independent evaluator's cohort. No scored request was retried.

| File | Contents |
|---|---|
| `first-exposure.json` | For each R18 set, the baseline on `.15` and the first exposure on `.16` |
| `r18-*-live.json` | Every row of the R18 closure-transition sets, audit sets and first-call addendum on `.16` |
| `evaluator-exact-r16-live.json`, `handoff-matrix-r17-live.json` | The evaluator's exposed R16 wording and the REST/MCP handoff matrix on `.16` |
| `r17-*-live.json`, `r16*-live.json`, `r15-*-live.json`, `r14-*-live.json`, `blind-*-live.json`, `r12-*-live.json`, `route-live.json`, `live-*.json`, `first-call-parity-live.json`, `handoff-matrix-r15-live.json`, `handoff-matrix-r16-live.json`, `evaluator-exact-r14-live.json` | Earlier suites on `.16`, under the published label corrections |
| `throttle-recovery-live.json` | One real 429 and its recovery |
| `receiver-isolation-*.json` | Isolated receiver scenarios, the observer packet and its offline verification, with its acceptance level |
| `ordered-report.json`, `transport-summary.json` | Reconnect session summary and three no-retry transport runs |
| `postdeploy-summary.json` | Exit status of every suite, and any rerun with its cause |
| `deployment-verification.json` | Provider verification of this deployment |

Receiver results come from AMOS-operated stores. They do not establish buyer operation or production authority.
