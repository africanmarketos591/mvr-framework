# Customer receiver kit

AMOS never performs an effect. Your system does: it creates the draft, sends the payment instruction, or publishes the record. This kit is the customer-side half of the commit-time check.

After `commit_effect`, AMOS returns a signed `effect_commit` receipt. Your receiver acts only when all five of these hold:

1. **Signed and intact.** The receipt verifies against the published key registry: signature, chain fields and kind.
2. **Committed.** The decision is `commit`; a `deny` means AMOS refused at the moment of the effect, for example after a revocation.
3. **Exact.** The effect you are about to perform is the committed one: same `effect_id`, and a SHA-256 of its canonical JSON equal to `requested_effect_sha256`. A larger amount, another resource or a different effect is refused.
4. **In time.** `commit_valid_until` (at most 15 seconds after commit) has not passed.
5. **Once.** The `commit_id` has never been consumed. Claim it atomically in your own database before acting.

**Retries and crashes.**
- **A retry** of a failed attempt reuses the same `commit_id` inside the window.
- **After a crash,** the receiver first asks your effect system whether that `commit_id` already produced an effect, and never repeats one.
- **Your effect system must accept `commit_id` as its idempotency key.**

## Use

```js
import {createCommitReceiver} from './receiver.mjs';
const receiver = createCommitReceiver({
  registry,                 // the published receipt key registry (or, in a lab session, its lab registry)
  store,                    // claim(commit_id, row) atomically; update(commit_id, patch); get(commit_id)
  performEffect,            // async (effect, {commit_id}) => result; commit_id is the idempotency key
  reconcile,                // async ({commit_id}) => {exists, result}
});
const outcome = await receiver.receive({receipt, requested_effect});
```

`memoryCommitStore()` is for tests only. In production, `claim` must be a single atomic database operation (for example an `INSERT … ON CONFLICT DO NOTHING`).

## Prove it

```bash
node conformance/authority/run.mjs
```

This runs the full authority conformance against production in an isolated lab session. The receiver scenarios are part of it. Fourteen deliveries of real AMOS commits are made to the reference receiver.

**Pass:**
- Each valid commit produces exactly one harmless effect, with one call to the effect system.
- A replay, a broadened amount, another resource or effect, an altered receipt, a late delivery and a revocation between verification and commit produce none.
- A retry after a transient failure, and a redelivery after a crash, never duplicate it.

To test **your own** receiver with the same commits:

```bash
node conformance/authority/run.mjs --receiver ./my-receiver.mjs
```

Your module exports `createCommitReceiver` (or a default factory) taking the same options. The report says `receiver_under_test: caller-supplied receiver`.

AMOS's CI also runs the kit against six deliberately broken receivers, each missing one safeguard: signature, exact effect, window, decision, once-only claim or reconciliation. All six fail.

**Limits.**
- **Lab keys only, for now.** Lab sessions sign with lab keys. Production commit receipts are signed with AMOS's receipt key once its witnessed ceremony has run; until then they are unsigned and a receiver must refuse them.
- **Harmless lab effect.** The kit's effect is an in-process draft counter. Your real effect system's own failure modes are yours to test.
