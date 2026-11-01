# Release evidence: 2026-11-01.effect-state.2

Production `2026-11-01.effect-state.2`, release manifest `MVRRM-d108c2d199e484b844f9dcd0914a42d2`. Verify everything below with:

```
node release-evidence/2026-11-01-effect-state/verify.mjs
```

The verifier checks every file hash, the credential scan (zero hits), and each claim in this README.

## What was checked

| File | What it shows |
|---|---|
| `deployment.json` | The deployed source head, provider version, bundle hash, uploaded bytes equal to the build, bindings and renderer unchanged, the release manifest id, the PRs and their CI |
| `local-acceptance.json` | Every command in the private CI workflow run on the deployed head, all passing, with the R8 suites listed |
| `live-release-drift.json` | Live manifest, OpenAPI, public and licensed MCP tool lists, contracts and generated clients reproduce the attested manifest |
| `live-effect-decision.json` | Every frozen exact-effect case in both licensed profiles over REST and MCP; internal controls; mixed split |
| `live-audit-findings.json` | 24 cells per audit route family and profile, scored against the R8 bar; strict calibration refusal and capability listing |
| `live-interpretation-submission.json`, `live-interpretation-submission-cross-tenant.json` | The submission lane, with a disposable second-tenant key for cross-tenant injection (revoked afterwards) |
| `live-dogfood-rehearsal.json` | The internal dogfood matrix in the lab realm, with the root pinned from this repository |
| `live-favourable-path.json`, `live-issuer-state-v2.json`, `live-receiver-staging.json` | Earlier release suites, rerun on this revision |
| `live-licensed.json`, `live-licensed-favourable.json`, `live-licensed-favourable-cleanup.json` | Licensed production regression checks with disposable keys. The favourable run passed every check, but its cleanup could not write the revocations (the operator login expired mid-run); they were written separately and re-read |
| `live-canary.json` | Contract routes, single serving revision equal to this release |

Reports that name the revision are checked against it. The others (audit findings, interpretation submission, dogfood rehearsal, licensed favourable) are checked to have started after the deployment was verified, and the canary, run last, saw only this revision serving.

## Boundaries

All case data are proprietary lab fixtures (AMOS-authored, logically consistent, public-safe); none is an observation of a real organisation. Lab results carry `production_authority: false`. The P1.4 team run and the P2 studies are not run; see `conformance/internal-dogfood/README.md` and `conformance/r8-evaluation/PROTOCOL.md`. `2026-11-01.effect-state.1` was deployed and superseded the same day; its manifest stays in `release-manifests/`.
