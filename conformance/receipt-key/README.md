# Receipt key verifier

AMOS signs its receipts with one Ed25519 key. The key is made inside AMOS's Cloudflare Worker during a witnessed ceremony and stored as a non-extractable Cloudflare `secret_key` binding: code can ask Cloudflare to sign with it, but nobody can read it back. See [receipt key ceremony](../../docs/receipt-key-ceremony.md).

`verify.mjs` checks the published key independently, with no AMOS code and no dependencies (Node 20 or later):

```bash
node verify.mjs
```

It fetches `https://africanmarketos.com/.well-known/mvr-signing-keys.json` and checks:

1. The birth record names the published key.
2. The fingerprint is the SHA-256 of that key.
3. The key ID and ceremony ID share their year and number.
4. The record says the key was generated in the Worker, the private key was not returned, and signing starts at generation.
5. The record is signed by the key itself.
6. Live, the Worker signs a fresh random challenge with that key (proof of possession).

Before the ceremony it reports `no_key_yet`.

`node verify.mjs --registry saved.json` checks a saved registry offline (no live proof). `node test.mjs` checks the verifier itself against `fixtures/lab-registry.json`, a proprietary lab key made by AMOS's real ceremony code, and six tampered copies.

`ceremony-module.mjs` is a byte-identical copy of the ceremony code the Worker runs (AMOS's CI fails if they differ), so anyone can read how the key is generated, stored and recorded.

**What it cannot show.** Who attended the ceremony. That is on the signed paper record and the sworn declarations made before a Commissioner for Oaths. The key also grants no permission: a receipt signature shows a record is unchanged and that AMOS's key stamped it.
