# Authority conformance

The [positive five-stage MCP fixture](POSITIVE-MCP.md) persists authorized review events and carries protected references unchanged through all five calls. Its strict-profile success permits only listed output uses; it issues no external capability. The [owner-controlled execution contract](../../docs/owner-controlled-execution.md) separately records one verified live owner experiment and the remaining production isolation and institutional proofs. `authority-responses.schema.json` and `authority-response-examples.json` publish action-discriminated responses; examples are illustrative and unsigned.

Minimum Viable Relationships (MVR), originated by Farouk Mark Mukiibi, African Market OS.

This is AMOS lab verification with proprietary lab fixtures. It is not independent review, identity verification, authenticated real-world standing, source verification or production authority. Ordinary production signing remains disabled until the named-person key ceremony.

Run with Node.js 24.11 or later, ordinary DNS and HTTPS, and no API key:

```sh
node conformance/authority/verify-fixtures.mjs
python conformance/authority/validate-fixtures.py
node conformance/authority/run.mjs --output authority-conformance-result.json
```

The Python check requires `jsonschema`. The live runner needs no installed packages. It uses `https://africanmarketos.com` by default; `--base https://your-host.example` selects a compatible deployment explicitly. It does not modify the server, bypass DNS, use an operator key or execute an external effect. An existing output file is never overwritten.

The unchanged runner obtains four short-lived principals, creates a proprietary lab review case, proves possession of institution/standing/source keys, registers reviewer standing and a source record, closes one residual, and registers a zero-value internal draft capability. It verifies the exact effect and independently alters amount, currency, type, resource, external contact and counterparty; each mutation must deny. The very next check must also deny after source, credential or closure revocation, a contradiction, and case withdrawal. The runner reports a harmless local in-process draft counter effect and `not_attempted` for checks that perform no effect. It explicitly demonstrates the unresolved race when revocation occurs after verification and before the local handler. It never contacts an external effect destination.

Every returned receipt is checked offline against the session public key and previous chain head. Allow, deny, revocation and effect receipts are also checked through the public verification route, including tamper rejection. Three revocation events travel through the production Durable Object delivery outbox to an AMOS-owned receiver. Each receiver deliberately rejects the first attempt, accepts the second but returns a failed acknowledgement, and acknowledges the deduplicated third. The runner reconciles the durable event journal with job state and receiver records. These are controlled lab failure conditions, not measurements of general customer delivery reliability.

The runner closes the session in `finally` and checks that its executor token immediately stops working. Keep issued tokens host-private; reports never contain tokens or private keys. An interrupted process cannot execute `finally`; all session tokens, keys and records expire after one hour. Issuance is limited to two sessions per hashed IP per fixed UTC hour and twenty globally; each session allows 160 authenticated calls and at most twenty queued revocation events. A busy service returns a quota failure; do not bypass it.

## Adversarial suite

```sh
node conformance/authority/run-adversarial.mjs --output authority-adversarial-result.json
```

Two isolated lab sessions attack each other and themselves through the real handlers. Each attack must be refused or contained:

| Attack class | What is attempted |
|---|---|
| Cross-session | reading, verifying, committing, recording, revoking, tracing or registering issuer state on the other session's objects; using its token; a same-named anchor key from the other session; verifying its receipts against the wrong registry |
| Confused deputy | a capability bound to another executor; a credential bound to someone else; capabilities or credentials signed under the wrong anchor role; a capability naming another workspace; role misuse; scope injection; broadening or swapping the effect at commit |
| Replay | an operation id reused with a changed body; a second commit or outcome; re-registering revoked documents; committing a verification issued before a revocation |
| Altered receipt | each signed field changed, with and without a recomputed hash; changed signature, key id or signing status; lab keys without opt-in; the public verifier under another session |
| Race | four concurrent commits of one verification; concurrent verifications against `max_uses`; verifications racing a revocation; competing issuer-state supersessions |
| Secret exposure | request secrets echoed in refusals; private key material in registries or public routes; any token, key, case secret or canary in any response |

It uses two of the per-client hourly sessions, so run it at least an hour apart from `run.mjs`. AMOS CI also runs it in-process against nine weakened engines, each missing one safeguard: a second commit, an ignored operation conflict, ignored `max_uses`, ignored executor binding, an accepted broadened commit, an unapplied revocation, an ignored capability scope, a restored revoked credential and an echoing refusal. All nine fail. A separate CI test does the same with real API keys from two tenants. Results describe these lab conditions only, not general customer security.

The [live canary](../canary/README.md) runs read-only production checks every six hours and this suite weekly.

## Files and protocol

- `authority-documents.schema.json`: anchors, scoped anchor-possession documents, standing credentials, source records, capabilities, signed revocations and AMOS closure content.
- `authority-request.schema.json`: every authority action, its required fields and document shape.
- `authority-receipts.schema.json`: complete verification, revocation and effect receipt bodies.
- `positive.json`, `negative.json`: canonical signed documents, required-field and unknown-field failures, signature tampering.
- `canonicalization-vectors.json`: sorted object keys, preserved array order, Unicode and numeric representation.
- `signed-receipts.json`: a complete four-receipt lab chain.
- `public-test-key.json`: intentionally public test key, including its private bytes solely for reproducibility. Never use or trust it for production. Live sessions use different ephemeral keys; their private bytes are never published.

Signing uses UTF-8 `MVR-AUTHORITY-V1\n{document_type}\n{canonical_json}` with Ed25519 and SPKI public keys. Anchor registration signs the scoped `mvr.anchor-possession/1` document, not the complete anchor. Canonicalization sorts object keys recursively using JavaScript string ordering, preserves array order, and uses finite JSON numbers and `JSON.stringify` encoding. This is the published AMOS protocol, not a claim to implement every JCS numeric or Unicode rule. Maximum nesting is 40. Unsupported values, non-finite numbers and non-JSON objects are rejected by the offline helper.

Schema validity proves structure only. Runtime checks additionally enforce time ordering and maximum lifetimes, amount ceilings, issuer signatures, scope, current dependency state and trust. Fixtures use fixed dates for reproducibility; the live runner generates fresh dates. The schemas do not assert that lab-fixture credentials have real-world authority.

Discover the live session contract at `/v1/authority-conformance/contract`, authority actions at `/v1/authority-chain/contract`, and review actions at `/v1/review-cases/contract`. For receipt trust and rotation rules, read [receipt verification](../../docs/authority-receipts.md). For persistent executor outcomes, read [durable execution](../../docs/durable-authority-executor.md).

See [developer rerun instructions](DEVELOPER-RERUN.md), [signed issuer state](../../docs/signed-issuer-state.md), and the two exact `mcp-*.json` protected-reference fixtures.
