# R15 live evidence, 19 November 2026

Build: `2026-11-18.exact-reducer.11`, manifest `MVRRM-3b6f5c0f62f364aaf6881a943de10e25`, Cloudflare version `76cc344c-e9dc-455a-9059-fdced01fa151`, source `6b923953966afae79ed8d0b91f99319984acff61`. The provider's bytes matched the prepared bundle, and bindings, runtime and renderer were unchanged. The rollback target is `e2ac939a-48cf-44fa-bd3b-9b15dd43e1e9`.

The explanation and limits are in [`docs/r15-response-2026-11-19.md`](../../docs/r15-response-2026-11-19.md). These are AMOS-authored cases, not the independent evaluator's cohort.

| File | Contents |
|---|---|
| `first-exposure.json` | Baselines, first scores and shipped scores for each frozen set, and the regression found on `.10` |
| `r15-*-live.json` | Every row of the R15 sets on the shipped build |
| `evaluator-exact-live.json` | Results for the evaluator's published wording, rebuilt without its private request bodies. Inputs are not repeated here. |
| `handoff-matrix-live.json` | Each first-call entry point, continuation path, profile and effect type, followed as emitted |
| `first-call-parity-live.json` | REST and licensed MCP routing comparison |
| `throttle-recovery-live.json` | One real 429 and its recovery |
| `receiver-isolation-*.json` | Isolated receiver scenarios, the observer packet and its offline verification |
| `ordered-report.json` | Earlier disconnected-lease and reconnect session summary |
| `transport-summary.json` | Three no-retry runs of the 112-cell comparison |
| `r14-*-live.json`, `blind-*-live.json`, `r12-*-live.json`, `route-live.json`, `live-audit.json`, `live-effects.json`, `live-comparable.json` | Earlier suites on this build |
| `caps-fresh.json` | First capabilities calls from fresh clients |
| `deployment-verification.json` | Provider verification of this deployment |

Receiver results come from AMOS-operated stores. They do not establish buyer operation or production authority.
