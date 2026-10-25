# Changelog: 2026-10-25.key-ceremony.1

## Added

- **Made-in-Cloudflare receipt key ceremony.** `POST /v1/key-ceremony` with four actions:
  - `precheck`;
  - `run`, once only;
  - `check_token`;
  - `recover_interrupted`.

  It also adds an operator page at `/key-ceremony/`, `GET /v1/key-ceremony/status` and `GET /v1/key-ceremony/contract`. The key is generated inside the Worker and stored as a non-extractable `secret_key` binding, usable only for signing. No person, device or AI agent receives it. See [receipt key ceremony](receipt-key-ceremony.md).
- **Proof of possession.** `GET /.well-known/mvr-signing-key-proof?nonce=` signs a caller's random challenge with the active receipt key, under a prefix distinct from receipts.
- **Registry.** After the ceremony, `/.well-known/mvr-signing-keys.json` publishes the key's fingerprint and its signed birth record (`key_ceremony.method: made_in_cloudflare`).
- **Retire or revoke** the key with `MVR_RECEIPT_SIGNING_CEREMONY_KEY_STATUS` (`retired` or `revoked`) and `MVR_RECEIPT_SIGNING_CEREMONY_KEY_STATUS_AT`.
- **Public verifier and code.** [`conformance/receipt-key/`](../conformance/receipt-key/README.md) holds an independent verifier, the exact ceremony code, a lab fixture, and a workflow that runs the verifier's own test.

## Unchanged

- **No key yet.** Until the witnessed ceremony runs, the registry stays `not_configured_until_key_ceremony` and receipts stay unsigned.
- **The single-key environment path still works.** It cannot be combined with a ceremony record; that combination is refused.
- **Nothing is authorized.** A receipt signature authorizes nothing.
