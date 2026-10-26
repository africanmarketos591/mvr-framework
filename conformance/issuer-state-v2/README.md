# Issuer state version 2: reproducible vectors

An institution's signed issuer state (`mvr.issuer-state/2`) tells AMOS whether a subject may take an action in a place, and under which conditions. This folder lets anyone check AMOS's handling of it without trusting AMOS's code.

| File | What it is |
|---|---|
| [`SPEC.md`](SPEC.md) | Every rule: canonical JSON, each hash and signature preimage, registration and evaluation checks in order, conditions, and how issuer state turns into allow or deny |
| [`vectors.json`](vectors.json) | 98 steps produced by the AMOS engine itself on a fixed clock with published lab keys: inputs, digests, signatures, and the exact results |
| [`check.py`](check.py) | A separate implementation of SPEC.md in Python, standard library only, sharing no code with AMOS. It replays the vectors |
| [`constructors.mjs`](constructors.mjs) | Standalone JavaScript (WebCrypto) for building and signing version 2 documents, reviews and condition receipts |

## Check it

```sh
python conformance/issuer-state-v2/check.py
```

It needs Python 3.9 or later and nothing else, and runs offline in a few seconds. **Pass means all of these hold:**
- `"passed": true`;
- `canonical_json` 12, `public_keys` 9, `preimages` 22, `digests` 49;
- `signatures` 112, every one re-signed from the published seeds and byte-identical;
- `registrations` 49, `evaluations` 32, `verification_reasons` 12, `verification_decisions` 24, and `revocations` 5 applied.

A single mismatch exits with status 1 and lists it.

## What the steps cover

| Category | Steps | Examples |
|---|---|---|
| positive | 20 | a reviewed permission registers and allows a spend at its ceiling; satisfied and waived conditions |
| tamper | 22 | old signatures on changed content, zeroed or wrong-key review signatures, an unregistered or non-lab signer, wrong subject or action, restrictive clause wording, array values where strings belong |
| ceiling | 8 | one unit above the ceiling, another currency, amount conditions below and at the ceiling |
| condition | 33 | missing, duplicate and wrong-scope receipts, receipts living too long, invalid resolver signatures, time windows, version 1 text conditions |
| expiry | 19 | expired and future states, reviews that are too long, future-dated or early, receipt expiry, review expiry |
| waiver | 9 | waivers that are not allowed, allowed waivers, and a waiver that cannot revive revoked evidence |
| dependency revocation | 10 | revoked closure, source record, reviewer standing, delegating parent and issuer anchor |
| supersession | 11 | missing `supersedes`, record-id conflicts, replay of an old record, prohibition → permission → revocation |

Steps can carry more than one category.

## How AMOS keeps this honest

On every change, AMOS's CI:
- regenerates `vectors.json` from the engine and fails if a single byte differs, so the file is always what production code does;
- runs `check.py`;
- breaks the vectors fifteen different ways, including one key-order swap, one changed digit, one dropped revocation and a different engine version, and confirms `check.py` rejects each;
- rebuilds 23 documents AMOS accepted from scratch with `constructors.mjs` and checks the documents and signatures are identical.

Building `check.py` turned up one gap, fixed in the same release. AMOS's runtime validation ran some pattern checks without first requiring a string, so a condition currency written as `["UGX"]` registered, although the published schema rejects it. It then failed every check, so it held the case rather than permitting anything. Strings are now required before every pattern check; four vectors cover this.

## Write your own

Implement SPEC.md in any language and replay `vectors.json` in order. Each `register`, `evaluate`, `effect` and `revoke` step names the case, the instant and the expected result. Start from `initial_store`: anchors, credentials, source records, closures and cases exactly as AMOS stored them. Apply each step to your own copy.

## Limits

- **Lab only.** The keys are published on purpose and sign nothing outside these vectors. No production issuer is active.
- **Attribution, not truth.** A signature shows which configured key signed. It says nothing about whether a document is true or anyone has legal authority.
- **Not independent review.** AMOS wrote `check.py`. It is a separate implementation in another language, written from SPEC.md, but not the work of an independent party. An outside implementation that passes these vectors is still to come.

## Live run with the lab's exact fixture

```sh
node conformance/issuer-state-v2/run-live.mjs
```

This runs issuer state version 2 against production's isolated lab, with the exact harmless fixture: the case's `intended_action` and the capability both name `create_draft_record`. It runs these steps in order:
1. A baseline: the effect is allowed.
2. A signed prohibition: the effect is denied, and the position is `prohibited`.
3. The same prohibition also binds the canonical identifier `amos.document.draft.create@1`.
4. A state registered under a different identifier from the case's is refused with `ISSUER_STATE_CASE_ACTION_MISMATCH`. The detail names both identifiers and says whether they are aliases.
5. Supersession to permitted: the effect is allowed.
6. A conditional state: denied without its receipt, allowed with it.
7. Revocation: the effect is denied.

On 26 October 2026, before this release, the run reached every step, and 12 of 14 behaved as specified. Two real defects caused the other two:
- The prohibition on `create_draft_record` did not bind `amos.document.draft.create@1`; that identifier still read `planning_only`.
- The alias refusal gave no reason.

Both are fixed. A restriction now binds every identifier of the same action. A grant still binds only its exact identifier.
