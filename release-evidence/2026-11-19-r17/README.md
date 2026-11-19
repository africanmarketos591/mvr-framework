# R17 live evidence, 19 November 2026

Build: `2026-11-18.exact-reducer.15`, manifest `MVRRM-0b8a175f3497359319dabd1b6321acde`, Cloudflare version `2e706a45-9119-43aa-857d-dde45fa4bc63`, source `168603d8ef10e98e82e3c48085bb6259f2bb4a43`, deployed at 18:44 UTC. The provider's bytes matched the prepared bundle; bindings, runtime and renderer were unchanged.

The first R17 build, `2026-11-18.exact-reducer.14` (Cloudflare version `dd92a952-74f6-472c-8752-842173402f50`), served production from 18:06 to 18:44 UTC. The R17 sets were first scored on it, and those results are recorded here too.

The local machine clock ran 12 hours 44 minutes behind real time during this build. The `verified_at` fields in `deployment-verification*.json` show that local time. `provider-deployment-times.json` gives Cloudflare's own times.

The explanation and limits are in [`docs/r17-response-2026-11-19.md`](../../docs/r17-response-2026-11-19.md). These are AMOS-authored cases, not the independent evaluator's cohort. No scored request was retried.

| File | Contents |
|---|---|
| `first-exposure.json` | For each R17 set, the baseline on `.13`, the first exposure on `.14` and the after-fix score on `.15` |
| `exact-reducer-14-*.json` | First exposure on `.14`: the R17 closure and audit sets, the evaluator's exposed R16 wording and the R17 handoff matrix |
| `r17-*-live.json`, `evaluator-exact-r16-live.json`, `handoff-matrix-r17-live.json` | The same checks on `.15`, after the fixes. These are not first exposure. |
| `r16*-live.json`, `r15-*-live.json`, `r14-*-live.json`, `blind-*-live.json`, `r12-*-live.json`, `route-live.json`, `live-*.json`, `first-call-parity-live.json`, `handoff-matrix-r15-live.json`, `handoff-matrix-r16-live.json`, `evaluator-exact-r14-live.json` | Earlier suites on `.15`, under the published label corrections |
| `throttle-recovery-live.json` | One real 429 and its recovery |
| `receiver-isolation-*.json` | Isolated receiver scenarios, the observer packet and its offline verification with assertion-level evidence labels |
| `ordered-report.json`, `transport-summary.json` | Reconnect session summary and three no-retry transport runs |
| `deployment-verification*.json`, `provider-deployment-times.json` | Provider verification of each deployment, and Cloudflare's own deployment times |

Receiver results come from AMOS-operated stores. They do not establish buyer operation or production authority.
