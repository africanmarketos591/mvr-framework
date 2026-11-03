# R9-shaped held-out exact-effect cohort

`build.mjs` writes two frozen cohorts in the shape of the R9 qualification:

- `cohort.json` (set A): 8 scenarios (eight countries and sectors) x 6 variants (complete, missing link, conditional, revoked, prohibited, irrelevant addition) x 5 effects (three external effects, an internal recommendation, internal planning), plus 8 internal non-market controls: 56 cases, 240 market effect rows.
- `cohort-b.json` (set B): the same scenarios with new missing-link and qualifier wording: 16 cases, 80 rows. Set B was written after set A was scored and was frozen before any engine change for it.

Missing links and qualifiers are stated in prose ("lodged its application ... has not been issued", "awaiting countersignature", "provisional for the first twelve months", "valid only within the central business district"), as an outside evaluator writes them. Expected states follow precedence `mvr.effect-precedence/2`: a missing link is `insufficient` (R3), a qualifier `conditional` (R4) even beside unqualified support, revocation `adverse` and `revoked`, internal planning `favorable` and `planning_only` in every variant (R0_INTERNAL_PLANNING).

`score.mjs` measures market-row agreement, false favorable, missing-link and qualifier precedence, external authorizations, irrelevant-addition identity and internal controls.

## Measured, in order

| Run | Set A (240 rows) | Set B (80 rows) |
|---|---|---|
| First pass of the R9 engine changes | 229 exact, 8 false favorable | not yet written |
| After fixing four wording gaps found in set A | 240 exact, 0 false favorable | **first pass: 64 exact, 16 false favorable** |
| After the positive-establishment rule and four phrasings | 240, 0 | 80, 0 |

Set B's first pass showed that wording rules alone do not generalise. The fix that closed it is structural: support for a claim that an instrument or relationship exists must state it established (a completion, a current state, a validity date, a numbered instrument, or a structured status); unfamiliar or silent wording is a missing link, never support (`mvr.support-state/1`, `establishment_not_stated`). Unseen wording can still produce false holds or misread qualifiers; it should not produce false favorables for instrument claims.

All case data are proprietary lab fixtures; none is an observation of a real organisation.
