# R17 qualification sets

AMOS wrote these sets on 19 November 2026 from the independent evaluator's R17 report. Each `.json` file was frozen with its SHA-256 before any R17 engine change, and first scored on `2026-11-18.exact-reducer.13` as a baseline. They are AMOS-authored cases, not the evaluator's cohort.

| Set | Contents |
|---|---|
| `r17-closure-holdout`, `r17-closure-closing` | A current approval whose external steps wait for a step the source names, in six wordings per domain: "remain on hold until", "may proceed only after", "pending", "on condition that", "subject to completion of" and "will proceed once". Each domain also has a granted control (`G`) and a missing-permission control (`M`). A row passes only when the analytical state is right, every affected effect names the step in `open_conditions` with the record that states it, the effect's closure names it too, and execution is not authorized. |
| `r17-audit-holdout`, `r17-audit-closing` | Internal-only scope declared through `decision_result` and `action_boundary` under other field names, on board safety and red team, with the provenance warning kept as a note. Also: an analytical score offered as authority, where release check must ask for a current issuer record for each exact action; an overstated claim over a named approval on board safety; the reviewer-verification field on claim audit; and strict calibration refusal. |

```bash
MVR_API_KEY=... node conformance/effect-decision/r17/run-live.mjs r17-closure-holdout --out r17-closure-holdout-live.json
```

```bash
MVR_API_KEY=... node conformance/effect-decision/r17/handoff-matrix.mjs --out handoff-matrix.json
```

`run-live.mjs` makes no retries and scores both profiles. Closure rows report the analytical state, the named step and execution separately. A verification warning beside a scoped `clear` is not counted as disagreement, but a strict blocker or a failed status is. `handoff-matrix.mjs` follows `rest_next_call`, and a pause's `rest_resume.resume_call`, exactly as emitted, and requires every REST path to reach decision check. The contracts are in [`docs/rest-resume-and-action-requirements.md`](../../../docs/rest-resume-and-action-requirements.md).
