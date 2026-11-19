# R16 qualification sets

AMOS wrote these sets on 19 November 2026 from the independent evaluator's R16 report and its public-safe excerpts. Each `.json` file was frozen with its SHA-256 before the engine changes it measures. They are AMOS-authored cases, not the evaluator's private cohort. The evaluator's three cohort rows and six miss exemplars are exposed regression cases and are scored separately, not counted here.

| Set | Contents |
|---|---|
| `r16-direct-holdout`, `r16-direct-closing` | One umbrella claim over contact, commitment, launch and an internal recommendation. Paired controls: an approval already granted within a ceiling and validity window (`G`), the same with an irrelevant added record (`GI`), a dated grant worded as prospective (`D`), a future sign-off still needing completion (`F`), a hold until a named condition (`H`), a missing permission record (`M`), a launch-only grant beside contact and commitment (`S`), revoked (`R`) and prohibited (`X`). |
| `r16b-direct-holdout` | Fresh holdout for the same nine controls in six new domains, with three rotating wordings per variant (for example "not exceeding", "a maximum of", "capped at", "commencement of the service", "limited to the launch and does not extend to contact"). |
| `r16-explicit-holdout`, `r16-explicit-closing` | Named dependencies where one record grants one action family only, so sibling effects must not inherit it. |
| `r16b-explicit-holdout` | Fresh holdout for the explicit controls in the same six domains, plus a contact-only grant that must not reach commitment or launch. |
| `r16-audit-holdout`, `r16-audit-closing` | A permission claim anchored only inside a nested locator, a current prohibition beside an older supportive letter, advisory-only scope, a protocol held until a named closure, score-as-authority wording and clean siblings. Rows are scored on the finding and on the route's controlling output, and clean rows also check that native clearance fields agree with it. |

```bash
MVR_API_KEY=... node conformance/effect-decision/r16/run-live.mjs r16-direct-holdout --out r16-direct-holdout-live.json
```

```bash
MVR_API_KEY=... node conformance/effect-decision/r16/handoff-matrix.mjs --out handoff-matrix.json
```

`run-live.mjs` makes no retries and scores both response profiles. `handoff-matrix.mjs` follows each emitted continuation exactly as written, including REST to REST through `rest_next_call` and the MCP-origin REST example, and checks that each follow-on keeps the effect digest.

## Development sets and fresh holdouts

The direct and explicit `r16-*` sets were scored in process on 19 November 2026 during regression triage, before deployment. That made them development sets, so they are not reported as first exposure. The causes found on them were fixed:

- "commit no more than" was read as an open qualifier rather than a ceiling of the approval;
- "start kiosk programme", without an article, was not read as launch scope;
- "this permission covers the launch only" was read as an open qualifier for the launch itself;
- "on exactly 4 named routes" in an approval was read as a narrowing, even where the request names no larger figure;
- a record naming an action did not establish that action when its claim was listed as a sibling's dependency.

They now run in CI as regression fixtures. The `r16b-*` holdouts were written and frozen after those fixes, before any engine run on them, and are first scored on the deployed build. The audit sets were not scored before deployment and keep first-exposure status.

## Label correction

`../label-corrections-r16.json` changes one expected label in the earlier R14 and R15 direct sets. Where the only gap is a missing permission or completion record, the internal recommendation is now expected to be `conditional`, not `insufficient`. The frozen files are unchanged; the R14 and R15 runners apply the mapping and mark each corrected row with `label_corrected_from`. The evaluator's R16 exemplar `CASE-0A8BD642BB491B605B8C` scores `insufficient` there as a miss, and its R14 letter scored `favorable` there as a false favourable, which leaves `conditional`.

The same file corrects one audit label. The R15 red-team clean controls `h1-clean` and `k1-clean` expected the route's controlling decision to be `clear`. Their response carries a high native strict-mode blocker, `DECISION_SCOPE_REQUIRED`, because the request declares no decision scope. The R16 review asked that the controlling output never say `clear` beside such a blocker, so the expected decision is now `hold`. No defect finding is raised and `audit_outcome` stays `no_defects_found`. The R15 runner applies this correction and marks the rows.

## R16c closing sets

`r16c-direct-closing` and `r16c-explicit-closing` were frozen after the R16b holdouts were first scored on `2026-11-18.exact-reducer.12`, and before any of their misses were read. They use three more domains and three new wordings per variant, and are first scored on the next deployed build.
