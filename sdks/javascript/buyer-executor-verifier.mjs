// Buyer-executor verifier (amos.buyer-executor/1): the check a buyer's own adapter runs, in the buyer's environment,
// before it performs one exact effect AMOS has committed. It performs the effect only when every check passes:
//   1. the trust chain verifies from the root the buyer pinned (realm, registry statement, receipt key, current-state proof);
//   2. the receipt is an effect_commit with decision commit, for the capability the current-state proof names;
//   3. the current-state proof and the feed head are younger than the effect risk class allows (mvr.offline-policy/1), the
//      feed reaches the proof's sequence, and no later feed entry revokes the capability or closes the session;
//   4. the effect to perform is exactly the committed one (same effect_id, SHA-256 of its canonical JSON), its action is the
//      one this adapter performs (one canonical identity: an alias and its canonical ID are the same action), and the
//      executor is the bound one;
//   5. the commit window is open and this commit_id has never been consumed (atomic claim in the buyer's own store).
// Any failure refuses with a stable code and performs nothing. AMOS cannot perform, recall or widen the effect.
import {verifyAuthorityChain} from './trust-chain-verifier.mjs';
import {canonicalJson, verifyAuthorityReceipt} from './authority-receipts.mjs';
export const BUYER_EXECUTOR_VERSION = 'amos.buyer-executor/1';
// Immutable legacy aliases of the action ontology (mvr.action-ontology/1); a CI test checks this table against the server contract.
export const ACTION_ALIASES = Object.freeze({create_draft_record: 'amos.document.draft.create@1', send_evidence_request: 'amos.communication.evidence.request@1', schedule_meeting: 'amos.calendar.meeting.create@1',
  contact_counterparty: 'amos.communication.counterparty.contact@1', publish_document: 'amos.document.publish@1', commit_spend: 'amos.finance.spend.commit@1'});
export const canonicalAction = id => ACTION_ALIASES[id] ?? id;
export const BUYER_REFUSALS = Object.freeze(['BUYER_CHAIN_INVALID', 'BUYER_NOT_A_COMMIT', 'BUYER_CAPABILITY_MISMATCH', 'BUYER_FEED_NOT_FRESH', 'BUYER_FEED_BEHIND_PROOF', 'BUYER_CAPABILITY_REVOKED_IN_FEED',
  'BUYER_SESSION_CLOSED', 'BUYER_EFFECT_MISMATCH', 'BUYER_ACTION_NOT_SUPPORTED', 'BUYER_EXECUTOR_MISMATCH', 'BUYER_COMMIT_EXPIRED', 'BUYER_IN_PROGRESS', 'BUYER_ABANDONED', 'BUYER_EFFECT_FAILED_RETRYABLE']);
const sha256 = async text => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))), b => b.toString(16).padStart(2, '0')).join('');
export function memoryClaimStore() {
  const rows = new Map();
  return {async claim(id, row) { if (rows.has(id)) return {claimed: false, row: rows.get(id)}; rows.set(id, {...row, state: 'in_progress'}); return {claimed: true}; },
    async update(id, patch) { rows.set(id, {...rows.get(id), ...patch}); }, async get(id) { return rows.get(id) || null; }, rows};
}

