// Receiver conformance: real AMOS commits (from an isolated authority conformance session, signed with lab keys)
// delivered to the reference customer receiver. Pass: each valid commit produces exactly one harmless customer
// effect; replay, broadening, a different resource or effect, an altered receipt, expiry and a revocation between
// verification and commit produce none; a retry and a crash after the effect never duplicate it.
import assert from 'node:assert/strict';
import {createCommitReceiver, memoryCommitStore} from './receiver.mjs';
// createReceiver: the receiver under test. Defaults to the reference receiver; pass your own factory with the same
// options ({registry, allowLabKeys, store, performEffect, reconcile, now}) to test your implementation.
export async function runReceiverConformance({registry, allowLabKeys = false, commitFresh, commitAfterRevocation, createReceiver = createCommitReceiver}) {
  // effects: distinct drafts in the customer system. attempts: every call the receiver makes to it. A receiver must
  // not lean on the effect system's idempotency: a replay must make no call at all.
  const effects = new Map(), store = memoryCommitStore(), results = []; let attempts = 0;
  let failNext = false, crashAfterEffect = false, clockOffset = 0;
  // Harmless in-process draft ledger only, keyed by commit_id as the effect system's idempotency key.
  const performEffect = async (effect, {commit_id}) => {
    attempts++;
    if (failNext) { failNext = false; throw new Error('Lab transient failure before the effect'); }
    if (!effects.has(commit_id)) effects.set(commit_id, {draft_id:'LAB-DRAFT-' + (effects.size + 1), effect_id:effect.effect_id});
    if (crashAfterEffect) { crashAfterEffect = false; throw new Error('Lab crash after the effect, before the receiver recorded it'); }
    return effects.get(commit_id);
  };
  const reconcile = async ({commit_id}) => effects.has(commit_id) ? {exists:true, result:effects.get(commit_id)} : {exists:false};
  const receiver = await createReceiver({registry, allowLabKeys, store, performEffect, reconcile, now:() => Date.now() + clockOffset});
  const scenario = async (name, fn, expect, expectAttempts = expect) => { const before = effects.size, tried = attempts; const outcome = await fn(); const created = effects.size - before, called = attempts - tried; results.push({name, expected_new_effects:expect, new_effects:created, expected_attempts:expectAttempts, attempts:called, outcome:Array.isArray(outcome) ? outcome.map(o => o.code || (o.performed ? 'performed' : o.already_performed ? 'already_performed' : 'other')) : outcome.code || (outcome.performed ? 'performed' : outcome.already_performed ? 'already_performed' : 'other')}); assert.equal(created, expect, name + ': ' + JSON.stringify(outcome)); assert.equal(called, expectAttempts, name + ' (calls to the effect system): ' + JSON.stringify(outcome)); return outcome; };

  const first = await commitFresh();
  assert.equal((await scenario('valid commit', () => receiver.receive(first), 1)).performed, true);
  assert.equal((await scenario('replay of the same commit', () => receiver.receive(first), 0)).already_performed, true);
  assert.equal((await scenario('broadened amount', () => receiver.receive({receipt:first.receipt, requested_effect:{...first.requested_effect, amount_minor:(first.requested_effect.amount_minor || 0) + 1}}), 0)).code, 'RECEIVER_EFFECT_MISMATCH');
  assert.equal((await scenario('different resource', () => receiver.receive({receipt:first.receipt, requested_effect:{...first.requested_effect, resource:{...first.requested_effect.resource, resource_id:'LAB-OTHER'}}}), 0)).code, 'RECEIVER_EFFECT_MISMATCH');
  assert.equal((await scenario('different effect id', () => receiver.receive({receipt:first.receipt, requested_effect:{...first.requested_effect, effect_id:'lab-swapped'}}), 0)).code, 'RECEIVER_EFFECT_MISMATCH');
  assert.equal((await scenario('altered receipt (window extended)', () => receiver.receive({receipt:{...first.receipt, commit_valid_until:new Date(Date.now() + 864e5).toISOString()}, requested_effect:first.requested_effect}), 0)).code, 'RECEIVER_RECEIPT_INVALID');

  const late = await commitFresh();
  clockOffset = Date.parse(late.receipt.commit_valid_until) - Date.now() + 5000;
  assert.equal((await scenario('delivered after the commit window', () => receiver.receive(late), 0)).code, 'RECEIVER_COMMIT_EXPIRED');
  clockOffset = 0;
  assert.equal((await scenario('expired commit redelivered in time', () => receiver.receive(late), 0)).code, 'RECEIVER_ABANDONED');

  const retried = await commitFresh(); failNext = true;
  assert.equal((await scenario('transient failure', () => receiver.receive(retried), 0, 1)).retryable, true);
  assert.equal((await scenario('retry within the window', () => receiver.receive(retried), 1)).performed, true);

  const crashed = await commitFresh(); crashAfterEffect = true;
  assert.equal((await scenario('crash after the effect', () => receiver.receive(crashed), 1)).retryable, true);
  assert.equal((await scenario('redelivery reconciles, no duplicate', () => receiver.receive(crashed), 0)).reconciled, true);

  const raced = await commitFresh();
  const both = await scenario('two concurrent deliveries', () => Promise.all([receiver.receive(raced), receiver.receive(raced)]), 1, 1);
  assert.equal(both.filter(x => x.performed).length, 1);

  const revoked = await commitAfterRevocation();
  assert.equal(revoked.receipt.decision, 'deny', 'AMOS denies the commit after a revocation');
  assert.equal((await scenario('revoked between verification and commit', () => receiver.receive(revoked), 0)).code, 'RECEIVER_NOT_COMMITTED');

  const valid = 4;
  assert.equal(effects.size, valid, 'exactly one effect per valid commit');
  return {effect_system_calls:attempts, classification:'AMOS lab verification; receiver in-process; harmless draft ledger', receiver_under_test:createReceiver === createCommitReceiver ? 'reference receiver (receiver.mjs)' : 'caller-supplied receiver', customer_receiver_tested:true, valid_commits:valid, effects_performed:effects.size, scenarios:results, passed:true};
}
