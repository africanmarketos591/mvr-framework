# Authority Chain: From Verified Evidence to a Narrow, Revocable Action

Contract: `mvr.authority-chain/1` · Route: `POST https://africanmarketos.com/v1/authority-chain` · Discovery: `GET /v1/authority-chain/contract`

AMOS never authorizes an action. Each party has one job:
- **Your institution authorizes.** It holds its own keys and signs what it vouches for.
- **AMOS attests.** It checks those signatures, records which risks are closed, keeps the dependency graph, and answers one question for your executor just before each effect: *is this capability currently valid for exactly this effect?*
- **Your executor enforces.** It runs in your own systems and performs only what was verified.

Every response says `issued_by_amos: false`.

## The positive path

1. **Register keys (institution administrator).** Register an Ed25519 public key per role with `register_anchor`: `institution_authority`, `standing_issuer` or `source_issuer`. The request is signed with the matching private key as proof of possession. Keys registered after a witnessed ceremony are `tenant_declared`. Issuer keys that two AMOS operators have vetted become `platform_vetted`. Test keys are `lab_fixture` and are never relied on.
2. **Record standing.** The standing issuer signs a `mvr.reviewer-standing/1` credential for one reviewer account. It covers:
   - which residual codes and jurisdictions the reviewer may close;
   - their organization, and a signed independence declaration (no relationship to the subject, no conflicts);
   - delegation and validity dates.

   The credential binds to the account's `account_principal_sha256`, which `/v1/auth-check` returns.
3. **Authenticate sources.** The source issuer, for example a registry, signs a `mvr.source-authentication/1` record over a source document's SHA-256 hash, jurisdiction and validity window. A reviewer statement never authenticates a source on its own: the source issuer must be a different key and organization from the reviewer's.
4. **Close one residual.** On an existing review case, the credentialed reviewer calls `close_residual` with exactly one residual code and one scope: `source:<doc id>`, `jurisdiction:<CC>` or `case`. AMOS checks standing, competence, independence, source validity, scope and expiry. Unrelated residuals stay open. The case creator cannot close their own case.
5. **Sign a capability (institution).** The institution signs a `mvr.action-capability/1` that names:
   - the case and the required closures;
   - the open residuals it explicitly accepts, and the minimum closure assurance;
   - the bound executor account;
   - one effect type, with its resource scope, amount ceiling, currency, use limit and contact rule;
   - the human authorization, and a lifetime of at most 24 hours.

   Register it with `register_capability`.
6. **Execute through a bounded executor.** Immediately before the effect, the executor calls `verify_capability` with the exact effect: `effect_id`, type, resource, amount and currency. AMOS re-reads every dependency, then allows or denies with reasons, a validity window and a hash-chained receipt. The executor performs only that effect within the window, then calls `record_effect`.
7. **Revoke.** Revoking a capability, closure, credential, source record or key, withdrawing the case, or a new contradiction denies the next verification immediately. Subscribed webhooks receive identifier-only hints (`authority_capability_revoked`, `authority_dependency_revoked`). Executors must still verify before every effect, because a hint can be late.

## Reference executor

`sdks/javascript/bounded-executor.mjs`:

```js
import {createBoundedExecutor} from './bounded-executor.mjs';
const executor = createBoundedExecutor({
  verify: body => post('/v1/authority-chain', {action: 'verify_capability', ...body}),
  recordEffect: body => post('/v1/authority-chain', {action: 'record_effect', ...body}),
  effects: {create_draft_record: async (effect, {signal}) => ({external_ref_sha256: await createDraftInYourSystem(effect, signal)})}
});
const result = await executor.execute({capability_id, requested_effect});
```

The executor refuses to act when:
- there is no answer, or the answer is malformed;
- the answer is a denial;
- the stated scope differs from what it is about to do;
- the validity window has expired;
- the keys are lab fixtures (unless a test opts in).

It never retries an effect. `executeInternalArtifact` saves typed internal drafts (`internal_work_products`) locally and refuses anything marked for sending.

## What this does not establish

AMOS checks signatures and current state. It does not verify the real-world organization behind a key unless that key is platform-vetted. It does not inspect original documents, and it does not grant legal, regulatory, credit or investment approval. Receipts are signed with the AMOS receipt key only after its key ceremony; until then they are hash-chained and marked `unsigned`.
