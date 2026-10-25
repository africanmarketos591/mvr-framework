# Release evidence: 2026-10-25.key-ceremony.1

AMOS lab verification of the made-in-Cloudflare receipt key ceremony release. **The ceremony itself has not run.** It needs the operator and two witnesses, so production still has no receipt key. Everything here was produced by AMOS's own tests, a rehearsal on a separate test Worker with throwaway keys, and read-only or refusal-only checks against production. It is not independent review.

Run `node verify.mjs` to check every file hash and every claim below.

| File | What it shows |
|---|---|
| `deployment.json` | Provider version and deployment, bundle bytes matched, bindings and renderer unchanged, rollback version, CI runs |
| `local-acceptance.json` | Every `worker-ci.yml` node command on the released head. Includes the ceremony suites: 16 tests, 26 of 26 mutants, generation inside workerd, and the independent verifier cross-check. Also the Python release checks |
| `rehearsal-live.json` | 18 checks on the separate test Worker against the real Cloudflare API (detail below), then the key thrown away |
| `rehearsal-page-check.json`, `page-check-production.json`, `*.png` | The ceremony page in a headless browser on the test Worker and in production: masked fields, plain-English refusals, same-origin requests only, names never sent, phone width |
| Note on `page-check-production.json` | Cloudflare inserts its Web Analytics script tag into production HTML. The ceremony page's Content Security Policy blocks it before it loads: only africanmarketos.com resources load, so no third-party script can read the page. |
| `live-ceremony-production.json` | Production without a ceremony: no key, the page's security headers, the proof endpoint signs nothing, invalid tokens and malformed requests refused, state unchanged, and the public verifier reports `no_key_yet` |
| `production-api-shape.json` | Read-only: Cloudflare lists production's newest version first, it is the deployed one, and no receipt-key secret exists |
| `live-release-gate.json`, `live-authority-conformance.json`, `live-licensed.json`, `live-permission-path.json`, `live-original-review.json` | Regression of the previous releases' live checks against this release |

**What the rehearsal showed:**
- The key was stored as a non-extractable `secret_key` that signs.
- The ceremony's deployment ran byte-identical code, with the two secrets as the only change.
- The key survived a deploy with production's flags.
- A second key was refused, even with the lock wiped.
- The Worker's real token check refused an invalid token.

## Not established

- **Who attends.** The ceremony, its witnesses and their sworn declarations are still to come.
- **Who can use the key.** Cloudflare stores the key, and anyone who can deploy code could make the Worker sign while that code runs.
- **Rotation to a second key.** That needs ceremony version 2.
