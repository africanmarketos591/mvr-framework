# Authority receipt verification

`POST /v1/authority-receipts/verify` accepts `{ "receipt": <complete receipt> }`. An optional `previous_head` contains `sequence` and `sha256`. For a live lab receipt, also supply `lab_session_id` and `allow_lab_keys: true`. The server selects its published registry; a caller cannot provide a replacement trusted key. Malformed, unsigned, unknown-key, revoked-key and tampered receipts return `valid: false` with a reason. A successful HTTP response alone does not mean verification succeeded.

The same algorithm is exported as `verifyAuthorityReceipt` from `sdks/javascript/authority-receipts.mjs`. Offline callers must obtain and authenticate their own trusted registry. No network request or automatic key download occurs:

```js
import { verifyAuthorityReceipt } from '../sdks/javascript/authority-receipts.mjs';
const result = await verifyAuthorityReceipt(receipt, {
  registry: trustedRegistry,
  previousHead: { sequence: 0, sha256: '0'.repeat(64) },
  allowLabKeys: true // Only for explicitly isolated lab verification.
});
```

Receipts include the entire hashed body, not just a digest and signature. Remove `sha256` and `signature`, canonicalize the remaining body, and compare its SHA-256 digest. The signed bytes are UTF-8 `MVR-RECEIPT-V1\n{key_id}\n{sha256}`. Signatures use Ed25519 and the `MVR-RECEIPT-SIG-V1` envelope. The optional previous head checks only the next sequence number and hash link; it does not establish completeness before that head, independent chronology or the truth of an effect report.

Operational keys are published at `/.well-known/mvr-signing-keys.json`. Production receipt signing remains subject to the named-person key ceremony. This release does not create, install or activate an operational signing key. Unsigned production receipts remain explicitly unsigned.

Each disposable conformance session generates a separate ephemeral lab key. Its public registry is returned at issuance and is available at `/v1/authority-conformance/keys?session_id=AC-...` for the session lifetime. Save it with the receipts for later offline verification. Closing a session retires its key for historical verification and prevents further signing. Session expiry removes server access to that registry. A saved registry is a snapshot; it cannot prove subsequent revocation status.

Rotation policy: sign only with the selected active key; publish its identity and public bytes before use. Retain retired public keys for historical cryptographic checks. A retired key can verify an existing signature, but the receipt's own timestamp cannot independently prove it was signed before retirement. On compromise, mark the key revoked and reject all of its signatures, including historical ones. Consumers must refresh their trusted registry to learn revocations; offline consumers must record the registry snapshot they used. Do not reuse a key ID for different material. Duplicate IDs, unknown status and unknown keys fail closed.

Verification reports hash validity, signature validity, optional chain-link validity and lab classification separately. `chronology_verified`, `production_authority` and `execution_authorized` remain false. A valid receipt is never permission to execute; perform a fresh capability check immediately before an effect.

## Operational trust procedure

Before activation, named custodians record the accountable owner, independently verified organization and scope, dual-control approvers, public-key fingerprint, custody method, recovery and compromise contacts, and signed ceremony evidence. Key possession alone does not establish institutional or legal authority. No production key is activated by this release.

For planned rotation, generate distinct key material and a new immutable key ID under the approved custody process; verify the public fingerprint through the authenticated change record; publish the new active public entry before switching the signer. Test receipt verification using the trusted registry, record the exact switch time and evidence, then retire the previous signing key and retain its public bytes. Check consumer refresh behavior before ending any overlap. Roll back a failed switch to an uncompromised approved signer while preserving registry and incident history.

For retirement without compromise, disable signing with the key, mark the registry entry retired, preserve historical public material and record the reason and accountable approval. Historical cryptographic validity is distinct from independent signing chronology and present execution permission.

On suspected compromise, stop signing with the affected key, mark it revoked in the authenticated registry, preserve forensic evidence and notify affected consumers through the approved incident process. Reject its historical and new signatures. Consumers refresh registry state and fail closed when their freshness policy cannot be satisfied. Investigate dependent decisions and reissue only through a separately approved key and fresh authority checks. Record acknowledgements, registry versions and closure evidence. Offline verification cannot establish that no subsequent revocation occurred.
