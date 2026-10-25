# Live canary

A read-only check that production still matches what this repository publishes. The [`live-canary`](../../.github/workflows/live-canary.yml) workflow runs it every six hours and runs the [adversarial suite](../authority/README.md#adversarial-suite) weekly. A failed run fails the workflow, which notifies the repository's maintainers.

```sh
node conformance/canary/canary.mjs
```

It needs Node.js 24 or later, no packages and no credentials. It creates nothing, signs nothing and opens no session.

| Check | Fails when |
|---|---|
| Contract routes | a public contract route is not 200 JSON with `no-store`, or takes over 15 seconds |
| Revision | routes serve different revisions, or production does not serve the newest `release-evidence/*/deployment.json`. Pass `--expect-revision` to pin one |
| Client contract | the live OpenAPI no longer hashes to the contract the generated [`governance-client`](../../sdks/javascript/governance-client.mjs) was built from |
| Issuer-state bindings | the live action catalogue or engine version differs from [`issuer-state-v2/vectors.json`](../issuer-state-v2/vectors.json) |
| Receipt verifier | a tampered receipt, or a lab-key receipt without a session, verifies |
| Refusals | a protected route answers without a key, or a malformed request is not refused with 422 |
| Key ceremony | the status claims authorization, a key is bound without a ceremony record, or the registry holds anything but Ed25519 public keys |
| Private material | a public route or page contains a PEM private key, a PKCS#8 Ed25519 key or a private JWK component |
| Ceremony page headers | the page loses its restrictive Content-Security-Policy, `no-store` or framing denial |

**Limits.**
- A passing canary shows that what it probed matched at that moment. It does not test every route or prove anything about the time between runs.
- It runs from GitHub's network, so it sees what any outside client sees.
