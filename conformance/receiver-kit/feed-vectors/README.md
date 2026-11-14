# Signed current-state feed

The feed binds entries to one session and its registry verification key. Obtain that key through a registry statement verified against the pinned root for the intended realm. The fixture key in vectors.json is solely for interoperability testing.

## Bytes on the wire

1. Encode JSON as UTF-8 without a BOM, whitespace outside strings, or a trailing newline. For the defined feed fields use strings, booleans, null, bounded integers, arrays in original order and objects with keys in ECMAScript UTF-16 code-unit sort order. Feed field names are nonnumeric ASCII. Preserve string contents without Unicode normalization.
2. For each entry remove only the top-level entry_sha256, canonicalize all remaining fields, and compute lowercase hex SHA-256. The first sequence is 1 and its predecessor is null. Every subsequent predecessor equals the previous entry digest.
3. For the head remove its top-level sha256 and signature. Hash the canonical head body. The signed bytes are the UTF-8 encoding of MVR-TRUST-V1, the head contract, the expected registry key ID, and the lowercase hex head digest, separated by LF with no final newline. Verify the base64 Ed25519 signature against the pinned session key in DER SubjectPublicKeyInfo format.
4. Bind the signed session, sequence and final digest to the received chain. Reject gaps, lower sequences, inconsistent same-sequence heads, older observations, future observations beyond one second of clock tolerance, and attempts to reopen a closed session. Verify the whole batch before advancing the cursor. A verification failure suspends use until a valid feed is read. A transport outage is subject to the signed offline age limit.
5. On restart restore the last fully verified entries, signed head and revocation state from trusted durable storage, or replay from genesis. An empty response cannot reconstruct a lost checkpoint. If retained history begins beyond the required sequence, stop until the chain can be re-established. A signed head alone does not reconstruct revoked capabilities.
6. Recheck the applicable offline age and current-state proof immediately before each effect. A later revocation of the capability prevents the effect. A later revocation of a dependency requires a new proof. A closed session is terminal.

Run the independent checker with Python 3 and OpenSSL 3 from this directory.

```sh
python check.py
node check-subscriber.mjs
```

The fixture records the exact canonical text, digests, signing input bytes and public signature for a registration followed by revocation. All records are synthetic.
