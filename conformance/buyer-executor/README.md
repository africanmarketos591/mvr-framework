# Buyer-executor conformance

`sdks/javascript/buyer-executor-verifier.mjs` is the check a buyer's own adapter runs, in the buyer's environment, before it performs one exact effect that AMOS has committed. AMOS cannot perform, recall or widen the effect; the adapter decides, and it performs nothing unless every check passes:

1. the trust chain verifies from the root the buyer pinned from this repository: realm, signed registry statement, receipt key, current-state proof;
2. the receipt is an `effect_commit` with decision `commit` for the capability the current-state proof names;
3. the current-state proof and the feed head are younger than the effect's risk class allows (`mvr.offline-policy/1`: low 300 s, standard 60 s, high 5 s), the feed reaches the proof's sequence, and no later feed entry revokes the capability or closes the session;
4. the effect is exactly the committed one (same `effect_id`, SHA-256 of its canonical JSON), its action is the one the adapter performs (an alias and its canonical ID are one action), and the executor is the bound one;
5. the commit window is open and the `commit_id` has never been consumed (atomic claim in the buyer's own store).

The feed is read with `conformance/receiver-kit/feed-subscriber.mjs` (long poll while connected, catch-up after a restart).

## Negative suite

```
node conformance/buyer-executor/negative-suite.mjs [--output result.json]
```

Offline, no network. A local issuer mints a root, registry statement, commit receipts, current-state proofs and a feed in the published formats. Two positive cases must perform exactly once (canonical action, and an adapter registered under the legacy alias); twenty-two negative cases must refuse with zero effects: an unpinned root, a foreign registry, a production receiver given the conformance realm, tampered statements and receipts, a receipt that is not a commit, a different amount or effect id, an expired window, another executor, stale, non-permitting or foreign current-state proofs, a high-risk effect on an old proof, a receiver offline longer than its policy, no feed, a feed revocation or session close after the proof, a proof ahead of the feed, and an unsupported action. Four more cases check that the subscriber refuses a tampered entry, a gap, a foreign head signature and a replayed older feed.

The live, end-to-end version runs in the Enterprise conformance realm: `conformance/enterprise-conformance/`.

All case data are proprietary lab fixtures. A buyer's own adapter, store and effect system are the buyer's; this suite qualifies the verifier logic, not a particular buyer deployment.
