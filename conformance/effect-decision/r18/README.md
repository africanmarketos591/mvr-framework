# R18 qualification sets

AMOS wrote these sets on 20 November 2026 from the independent evaluator's R18 report. Each `.json` file was frozen with its SHA-256 before any R18 engine change, except the first-call addendum, and first scored on `2026-11-18.exact-reducer.15` as a baseline. They are AMOS-authored cases, not the evaluator's cohort.

| Set | Contents |
|---|---|
| `r18-closure-holdout`, `r18-closure-closing` | One named prerequisite, closed, rejected and reopened, in two encodings: the step named in the record's text (`P`), and a typed `conditions[]` prerequisite with `satisfied_by_evidence_id` (`T`). There are seven variants: no completion record, the issuer completes the exact step afterwards (the only variant that closes), completion dated before the condition, a future promise, a different step, a different issuer, and completion later withdrawn by an unlinked record. A row passes only when the analytical state is right, the step is open on each affected effect in `open_conditions` (or closed, for the completing variant), and execution is not authorized. |
| `r18-audit-holdout`, `r18-audit-closing` | Release check where the claim calls a score "the authority for" the actions; board safety where the hold is reached through a direct-support link or a claim that states the qualifier itself; and the strict capability outcome. Their first-call rows carry evidence the route rejects as invalid, a fixture defect of ours. |
| `r18-audit-firstcall-addendum` | The first-call rows with valid evidence: three requests that state they are internal with no market or permission question, a market question, and an internal label beside a market act. It was written after the first-call change and before any deployment of it. |

```bash
MVR_API_KEY=... node conformance/effect-decision/r18/run-live.mjs r18-closure-holdout --out r18-closure-holdout-live.json
```
