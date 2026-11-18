# R15 qualification sets

AMOS wrote these sets on 18 November 2026 from the independent evaluator's R15 letter and its public-safe R14 attachments. Each `.json` file was frozen with its SHA-256 before any R15 engine change. They are AMOS-authored cases, not the evaluator's private cohort.

| Set | Contents |
|---|---|
| `r15-direct-holdout`, `r15-direct-closing` | The legacy request shape: one umbrella claim, linked records and no `required_dependencies`. Variants are complete, irrelevant addition, missing link, descriptor trap, conditional, revoked and prohibited. Atomic twins carry the same evidence as separate claims. |
| `r15-explicit-holdout`, `r15-explicit-closing` | Named dependencies with paired positive, missing, contradictory, stale, wrong-place and later-completion cases, plus explicit empty lists. |
| `r15-audit-holdout`, `r15-audit-closing` | Paraphrases of the eight audit classes with clean siblings, scored on the finding and on the route's controlling output. |

```bash
MVR_API_KEY=... node conformance/effect-decision/r15/run-live.mjs r15-direct-holdout --out r15-direct-holdout-live.json
```

```bash
MVR_API_KEY=... node conformance/effect-decision/r15/handoff-matrix.mjs --out handoff-matrix.json
```

```bash
node conformance/effect-decision/r15/throttle-recovery.mjs --out throttle-recovery.json
```

`run-live.mjs` makes no retries. Audit rows keep HTTP refusals, unresolved results and route-level clearances separate. `handoff-matrix.mjs` follows each emitted continuation as written from each entry point, in both profiles. `throttle-recovery.mjs` stops at the first real 429 and follows its recovery metadata once. It cannot produce a server failure, so a transient 5xx stays unobserved unless one occurs.

The receiver scenarios are in `conformance/receiver-kit/isolation.mjs`, and `observer-verify.mjs` checks their packet offline.

## Fixture correction

The clean controls `h5-clean` and `k5-clean` use `verification_status: "registry_verified"`, which is not an accepted value. The API refuses them with HTTP 422, and that refusal is correct. Their frozen files are unchanged and those rows stay counted as misses. `r15-audit-addendum` holds corrected copies that use `verified`. It was frozen after the first holdout run and before the build that first scored it.
