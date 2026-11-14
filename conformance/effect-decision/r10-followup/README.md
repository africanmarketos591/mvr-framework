# Fresh wording evaluation

Sets A and B were committed with labels in f9f82f8 before scoring. B was first scored after the A corrections. Set C was committed in ecc1da4 after B remediation and before C was scored. Each set contains eight favorable, eight insufficient and eight conditional records. All are synthetic English examples authored for this qualification. The first-pass files keep the original results. Retest files use the corrected release candidate.

| Set | First exposure | False favorable | Authorized effects | Regression |
| --- | ---: | ---: | ---: | ---: |
| A | 18/24 | 3 | 0 | 24/24 |
| B | 21/24 | 3 | 0 | 24/24 |
| C | 22/24 | 1 | 0 | 24/24 |

For a live rerun set MVR_API_KEY and run node conformance/effect-decision/r10-followup/score.mjs C result.json. For a local test add the worker checkout path. Each report records the normalized fixture SHA-256 and every expected and observed label. An external evaluator can use the same format with new passages. These sequential development samples do not establish a population accuracy guarantee.
