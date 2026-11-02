# Enterprise conformance realm

A licensed Enterprise key opens an authority-conformance session in the `amos-enterprise-conformance` realm:

```
POST /v1/authority-conformance
X-API-Key: <Enterprise key>
{"action": "issue", "synthetic_only": true, "acknowledge_no_identity_verification": true, "realm": "enterprise_conformance"}
```

The session is bound to that tenant (`licensed_tenant_ref` in the registry statement) and signed by its own root (`/.well-known/mvr-conformance-trust-root.json`; pin it from `trust/amos-conformance-trust-root.json` in this repository). It states `assurance_level: tenant_conformance`, `recognized_standing: none` and `production_authority: false`. It uses the same principals, harmless-effect rules (one draft record in the `amos-lab` system, amount 0, no external contact) and receipts as the keyless lab, with an hourly allowance of ten sessions per licensed tenant.

What it qualifies: one positive exact capability end to end, without fabricating institutional standing.

- `/v1/effect-decision` with `authority_ref: {case_id, requested_effect, conformance_session_id}` returns `favorable / authorized / authorized` for the capability the session institution signed, with `authority_basis.realm`, `production_authority: false` and an `execution_scope` that names the realm. Both `create_draft_record` and `amos.document.draft.create@1` are the same action.
- Only the tenant that opened the session can reference it; a keyless lab session never authorizes a licensed effect decision; a closed session stops every later reference.
- A buyer adapter that pins the Enterprise root (`sdks/javascript/buyer-executor-verifier.mjs`) performs the committed effect exactly once; a receiver pinned to the production or lab root refuses it at the root check.
- Every registration, revocation, closure and session close is an entry in the signed, hash-chained feed (`GET /v1/authority-conformance/feed?session_id=&after=&wait=`). A connected subscriber learns of a revocation by long poll within seconds and the adapter then refuses; a receiver offline longer than its risk class allows applies zero effects.

## Run it

In process (private CI): `scripts/test-authority-conformance-realm.mjs` runs `flow.mjs` through the worker.

Live:

```
MVR_API_KEY=<Enterprise key> [MVR_API_KEY_OTHER_TENANT=<key in another tenant>] node conformance/enterprise-conformance/run-live.mjs --output result.json
```

Without a second tenant's key the cross-tenant check is reported NOT RUN.

## Boundary

This realm proves the protocol and the receiver, not anyone's authority. A production registry still needs a provider-vetted institution and the witnessed key ceremony (`conformance/receipt-key/`). Proprietary lab fixtures only.