// pinnedRoot: the trust root statement the buyer pinned from the attested public repository.
// expect: {realm, organization_ref?, tenant_id?} the buyer requires. action: the canonical action this adapter performs.
// feed: a feed subscriber (conformance/receiver-kit/feed-subscriber.mjs) kept current for the session, or null to refuse.
export function createBuyerExecutor({pinnedRoot, expect = {}, action, executorPrincipalSha256 = null, store, performEffect, reconcile, feed, now = () => Date.now(), clockSkewMs = 1000, allowLabKeys = true}) {
  if (!pinnedRoot || !action || !store || typeof performEffect !== 'function' || typeof reconcile !== 'function') throw new Error('pinnedRoot, action, store, performEffect and reconcile are required');
  const refuse = (code, steps = [], detail = null) => ({performed: false, refused: true, code, ...(detail ? {detail} : {}), steps});
  async function attempt(commitId, effect, receipt, steps) {
    try {
      const result = await performEffect(effect, {commit_id: commitId});
      await store.update(commitId, {state: 'completed', completed_at: new Date(now()).toISOString(), result: result ?? null});
      return {performed: true, commit_id: commitId, result: result ?? null, steps};
    } catch (error) {
      await store.update(commitId, {state: 'failed_retryable', last_error: String(error?.message || error).slice(0, 200), commit_valid_until: receipt.commit_valid_until});
      return {performed: false, retryable: true, commit_id: commitId, code: 'BUYER_EFFECT_FAILED_RETRYABLE', steps};
    }
  }
  return {
    version: BUYER_EXECUTOR_VERSION,
    async commit({receipt, requested_effect, registry_statement, current_state}) {
      const steps = [];
      if (!feed) return refuse('BUYER_FEED_NOT_FRESH', steps, 'no feed subscriber');
      const riskClass = current_state?.risk_class ?? 'high';
      const policyMax = feed?.state?.offline_policy?.risk_classes?.[riskClass]?.max_offline_age_seconds ?? 0;
      const chain = await verifyAuthorityChain({trustRoot: pinnedRoot, registryStatement: registry_statement, receipt, receiptVerifier: (r, o) => verifyAuthorityReceipt(r, {...o, allowLabKeys}), currentState: current_state,
        expect: {...expect, root_key_id: pinnedRoot.key_id, capability_id: current_state?.capability_id}, now: now(), maxOfflineAgeSeconds: policyMax});
      steps.push({check: 'trust_chain', valid: chain.valid, reason: chain.reason});
      if (!chain.valid) return refuse('BUYER_CHAIN_INVALID', steps, chain.reason);
      if (receipt.kind !== 'effect_commit' || receipt.decision !== 'commit' || !/^CM-[a-f0-9]{48}$/.test(receipt.commit_id || '')) return refuse('BUYER_NOT_A_COMMIT', steps);
      if (receipt.capability_id !== undefined && receipt.capability_id !== current_state.capability_id) return refuse('BUYER_CAPABILITY_MISMATCH', steps);
      const fresh = feed.fresh({riskClass});
      steps.push({check: 'feed_fresh', ...fresh});
      if (!fresh.fresh) return refuse('BUYER_FEED_NOT_FRESH', steps, fresh.reason);
      if ((current_state.feed_sequence ?? 0) > feed.state.last_sequence) return refuse('BUYER_FEED_BEHIND_PROOF', steps);
      if (feed.state.session_closed) return refuse('BUYER_SESSION_CLOSED', steps);
      if (feed.state.revoked_capabilities.has(current_state.capability_id)) return refuse('BUYER_CAPABILITY_REVOKED_IN_FEED', steps);
      steps.push({check: 'feed_current', last_sequence: feed.state.last_sequence, proof_feed_sequence: current_state.feed_sequence ?? 0});
      if (!requested_effect || requested_effect.effect_id !== receipt.effect_id || await sha256(canonicalJson(requested_effect)) !== receipt.requested_effect_sha256) return refuse('BUYER_EFFECT_MISMATCH', steps);
      if (canonicalAction(requested_effect.effect_type) !== canonicalAction(action)) return refuse('BUYER_ACTION_NOT_SUPPORTED', steps);
      if (executorPrincipalSha256 && receipt.executor_principal_sha256 !== executorPrincipalSha256) return refuse('BUYER_EXECUTOR_MISMATCH', steps);
      steps.push({check: 'exact_effect_and_action', canonical_action: canonicalAction(action)});
      const open = now() <= Date.parse(receipt.commit_valid_until) + clockSkewMs;
      const claim = await store.claim(receipt.commit_id, {effect_id: receipt.effect_id, requested_effect_sha256: receipt.requested_effect_sha256, commit_valid_until: receipt.commit_valid_until, claimed_at: new Date(now()).toISOString()});
      if (claim.claimed) {
        if (!open) { await store.update(receipt.commit_id, {state: 'abandoned', reason: 'expired_before_attempt'}); return refuse('BUYER_COMMIT_EXPIRED', steps); }
        return attempt(receipt.commit_id, requested_effect, receipt, steps);
      }
      const row = claim.row;
      if (row.state === 'completed') return {performed: false, already_performed: true, commit_id: receipt.commit_id, result: row.result ?? null, steps};
      if (row.state === 'abandoned') return refuse('BUYER_ABANDONED', steps);
      const found = await reconcile({commit_id: receipt.commit_id});
      if (found?.exists) { await store.update(receipt.commit_id, {state: 'completed', reconciled: true, result: found.result ?? null}); return {performed: false, already_performed: true, reconciled: true, commit_id: receipt.commit_id, steps}; }
      if (!open) { await store.update(receipt.commit_id, {state: 'abandoned', reason: 'expired_before_retry'}); return refuse('BUYER_COMMIT_EXPIRED', steps); }
      if (row.state === 'in_progress') return refuse('BUYER_IN_PROGRESS', steps);
      return attempt(receipt.commit_id, requested_effect, receipt, steps);
    }
  };
}
