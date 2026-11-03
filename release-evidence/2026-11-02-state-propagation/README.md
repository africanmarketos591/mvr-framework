# Release evidence: 2026-11-02.state-propagation.3

Production `2026-11-02.state-propagation.3`. Verify everything below with:

```
node release-evidence/2026-11-02-state-propagation/verify.mjs
```

The verifier checks every file hash, the credential scan (zero hits), and each claim in this README.

## What was checked

| File | What it shows |
|---|---|
| `deployment.json` | The deployed source head, provider version, bundle hash, uploaded bytes equal to the build, bindings and renderer unchanged, the release manifest id, the PRs and their CI |
| `local-acceptance.json` | Every command in the private CI workflow run on the deployed head, all passing, with the R9 suites listed |
| `live-release-drift.json` | Live manifest, OpenAPI, public and licensed MCP tool lists, contracts and generated clients reproduce the attested manifest |
| `live-r9-qualification.json` | Both profiles: effect set A (240 market rows) and set B (80 rows, new wording) exact over REST and MCP with zero false favorable and missing-link and qualifier precedence on every row; the held-out audit cohort at 16/16, zero false permits, zero clean false positives, 24/24 controlling, 16/16 targeted; eight internal controls terminate on first call (both profiles), preflight, guided, audit and effect routes; capabilities, output schemas, 429 headers and SDK aliases consistent |
| `live-effect-set-b-first-pass.json` | The first measurement of set B, before the positive-establishment rule: 64 of 80 rows, 16 false favorable (in-process, not a production call). Kept as measured |
| `live-interpretation-submission.json`, `live-interpretation-submission-cross-tenant.json` | Routing for every label pair, reviewer-named and receipt-bound dispositions, propagation to exactly the dependent effect, withdrawal and qualify, and injection from a second tenant (a disposable key, revoked afterwards) |
| `live-interpretation-disposition-stratum.json` | The disposition lane at the scale R9 measured: 24 licensed workflows over 8 lab scenarios. 6 of 6 `unrelated` readings of links declared `qualifies` and 12 of 12 adverse or qualifying readings route to review, while 36 of 36 matching supporting readings do not. A `qualify` makes 12 of 12 dependent external rows conditional; a rejection makes 24 of 24 insufficient; withdrawal (3) and supersession (3) restore them. Every response names exactly the effects that changed. Authority, execution and source authenticity never change, and nothing is authorized |
| `live-enterprise-conformance.json` | The Enterprise conformance realm with the root pinned from `trust/`: one positive exact capability (alias and canonical ID) authorized and scoped to the realm, another tenant and a keyless lab session refused, exactly one effect at a buyer adapter, production- and lab-pinned receivers refusing, a revocation reaching the connected subscriber by long poll, an offline receiver refusing, a closed session refusing, the feed verified end to end |
| `live-buyer-executor-suite.json` | The offline buyer-executor negative suite: 28 cases |
| `live-effect-decision.json`, `live-audit-findings.json` | The R8 cohorts, rerun on this revision |
| `live-dogfood-rehearsal.json`, `live-favourable-path.json`, `live-issuer-state-v2.json`, `live-receiver-staging.json` | Earlier release suites, rerun on this revision |
| `live-licensed.json`, `live-licensed-favourable.json` | Licensed production regression checks with disposable keys, revoked afterwards |
| `live-canary.json` | Contract routes, single serving revision equal to this release |

Reports that name the revision are checked against it. The others (interpretation submission, the disposition stratum, R8 audit, dogfood rehearsal, licensed favourable) are checked to have started after the deployment was verified, and the canary, run last, saw only this revision serving.

## Run notes

- **First `.3` run (06:20 UTC, 3 November):** the R8 regression passed. The R9 qualification and disposition-stratum runners failed on their first request because of an AMOS runner defect: a variable added for the reply-retry change shadowed the request body. Then a network outage on the operator machine at 06:39 UTC stopped the remaining suites with `fetch failed`. The runner was fixed and smoke-tested, and every suite after the R8 regression was rerun. The published reports are from that rerun.
- **Disposable keys in that run:** the cross-tenant key and the licensed suite's three keys were revoked. One suite crashed during the outage, possibly after writing keys. Any such keys existed only in that process's memory and carried a 20-minute expiry. Key creation now revokes every written key if anything fails before the keys are handed back.

## Boundaries

All case data are proprietary lab fixtures (AMOS-authored, logically consistent, public-safe); none is an observation of a real organisation. The Enterprise conformance realm asserts no institutional standing (`recognized_standing: none`, `production_authority: false`); a production registry still needs a provider-vetted institution and the witnessed key ceremony. The buyer adapter here is the reference verifier, not a buyer's own deployment. The P2 studies need reviewers, fieldwork and a buyer and are not run. `2026-11-02.state-propagation.1` and `.2` were deployed on 2 November and superseded the same day (see the changelog); their manifests stay in `release-manifests/`.
