# Favourable path conformance

```sh
node conformance/favourable-path/run-live.mjs
```

This command runs [the favourable path](../../docs/favourable-path.md) end to end against production's isolated lab, in one lab session. It uses three proprietary lab originals and three named effects. Two effects are harmless and can be signed in the lab; the third is modelled but never signed.

## What it shows

1. The case owner cannot act as the designated reviewer.
2. The explicit prohibition in an original is routed to its exact passage, with no caller relationship label. It holds the licence claim until a designated reviewer disposes of it.
3. **Acceptance 1.** Designated reviews reach a bounded internal recommendation: internal uses only, execution permission false.
4. **Acceptance 3.** An irrelevant passage reopens nothing. Every target is independent of it, and it is listed `not_needed`.
5. **Capabilities, statement and commit.**
   - The institution signs capabilities, and the executor verifies.
   - The permission statement for the exact effect verifies offline. It is refused for a broadened or altered effect.
   - The commit carries its decision basis, and the receiver performs the effect exactly once.
6. **Priority 2.** An ordinary adverse sentence that no lexicon catches is read by an attributed model under a server-issued task.
   - The reading changes no value.
   - It holds only the targets that depend on the claim.
   - A second, disagreeing reading is recorded alongside it.
7. **Acceptance 2.** A designated reviewer accepts the adverse reading. Only the targets that use that claim are withdrawn; the draft effect still verifies.
8. **Revocation.**
   - Revoking one capability fails exactly that effect, while an unrelated effect still verifies.
   - Revoking the reviewer's designation takes effect live, then is recorded in the journal.
9. **Acceptance 4.** The public replay reproduces every transition and the server state. A forged entry fails.

## Scope and schedule

The run uses proprietary lab fixtures and lab keys. No real institution, reviewer or production authority is involved.

It runs weekly (`weekly-lab-conformance.yml`). AMOS CI also runs it against the full worker bundle.
