# Receipt key ceremony (made in Cloudflare)

AMOS stamps its receipts (decision snapshot locks and authority receipts) with one Ed25519 key, so anyone can check that a record is unchanged and that AMOS's key stamped it. A stamp authorizes nothing.

## How the key is made

The key is made in a witnessed ceremony, inside AMOS's Cloudflare Worker:

1. **Authority.** The operator gives the Worker a Cloudflare API token with Workers Scripts Edit permission and an expiry within 26 hours. Only members of AMOS's Cloudflare account can create one. The Worker uses it for that request only and never stores, logs or returns it.
2. **Checks first.** The Worker confirms:
   - no receipt key exists;
   - the newest uploaded version is the deployed one (adding a secret deploys the newest version);
   - no receipt-key secret is present.
   It then takes an atomic once-only lock.
3. **Generation and birth record.** It generates an Ed25519 key pair and signs a **birth record** with it: the key ID, ceremony ID, public key and fingerprint, a SHA-256 of the participants list, the time, the deployed version, and where the private key went.
4. **Storage.** It stores the private key as a Cloudflare `secret_key` binding: Ed25519, PKCS#8, usage `sign` only. From then on the Worker receives it as a **non-extractable** key. Code can ask Cloudflare to sign with it but cannot read it back.
5. **Activation.** It stores the ceremony record in a second step. Only then does the registry publish the key and signing switch on.
6. **Witnesses.** Two people watch: an independent technical witness who checks the result on their own phone, and an advocate who is a Commissioner for Oaths. The operator and the technical witness make statutory declarations of what they saw. Nothing secret is shown, so the session can be recorded.

## Check it yourself

- **Registry:** `https://africanmarketos.com/.well-known/mvr-signing-keys.json`. Under `key_ceremony` it carries the birth record and its signature.
- **Status:** `https://africanmarketos.com/v1/key-ceremony/status` shows the ceremony state, the birth record check, and how the Worker sees the private key binding (`extractable: false`, `usages: ["sign"]`). It never shows the key.
- **Proof of possession:** `https://africanmarketos.com/.well-known/mvr-signing-key-proof?nonce=<32 lowercase hex>` signs `MVR-RECEIPT-KEY-PROOF-V1\n{key_id}\n{nonce}`. That prefix differs from receipt signatures (`MVR-RECEIPT-V1\n`), so a proof is never a receipt.
- **Independent verifier:** [`conformance/receipt-key/verify.mjs`](../conformance/receipt-key/README.md) checks all of this with no AMOS code. [`ceremony-module.mjs`](../conformance/receipt-key/ceremony-module.mjs) is the exact ceremony code the Worker runs.
- **Contract:** `https://africanmarketos.com/v1/key-ceremony/contract`.

## Trust that remains

- **Cloudflare stores the key.**
- **Deployers can use the key, but not copy it.** Anyone who can deploy code to the Worker could make it sign while that code runs, but could not copy the key out.
- **The birth record proves possession, not attendance.** It proves the key and its details, not who attended; the signed paper record and declarations do that.

## Retire or revoke

Setting `MVR_RECEIPT_SIGNING_CEREMONY_KEY_STATUS` to `retired` stops new signatures, while existing receipts still verify. Setting it to `revoked` stops both. Either needs `MVR_RECEIPT_SIGNING_CEREMONY_KEY_STATUS_AT`. Rotating to a second made-in-Cloudflare key needs ceremony version 2, which keeps earlier receipts verifiable. It is due before the first rotation date published with the key.
