#!/usr/bin/env node
// Buyer-executor conformance suite (offline). A local issuer mints a root, a registry statement, commit receipts,
// current-state proofs and a feed in the published formats (mvr.trust-root/1, mvr.authority-registry-statement/1,
// MVR-RECEIPT-SIG-V1 effect_commit receipts, mvr.current-state-proof/1, mvr.current-state-feed/1). A buyer adapter that
// embeds sdks/javascript/buyer-executor-verifier.mjs must perform exactly the positive cases once and refuse every
// negative case with zero effects. Proprietary lab fixtures only; no network.
//   node conformance/buyer-executor/negative-suite.mjs [--output result.json]
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {generateSigningKey, publicKeyOf, signStatement, trustRootBody, canonical, sha256} from '../../sdks/javascript/trust-chain-verifier.mjs';
import {canonicalJson} from '../../sdks/javascript/authority-receipts.mjs';
import {createBuyerExecutor, memoryClaimStore} from '../../sdks/javascript/buyer-executor-verifier.mjs';
import {createFeedSubscriber} from '../receiver-kit/feed-subscriber.mjs';

const REALM = 'amos-enterprise-conformance';
const POLICY = {version: 'mvr.offline-policy/1', risk_classes: {low: {max_offline_age_seconds: 300}, standard: {max_offline_age_seconds: 60}, high: {max_offline_age_seconds: 5}}};
const b64 = buf => Buffer.from(buf).toString('base64');
async function signReceipt(key, body) {
  const digest = await sha256(canonicalJson(body));
  const pk = await crypto.subtle.importKey('pkcs8', Buffer.from(key.private_pkcs8_b64, 'base64'), {name: 'Ed25519'}, false, ['sign']);
  return {...body, sha256: digest, signature: {status: 'signed', standard: 'MVR-RECEIPT-SIG-V1', algorithm: 'Ed25519', key_id: key.key_id, signature_b64: b64(await crypto.subtle.sign('Ed25519', pk, new TextEncoder().encode(`MVR-RECEIPT-V1\n${key.key_id}\n${digest}`)))}};
}
const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');

