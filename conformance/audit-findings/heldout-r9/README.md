# R9 held-out audit cohort

`build.mjs` writes `heldout-r9.json`: 16 planted defects and 8 controls (7 clean, 1 internal-only request) across ten audit routes, each case in the request shape its route accepts: free-text privacy reviews, evidence-suitability `available_data`, board and release packs, red-team agent outputs, single-record evidence reviews with inline claims, and record-only validation. Every record is valid for its route's own validator; wording and field spellings differ from the R8 cohort.

The R9 bar, in both profiles: at least 15 of 16 defects detected, zero route-level false permits (a defect case answered `no_defects_found` or `not_applicable`), zero clean false positives, at least 23 of 24 controlling states, at least 15 of 16 targeted remediations, and the internal-only request `not_applicable`.

| Run | Result |
|---|---|
| First pass of the rebuilt audit module | 14 of 16 detected in both profiles (an evidence-suitability press release and a board pack recommendation missed) |
| After two fixes (source-class word boundaries; a wider approval-pending window) | 16/16, 0 false permits, 0 of 7 clean false positives, 24/24 controlling, 16/16 targeted, internal not_applicable |

`score.mjs` scores either route responses or in-process findings. The private CI runs the cohort through the worker over HTTP in both profiles (`scripts/test-audit-heldout-r9-http.mjs`); `conformance/r9-qualification/run-live.mjs` runs it against production.

Proprietary lab fixtures only.
