// Reference customer receiver: the customer-side system that performs an effect AMOS has committed. It runs in the
// customer's environment, under the customer's control, and acts only when ALL of these hold:
//   1. the effect_commit receipt verifies against the published key registry (signature and fields);
//   2. its decision is "commit";
//   3. the effect to perform is exactly the committed one (SHA-256 of its canonical JSON, and the same effect_id);
//   4. the commit window (commit_valid_until) has not passed;
//   5. this commit_id has not been consumed before (atomic claim in the customer's own store).
// A retry of a failed attempt reuses the same commit_id inside the window; a crash after the effect is reconciled
// against the customer's effect system before anything is repeated. AMOS cannot perform or recall the effect.
import {canonicalJson, verifyAuthorityReceipt} from '../../sdks/javascript/authority-receipts.mjs';
export const RECEIVER_VERSION = 'amos.commit-receiver/1';
export const RECEIVER_REFUSALS = Object.freeze(['RECEIVER_RECEIPT_INVALID', 'RECEIVER_NOT_A_COMMIT_RECEIPT', 'RECEIVER_NOT_COMMITTED', 'RECEIVER_EFFECT_MISMATCH', 'RECEIVER_COMMIT_EXPIRED', 'RECEIVER_EXECUTOR_MISMATCH', 'RECEIVER_IN_PROGRESS', 'RECEIVER_ABANDONED']);
const sha256 = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join('');
const refuse = code => ({performed:false, refused:true, code});
// A minimal store for tests and single-process use. Production receivers use their database with the same atomic claim.
export function memoryCommitStore() {
  const rows = new Map();
  return {
    async claim(commitId, row) { if (rows.has(commitId)) return {claimed:false, row:rows.get(commitId)}; rows.set(commitId, {...row, state:'in_progress'}); return {claimed:true}; },
    async update(commitId, patch) { rows.set(commitId, {...rows.get(commitId), ...patch}); },
    async get(commitId) { return rows.get(commitId) || null; },
    rows
  };
}
// performEffect(effect, {commit_id}) must use commit_id as the idempotency key in the effect system.
// reconcile({commit_id}) asks the effect system whether that commit_id already produced an effect.
export function createCommitReceiver({registry, allowLabKeys = false, store, performEffect, reconcile, now = () => Date.now(), clockSkewMs = 1000, executorPrincipalSha256 = null}) {
  if (!registry || !store || typeof performEffect !== 'function' || typeof reconcile !== 'function') throw new Error('registry, store, performEffect and reconcile are required');
  async function attempt(commitId, effect, receipt) {
    try {
      const result = await performEffect(effect, {commit_id:commitId});
      await store.update(commitId, {state:'completed', completed_at:new Date(now()).toISOString(), result:result ?? null});
      return {performed:true, commit_id:commitId, result:result ?? null};
    } catch (error) {
      await store.update(commitId, {state:'failed_retryable', last_error:String(error?.message || error).slice(0, 200), commit_valid_until:receipt.commit_valid_until});
      return {performed:false, retryable:true, commit_id:commitId, code:'RECEIVER_EFFECT_FAILED_RETRYABLE'};
    }
  }
  return {
    version:RECEIVER_VERSION,
    async receive({receipt, requested_effect}) {
      const verified = await verifyAuthorityReceipt(receipt, {registry, allowLabKeys});
      if (!verified.valid) return refuse('RECEIVER_RECEIPT_INVALID');
      if (receipt.kind !== 'effect_commit') return refuse('RECEIVER_NOT_A_COMMIT_RECEIPT');
      if (receipt.decision !== 'commit') return refuse('RECEIVER_NOT_COMMITTED');
      if (!/^CM-[a-f0-9]{48}$/.test(receipt.commit_id || '')) return refuse('RECEIVER_NOT_A_COMMIT_RECEIPT');
      if (!requested_effect || requested_effect.effect_id !== receipt.effect_id || await sha256(canonicalJson(requested_effect)) !== receipt.requested_effect_sha256) return refuse('RECEIVER_EFFECT_MISMATCH');
      if (executorPrincipalSha256 && receipt.executor_principal_sha256 !== executorPrincipalSha256) return refuse('RECEIVER_EXECUTOR_MISMATCH');
      const open = now() <= Date.parse(receipt.commit_valid_until) + clockSkewMs;
      const claim = await store.claim(receipt.commit_id, {effect_id:receipt.effect_id, requested_effect_sha256:receipt.requested_effect_sha256, commit_valid_until:receipt.commit_valid_until, claimed_at:new Date(now()).toISOString()});
      if (claim.claimed) {
        if (!open) { await store.update(receipt.commit_id, {state:'abandoned', reason:'expired_before_attempt'}); return refuse('RECEIVER_COMMIT_EXPIRED'); }
        return attempt(receipt.commit_id, requested_effect, receipt);
      }
      // Seen before: never perform twice. Report, retry inside the window, or reconcile an interrupted attempt.
      const row = claim.row;
      if (row.state === 'completed') return {performed:false, already_performed:true, commit_id:receipt.commit_id, result:row.result ?? null};
      if (row.state === 'abandoned') return refuse('RECEIVER_ABANDONED');
      if (row.state === 'failed_retryable' || row.state === 'in_progress') {
        const found = await reconcile({commit_id:receipt.commit_id});
        if (found?.exists) { await store.update(receipt.commit_id, {state:'completed', reconciled:true, result:found.result ?? null}); return {performed:false, already_performed:true, reconciled:true, commit_id:receipt.commit_id, result:found.result ?? null}; }
        if (!open) { await store.update(receipt.commit_id, {state:'abandoned', reason:'expired_before_retry'}); return refuse('RECEIVER_COMMIT_EXPIRED'); }
        if (row.state === 'in_progress' && !found) return refuse('RECEIVER_IN_PROGRESS');
        return attempt(receipt.commit_id, requested_effect, receipt);
      }
      return refuse('RECEIVER_IN_PROGRESS');
    }
  };
}