async function issuer({realm = REALM} = {}) {
  const root = await generateSigningKey('AMOSCONFROOT'), session = await generateSigningKey('LAB-AC');
  const sessionKey = {...session, status: 'active', lab_fixture: true};
  const trustRoot = await signStatement(root, trustRootBody(root, {realm, created_at: new Date().toISOString(), organization_ref: 'amos-enterprise-conformance', assurance: 'tenant_conformance'}));
  const id = 'AC-' + hex(16);
  const registry = await signStatement(root, {contract_version: 'mvr.authority-registry-statement/1', registry_id: 'REG-' + id, registry_version: 1, realm, organization_ref: 'tenant:0000000000000000', assurance_level: 'tenant_conformance', recognized_standing: 'none',
    tenant_id: 'authority-conformance', workspace_id: id, session_id: id, keys: [{...publicKeyOf(sessionKey), not_before: new Date(Date.now() - 1000).toISOString(), not_after: new Date(Date.now() + 3600e3).toISOString()}],
    issued_at: new Date().toISOString(), expires_at: new Date(Date.now() + 3600e3).toISOString(), production_authority: false});
  const feed = {entries: [], last_sequence: 0, head_sha256: null};
  const append = async (action, extra = {}) => {
    const body = {sequence: feed.last_sequence + 1, prev_entry_sha256: feed.head_sha256, at: new Date().toISOString(), action, kind: extra.kind ?? 'capability', id: extra.id ?? null, event: extra.event ?? null, receipt_sha256: null, receivers_must_reverify: /^revoke_|^close_session$/.test(action)};
    const entry_sha256 = await sha256(canonical(body));
    feed.entries.push({...body, entry_sha256}); feed.last_sequence = body.sequence; feed.head_sha256 = entry_sha256;
  };
  const head = async ({observedAt = Date.now(), status = 'active'} = {}) => ({status: 'ok', head: await signStatement(sessionKey, {contract_version: 'mvr.current-state-feed/1', session_id: id, registry_id: 'REG-' + id, realm, session_status: status,
    last_sequence: feed.last_sequence, head_sha256: feed.head_sha256, observed_at: new Date(observedAt).toISOString(), offline_policy: POLICY}), entries: structuredClone(feed.entries)});
  const proof = async ({capability = 'CAP-1', permitted = true, observedAt = Date.now(), risk = 'standard', key = sessionKey} = {}) => signStatement(key, {contract_version: 'mvr.current-state-proof/1', session_id: id, registry_id: 'REG-' + id, registry_version: 1,
    capability_id: capability, realm, risk_class: risk, feed_sequence: feed.last_sequence, feed_head_sha256: feed.head_sha256, observed_at: new Date(observedAt).toISOString(), sequence: 1, max_offline_age_seconds: POLICY.risk_classes[risk].max_offline_age_seconds,
    states: {session: 'active', key: 'active', capability: permitted ? 'active' : 'revoked', currently_valid: permitted}, heads: {capability_document_sha256: 'a'.repeat(64)}, permitted, blocking_reasons: permitted ? [] : ['CAPABILITY_REVOKED']});
  const effect = (extra = {}) => ({effect_id: 'effect-' + hex(4), effect_type: 'amos.document.draft.create@1', resource: {system: 'amos-lab', resource_type: 'draft', resource_id: 'LAB-BUYER'}, amount_minor: 0, currency: 'UGX', external_contact: false, counterparty_ref: 'lab-only', ...extra});
  const receipt = async (requested, {decision = 'commit', validFor = 120e3, executor = 'e'.repeat(64), capability = 'CAP-1', key = sessionKey, kind = 'effect_commit'} = {}) => signReceipt(key, {kind, decision, commit_id: 'CM-' + hex(24), capability_id: capability, effect_id: requested.effect_id,
    requested_effect_sha256: await sha256(canonicalJson(requested)), executor_principal_sha256: executor, commit_valid_until: new Date(Date.now() + validFor).toISOString(), sequence: 1, prev_sha256: '0'.repeat(64), recorded_at: new Date().toISOString(), lab_session_id: id});
  await append('register_capability', {id: 'CAP-1', event: 'registered'});
  return {root, trustRoot, sessionKey, registry, id, feed, append, head, proof, effect, receipt};
}
async function buyer(iss, {feedBody, action = 'amos.document.draft.create@1', expect = {realm: REALM}, pinned = iss.trustRoot, executor = 'e'.repeat(64)} = {}) {
  const effects = [];
  const subscriber = createFeedSubscriber({sessionId: iss.id, registryKey: publicKeyOf(iss.sessionKey), fetchImpl: async () => { throw new Error('offline suite'); }});
  if (feedBody !== null) await subscriber.apply(feedBody ?? await iss.head());
  const executorFn = createBuyerExecutor({pinnedRoot: pinned, expect, action, executorPrincipalSha256: executor, store: memoryClaimStore(), performEffect: async (e, {commit_id}) => { effects.push({commit_id, effect_id: e.effect_id}); return {ok: true}; }, reconcile: async () => ({exists: false}), feed: feedBody === null ? null : subscriber});
  return {executorFn, effects, subscriber};
}

const results = [];
const test = async (name, expectation, fn) => {
  try { const detail = await fn(); results.push({name, expectation, passed: true, ...(detail ? {detail} : {})}); }
  catch (error) { results.push({name, expectation, passed: false, error: String(error?.message || error).slice(0, 300)}); }
};
const refusedWith = (r, code, effects) => { assert.equal(r.performed, false, JSON.stringify(r)); assert.equal(r.code, code, JSON.stringify({code: r.code, detail: r.detail})); assert.equal(effects.length, 0); return {code: r.code, detail: r.detail ?? null}; };

