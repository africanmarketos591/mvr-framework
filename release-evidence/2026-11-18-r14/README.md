# R14 live evidence, 18 November 2026

Build: `2026-11-18.exact-reducer.9`, manifest `MVRRM-68338d26188152a58c113f4e087ccaf0`, Cloudflare version `ba16c6ec-1c6b-4534-b31c-89735b7ade47`, source `e5e1a1dd2d1bfd5c8f60418d73a82e4ad35265c6`. The provider's bytes matched the prepared bundle, and bindings, runtime and renderer were unchanged. The rollback target is `21e560e0-21ab-477a-af08-0ed0c91798d5`.

The explanation and limits are in [`docs/r14-response-2026-11-18.md`](../../docs/r14-response-2026-11-18.md). These are AMOS-authored cases, not the independent evaluator's cohort.

| File | Contents |
|---|---|
| `first-exposure.json` | The first score of each frozen set, with its earlier baseline |
| `r14-direct-*-live.json`, `r14-audit-*-live.json` | Every row of the R14 sets on the shipped build |
| `r14-contract-live.json` | Effect-digest chain, fail-closed handoff, validation parity, signed statement, disposition write |
| `first-call-parity-live.json` | REST and licensed MCP routing comparison |
| `transport-summary.json` | Three no-retry runs of the 112-cell comparison |
| `blind-*-live.json` | R13 blind sets on this build |
| `live-effects.json`, `live-audit.json`, `live-comparable.json` | R10 cohort and structure, audit packs, R9 comparable set |
| `r12-*-live.json`, `route-live.json` | R12 regression sets |
| `ordered-report.json` | Disconnected-lease, reconnect and revocation session summary |
| `caps-fresh.json` | First capabilities calls from fresh clients |
| `deployment-verification.json` | Provider verification of this deployment |

Receiver results come from AMOS-operated stores. They do not establish buyer operation or production authority.
