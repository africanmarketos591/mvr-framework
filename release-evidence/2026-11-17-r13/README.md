# R13 live state, 17 November 2026

Production serves **`2026-11-17.exact-reducer.6`** with manifest `MVRRM-fbbacd564c6c8618670b16abe3c3e247`. The Cloudflare version is `8cae40b7-886f-4bdb-b55e-0641505fcd04`, from source `8a74ecc`. The provider's bytes matched the prepared bundle (SHA-256 `b342dbeb…e404`). All 105 bindings, the runtime and the renderer were unchanged. The rollback target is the R12 version `da507f0d-2cb9-4b91-a71c-409773f0833e`. Private CI passed before deployment. See `deployment-verification.json`.

## What R13 changed

The closed-world reader now fails closed on these forms:
- future, hypothetical or reported statements of the claimed act;
- a status stated without a copula ("as under review", "pending bank confirmation").

It also:
- reads validity windows by currentness, not as qualifiers;
- treats party-level withdrawal and a long-subject lapse as adverse;
- settles a missing link only when a support record states a completion date, written or ISO.

The rules and guards are described in `conformance/effect-decision/r13/README.md`.

## Live results (no retries; REST in both profiles plus licensed MCP strict)

| Check | Result |
|---|---|
| Blind set C, 35 cases, frozen before deployment, **first exposure** | **30/35 cases. 0 false favorable. 0 external execution authorized.** |
| Blind set B, 60 cases (R12 first exposure 55/60, 1 false favorable) | 60/60. 14 strict-profile Malawi rows refused by design on every surface. |
| Blind set A, 59 cases (R12 first exposure 51/59, 2 false favorable) | 59/59 on corrected labels (`label-corrections.json`: mp3) |
| R10 480-row cohort and 32 structural encodings, both profiles | all pass |
| R9 held-out comparable, strict | 240/240, missing-link and qualifier precedence 32/32 each, 0 false favorable |
| R12 frozen 192, prose 12, routes 8 | 192/192, 12/12, 8/8 |
| Specialized audit packs heldout-r10 and r10b, both profiles | pass (16/16 detected, 0 critical false permits, 0 clean false positives) |
| First Enterprise capabilities call | 1,628 ms end to end (1,153 ms on the worker). Three further fresh clients took 421–610 ms. |

## The five set C misses

All five were holds. None was favorable and none authorized anything. Each was in the wrong state.

| Case | Expected | R13 | Wording the reader did not yet read |
|---|---|---|---|
| c-f03 | favorable | insufficient | "the capitation grant … was **credited** to the school account" was not read as completing the claim that the school received the grant |
| c-i03 | favorable | insufficient | the same record as c-f03, plus an unrelated context record |
| c-f06 | favorable | conditional | "approved … **after a site visit found no issues**" was read as a condition |
| c-q02 | conditional | insufficient | "approved for cash deposits **only**; withdrawals are **not yet permitted**" was read as missing, not as partial scope |
| c-a03 | adverse | insufficient | "**suspended** the outlet **from agent banking** … pending an audit" was not recognised as adverse |

Across the two sets scored on first exposure after the R13 changes (B on the candidate, C on the deployment), the reader returned **zero false favorable in 95 cases**. Exact agreement on first exposure was 58/60 and 30/35. These are AMOS-authored cases. The independent evaluator's latest score is still 276/480 on R11, and its private cases have not been run on R13.
