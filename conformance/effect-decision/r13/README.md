# R13 blind wording sets

These three case sets were written on 17 November 2026. The labels come only from the public contract (`/v1/effect-decision/contract`, `mvr.effect-precedence/3`), with no access to the reader's code or to AMOS's earlier case templates. Each file was frozen before it was first scored, and its SHA-256 is in the matching `.sha256` file. Every packet has one dependent external offer and one internal planning effect. A pass needs four things: the exact analytical state (or "not favorable" for the two quantity cases in each set), planning held at `planning_only`, no external execution authority, and an applicability receipt. Each case is scored on REST in both response profiles and on licensed MCP in `strict_calibrated`. Strict requests for a country without strict calibration (Malawi in set B) must be refused on every surface. Those rows are reported separately.

| Set | Role | Cases | R12 (`exact-reducer.5`), first exposure | R13 |
|---|---|---:|---|---|
| `blind-cases.json` (A) | Development set. R13 class fixes were made against it. | 59 | 51/59. 2 false-favorable cases. | 59/59 after one label correction (58/59 on the original labels) |
| `blind-cases-b.json` (B) | Frozen before any R13 change. First scored on the R13 candidate. Two class gaps it exposed were then fixed. | 60 | 55/60. 1 false-favorable case. | 58/60 on first exposure, 0 false favorable. 60/60 after fixes. |
| `blind-cases-c.json` (C) | Frozen before the last two fixes and before deployment. Scored only against the deployed R13 build. | 35 | not run | see `release-evidence/2026-11-17-r13/` |

The classes R13 changed:

- **Future, hypothetical or reported statements of the act** are missing links. Examples: "the 300 bags will be delivered next week", "would be signed once financing is confirmed", "the chair says", "according to the exporter", "reportedly".
- **Guards for those rules:**
  - A document speaking is still a record ("the registrar's certificate states").
  - A name is not future tense ("Will Otieno signed").
  - A recurring term is not the act ("invoices will be issued monthly").
  - A later step after an established act is an open condition ("approved … and will release it once …").
  - A completion governed by a future ("will be delivered on 20 November") is not a completion.
- **Status stated without a copula** is read as stated: "shows the registration as under review", "pending bank confirmation".
- **Validity windows** are currentness, not qualifiers: "in force until 1 September 2027", "for a three-year term". A trial period still qualifies.
- **Withdrawal against the party** is adverse: "deregistered the importer as a taxpayer", "was struck off the register". So is a lapse with the parties named between: "the supply contract between A and B lapsed".
- **Only a stated completion date settles an earlier missing link.** "Issued on 12 October 2026" or "October 12, 2026" counts. A record date alone does not. `label-corrections.json` records the one frozen label this clarification changed.

```
MVR_API_KEY=... node conformance/effect-decision/r13/run-live.mjs blind-cases-c --out r13-c.json
```

The rules read bounded English text and declared fields. They are not general entailment and they do not authenticate sources. No result here confers permission.