await test('canonical action: the committed effect is performed exactly once', 'perform', async () => {
  const iss = await issuer(); const {executorFn, effects} = await buyer(iss); const e = iss.effect(); const rc = await iss.receipt(e);
  const r = await executorFn.commit({receipt: rc, requested_effect: e, registry_statement: iss.registry, current_state: await iss.proof()});
  assert.equal(r.performed, true, JSON.stringify(r)); assert.equal(effects.length, 1);
  const again = await executorFn.commit({receipt: rc, requested_effect: e, registry_statement: iss.registry, current_state: await iss.proof()});
  assert.equal(again.performed, false); assert.equal(again.already_performed, true); assert.equal(effects.length, 1);
  return {replay: 'already_performed'};
});
await test('alias parity: an adapter registered as create_draft_record performs the canonical amos.document.draft.create@1 commit', 'perform', async () => {
  const iss = await issuer(); const {executorFn, effects} = await buyer(iss, {action: 'create_draft_record'}); const e = iss.effect(); const rc = await iss.receipt(e);
  const r = await executorFn.commit({receipt: rc, requested_effect: e, registry_statement: iss.registry, current_state: await iss.proof()});
  assert.equal(r.performed, true, JSON.stringify(r)); assert.equal(effects.length, 1);
});
const N = [
  ['a root the buyer did not pin', 'BUYER_CHAIN_INVALID', async iss => ({pinned: (await issuer()).trustRoot})],
  ['a registry statement signed by another root', 'BUYER_CHAIN_INVALID', async iss => ({registry: (await issuer()).registry})],
  ['a production receiver refuses the conformance realm', 'BUYER_CHAIN_INVALID', async () => ({expect: {realm: 'amos-production'}})],
  ['a tampered registry statement', 'BUYER_CHAIN_INVALID', async iss => ({registry: {...iss.registry, tenant_id: 'another-tenant'}})],
  ['a receipt signed by a key outside the registry', 'BUYER_CHAIN_INVALID', async iss => ({receiptOpts: {key: {...(await generateSigningKey('LAB-AC')), status: 'active', lab_fixture: true}}})],
  ['a receipt whose fields were altered after signing', 'BUYER_CHAIN_INVALID', async () => ({mutateReceipt: r => ({...r, commit_valid_until: new Date(Date.now() + 864e5).toISOString()})})],
  ['a receipt that is not a commit', 'BUYER_NOT_A_COMMIT', async () => ({receiptOpts: {decision: 'deny'}})],
  ['a different amount than committed', 'BUYER_EFFECT_MISMATCH', async () => ({mutateEffect: e => ({...e, amount_minor: 5000})})],
  ['a different effect id than committed', 'BUYER_EFFECT_MISMATCH', async () => ({mutateEffect: e => ({...e, effect_id: 'other-effect'})})],
  ['an expired commit window', 'BUYER_COMMIT_EXPIRED', async () => ({receiptOpts: {validFor: -60e3}})],
  ['another executor', 'BUYER_EXECUTOR_MISMATCH', async () => ({receiptOpts: {executor: 'f'.repeat(64)}})],
  ['a current-state proof older than the risk class allows', 'BUYER_CHAIN_INVALID', async () => ({proofOpts: {observedAt: Date.now() - 120e3}})],
  ['a current-state proof that does not permit', 'BUYER_CHAIN_INVALID', async () => ({proofOpts: {permitted: false}})],
  ['a current-state proof for another capability', 'BUYER_CAPABILITY_MISMATCH', async () => ({proofOpts: {capability: 'CAP-2'}})],
  ['a current-state proof signed by a key outside the registry', 'BUYER_CHAIN_INVALID', async () => ({proofOpts: {key: {...(await generateSigningKey('LAB-AC')), status: 'active'}}})],
  ['a high-risk effect on a proof older than 5 seconds', 'BUYER_CHAIN_INVALID', async () => ({proofOpts: {risk: 'high', observedAt: Date.now() - 20e3}})],
  ['a receiver offline longer than the offline policy', 'BUYER_FEED_NOT_FRESH', async iss => ({feedBody: await iss.head({observedAt: Date.now() - 120e3})})],
  ['no feed subscriber at all', 'BUYER_FEED_NOT_FRESH', async () => ({feedBody: null})],
  ['the feed revokes the capability after the proof', 'BUYER_CAPABILITY_REVOKED_IN_FEED', async iss => { const p = await iss.proof(); await iss.append('revoke_capability', {id: 'CAP-1', event: 'revoked'}); return {proof: p, feedBody: await iss.head()}; }],
  ['the feed shows the session closed', 'BUYER_SESSION_CLOSED', async iss => { const p = await iss.proof(); await iss.append('close_session', {kind: 'session', id: iss.id, event: 'closed'}); return {proof: p, feedBody: await iss.head({status: 'revoked'})}; }],
  ['the proof is ahead of the feed the receiver holds', 'BUYER_FEED_BEHIND_PROOF', async iss => { const old = await iss.head(); await iss.append('register_capability', {id: 'CAP-9', event: 'registered'}); return {feedBody: old, proof: await iss.proof()}; }],
  ['an adapter that performs a different action', 'BUYER_ACTION_NOT_SUPPORTED', async () => ({action: 'amos.finance.payment.initiate@1'})]
];
for (const [name, code, setup] of N) await test('refuses ' + name, code, async () => {
  const iss = await issuer(); const s = await setup(iss);
  const {executorFn, effects} = await buyer(iss, {feedBody: s.feedBody, action: s.action, expect: s.expect, pinned: s.pinned});
  let e = iss.effect(); const rc0 = await iss.receipt(e, s.receiptOpts || {});
  const rc = s.mutateReceipt ? s.mutateReceipt(rc0) : rc0;
  if (s.mutateEffect) e = s.mutateEffect(e);
  const r = await executorFn.commit({receipt: rc, requested_effect: e, registry_statement: s.registry ?? iss.registry, current_state: s.proof ?? await iss.proof(s.proofOpts || {})});
  return refusedWith(r, code, effects);
});
// Feed integrity: the subscriber itself refuses a broken chain, a gap or a regression.
for (const [name, mutate, code] of [
  ['a tampered feed entry', b => { b.entries[0].id = 'CAP-X'; return b; }, 'FEED_ENTRY_HASH_MISMATCH'],
  ['a feed with a missing entry', b => { b.entries.splice(0, 1); return b; }, 'FEED_GAP'],
  ['a feed head signed by another key', async (b, iss) => ({...b, head: await signStatement(await generateSigningKey('LAB-AC'), (({sha256: _s, signature: _g, ...rest}) => rest)(b.head))}), 'FEED_HEAD_INVALID']
]) await test('subscriber refuses ' + name, code, async () => {
  const iss = await issuer(); await iss.append('register_capability', {id: 'CAP-2', event: 'registered'});
  const sub = createFeedSubscriber({sessionId: iss.id, registryKey: publicKeyOf(iss.sessionKey), fetchImpl: async () => { throw new Error('offline'); }});
  const body = await mutate(await iss.head(), iss);
  await assert.rejects(() => sub.apply(body), e => String(e.code).startsWith(code));
  return {code};
});
await test('subscriber refuses a sequence regression (an older feed replayed)', 'FEED_SEQUENCE_REGRESSED', async () => {
  const iss = await issuer(); const old = await iss.head(); await iss.append('revoke_capability', {id: 'CAP-1', event: 'revoked'});
  const sub = createFeedSubscriber({sessionId: iss.id, registryKey: publicKeyOf(iss.sessionKey), fetchImpl: async () => { throw new Error('offline'); }});
  await sub.apply(await iss.head());
  await assert.rejects(() => sub.apply(old), e => e.code === 'FEED_SEQUENCE_REGRESSED');
});
const passed = results.every(r => r.passed);
const out = {suite: 'amos.buyer-executor/1 negative conformance', classification: 'proprietary lab fixtures; offline; no network', passed, total: results.length, failed: results.filter(r => !r.passed).length,
  positives: results.filter(r => r.expectation === 'perform').length, refusals: results.filter(r => r.expectation !== 'perform').length, results};
const at = process.argv.indexOf('--output');
if (at > 0) fs.writeFileSync(process.argv[at + 1], JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({passed, total: out.total, failed: out.failed}));
for (const r of results.filter(r => !r.passed)) console.log('FAIL', r.name, r.error);
process.exitCode = passed ? 0 : 1;
