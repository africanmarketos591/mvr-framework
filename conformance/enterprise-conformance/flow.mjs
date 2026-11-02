// Enterprise conformance realm, end to end (one positive exact capability, every boundary). One implementation for the
// in-process CI test and the live runner; the caller supplies transports.
//   conformance(body, {key})   POST /v1/authority-conformance (key: 'enterprise' | 'standard' | null)
//   get(path)                  GET a public path (feed, trust roots, keys)
//   effectDecision(body, key)  POST /v1/effect-decision with a licensed key ('enterprise' | 'other_tenant')
// Proprietary lab fixtures only: one harmless draft record in the amos-lab system, amount 0, no external contact.
import assert from 'node:assert/strict';
import {createLabCommitSource} from '../receiver-kit/lab-commits.mjs';
import {createFeedSubscriber} from '../receiver-kit/feed-subscriber.mjs';
import {createBuyerExecutor, memoryClaimStore} from '../../sdks/javascript/buyer-executor-verifier.mjs';
import {publicKeyOf} from '../../sdks/javascript/trust-chain-verifier.mjs';
export const ENTERPRISE_REALM = 'amos-enterprise-conformance';

export async function runEnterpriseConformanceFlow({conformance, get, effectDecision, fetchImpl, base, today = new Date().toISOString().slice(0, 10), pinnedEnterpriseRoot = null, pinnedLabRoot = null, checkQuota = false}) {
  const checks = [];
  const check = async (name, fn) => { try { const detail = await fn(); checks.push({name, passed: true, ...(detail === undefined ? {} : {detail})}); } catch (error) { checks.push({name, passed: false, error: String(error?.message || error).slice(0, 400)}); } };
  const issueBody = {action: 'issue', synthetic_only: true, acknowledge_no_identity_verification: true, realm: 'enterprise_conformance'};
  await check('the Enterprise realm is refused without a licensed key', async () => { const r = await conformance(issueBody, {key: null}); assert.equal(r.http_status, 401); assert.equal(r.code, 'AUTHORITY_CONFORMANCE_ENTERPRISE_KEY_REQUIRED'); });
  // Trust roots: the Enterprise realm has its own root, distinct from the lab root.
  const entRoot = await get('/.well-known/mvr-conformance-trust-root.json'), labRoot = await get('/.well-known/mvr-lab-trust-root.json');
  const enterpriseRoot = pinnedEnterpriseRoot ?? entRoot.trust_root, labPinned = pinnedLabRoot ?? labRoot.trust_root;
  await check('the Enterprise realm has its own trust root', async () => {
    assert.equal(entRoot.trust_root.realm, ENTERPRISE_REALM); assert.match(entRoot.trust_root.key_id, /^AMOSCONFROOT-/); assert.notEqual(entRoot.trust_root.key_id, labRoot.trust_root.key_id);
    assert.equal(entRoot.trust_root.assurance, 'tenant_conformance'); if (pinnedEnterpriseRoot) assert.equal(entRoot.trust_root.key_id, pinnedEnterpriseRoot.key_id, 'served root equals the pinned root');
    return {root_key_id: entRoot.trust_root.key_id, pinned_from: pinnedEnterpriseRoot ? 'public repository' : 'served root'};
  });
  // Session and positive capability in the Enterprise realm.
  const source = await createLabCommitSource(body => conformance(body, {key: 'enterprise'}), {realm: 'enterprise_conformance'});
  const statement = source.trust_chain.registry_statement;
  await check('the session is bound to the tenant and asserts no standing', async () => {
    assert.equal(statement.realm, ENTERPRISE_REALM); assert.equal(statement.assurance_level, 'tenant_conformance'); assert.equal(statement.recognized_standing, 'none'); assert.equal(statement.production_authority, false);
    assert.match(statement.licensed_tenant_ref, /^[a-f0-9]{64}$/); assert.equal(source.realm, ENTERPRISE_REALM);
    return {session_id: source.session_id, registry_id: statement.registry_id};
  });
  const registryKey = publicKeyOf(statement.keys[0]);
  const effect = {...source.effect, effect_id: 'conf-' + Date.now().toString(36)};
  const decisionBody = (effectType, conformance_session_id = source.session_id) => ({analysis_date: today, market_scope: {country: 'UG'}, subject: {entity_name: 'AMOS Lab Receiver Venture'},
    claims: [{claim_id: 'C1', claim: 'The lab draft record request is in scope for the conformance case.', support_links: [{evidence_id: 'E1', relationship: 'direct_support', locator: 'claim'}]}],
    evidence_pack: [{evidence_id: 'E1', claim: 'The conformance case was opened on ' + today + ' to create one harmless lab draft record.', source_class: 'administrative_record', evidence_geography: {country: 'UG'}, source_date: today}],
    requested_effects: [{effect_id: 'CONF-DRAFT', effect_type: effectType, authority_ref: {case_id: source.case_id, requested_effect: {...effect, effect_type: effectType}, conformance_session_id}}]});
  for (const form of ['create_draft_record', 'amos.document.draft.create@1']) await check(`positive exact capability (${form}): analysis favorable, authority and execution authorized, scoped to the conformance realm`, async () => {
    const r = await effectDecision(decisionBody(form), 'enterprise');
    const e = r.effects?.[0];
    assert.ok(e, JSON.stringify(r).slice(0, 400));
    assert.deepEqual([e.analytical_evidence_status, e.institutional_authority_status, e.execution_authorization_status], ['favorable', 'authorized', 'authorized'], JSON.stringify({rule: e.precedence_rule, a: e.authority_reason_codes, x: e.execution_reason_codes}));
    assert.equal(e.canonical_action_id, 'amos.document.draft.create@1'); assert.equal(e.authority_basis.realm, ENTERPRISE_REALM); assert.equal(e.authority_basis.production_authority, false); assert.equal(e.authority_basis.recognized_standing, 'none');
    assert.equal(e.execution_scope.production_authority, false);
    return {canonical_action_id: e.canonical_action_id, tier: e.authority_basis.tier, risk_class: e.authority_basis.risk_class};
  });
  await check('another tenant cannot reference the session', async () => {
    const r = await effectDecision(decisionBody('create_draft_record'), 'other_tenant');
    const e = r.effects?.[0]; assert.ok(e, JSON.stringify(r).slice(0, 300));
    assert.equal(e.execution_authorization_status, 'not_authorized'); assert.ok(e.authority_reason_codes.includes('CONFORMANCE_SESSION_NOT_THIS_TENANT'), JSON.stringify(e.authority_reason_codes));
  });
  const lab = await conformance({action: 'issue', synthetic_only: true, acknowledge_no_identity_verification: true}, {key: null});
  await check('a keyless lab session never authorizes a licensed effect decision', async () => {
    assert.equal(lab.http_status, 201, JSON.stringify(lab).slice(0, 200));
    const r = await effectDecision(decisionBody('create_draft_record', lab.session_id), 'enterprise');
    const e = r.effects[0]; assert.equal(e.execution_authorization_status, 'not_authorized'); assert.ok(e.authority_reason_codes.includes('CONFORMANCE_SESSION_NOT_THIS_TENANT'));
  });
  // Exact-once commit at a buyer-owned adapter that pins the Enterprise root.
  const feed = createFeedSubscriber({base, sessionId: source.session_id, registryKey, fetchImpl});
  await feed.poll();
  const performed = [];
  const buyer = (pinned, expect) => createBuyerExecutor({pinnedRoot: pinned, expect, action: 'amos.document.draft.create@1', store: memoryClaimStore(), feed,
    performEffect: async (e, {commit_id}) => { performed.push({commit_id, effect_id: e.effect_id}); return {draft_id: 'LAB-DRAFT-' + performed.length}; }, reconcile: async () => ({exists: false})});
  const adapter = buyer(enterpriseRoot, {realm: ENTERPRISE_REALM});
  const committed = await source.commitFresh();
  await check('the buyer adapter performs the committed effect exactly once', async () => {
    await feed.poll();
    const cs = await source.current_state();
    const first = await adapter.commit({receipt: committed.receipt, requested_effect: committed.requested_effect, registry_statement: statement, current_state: cs});
    assert.equal(first.performed, true, JSON.stringify(first));
    const second = await adapter.commit({receipt: committed.receipt, requested_effect: committed.requested_effect, registry_statement: statement, current_state: await source.current_state()});
    assert.equal(second.performed, false); assert.equal(second.already_performed, true); assert.equal(performed.length, 1);
    return {commit_id: first.commit_id, risk_class: cs.risk_class, feed_sequence: cs.feed_sequence};
  });
  await check('a production-pinned or lab-pinned receiver refuses the conformance commit', async () => {
    const fresh = await source.commitFresh(), cs = await source.current_state();
    const prod = await buyer(enterpriseRoot, {realm: 'amos-production'}).commit({receipt: fresh.receipt, requested_effect: fresh.requested_effect, registry_statement: statement, current_state: cs});
    assert.equal(prod.code, 'BUYER_CHAIN_INVALID');
    const labPinnedBuyer = await buyer(labPinned, {realm: 'amos-lab'}).commit({receipt: fresh.receipt, requested_effect: fresh.requested_effect, registry_statement: statement, current_state: cs});
    assert.equal(labPinnedBuyer.code, 'BUYER_CHAIN_INVALID'); assert.equal(performed.length, 1);
    return {production: prod.detail, lab: labPinnedBuyer.detail};
  });
  // Revocation reaches a connected receiver through the feed, and the receiver then refuses.
  const pending = await source.commitFresh(), proofBefore = await source.current_state();
  await check('a revocation reaches the connected subscriber by long poll, and the adapter refuses', async () => {
    const started = Date.now();
    const following = feed.follow({deadlineMs: Date.now() + 25000, stop: () => feed.state.revoked_capabilities.has(proofBefore.capability_id), wait: 10});
    await new Promise(r => setTimeout(r, 1500));
    await source.revoke_current('Conformance: revoke while the receiver is connected');
    await following;
    assert.ok(feed.state.revoked_capabilities.has(proofBefore.capability_id), 'revocation entry received');
    const latency = (Date.now() - started) / 1000;
    const r = await adapter.commit({receipt: pending.receipt, requested_effect: pending.requested_effect, registry_statement: statement, current_state: proofBefore});
    assert.equal(r.performed, false); assert.equal(r.code, 'BUYER_CAPABILITY_REVOKED_IN_FEED', JSON.stringify(r)); assert.equal(performed.length, 1);
    return {seconds_until_received: Math.round(latency * 10) / 10, polls: feed.state.polls};
  });
  await check('a receiver offline longer than its risk class allows applies zero effects', async () => {
    await source.register_capability();
    await feed.poll();
    const fresh = await source.commitFresh(), cs = await source.current_state();
    const offline = createBuyerExecutor({pinnedRoot: enterpriseRoot, expect: {realm: ENTERPRISE_REALM}, action: 'amos.document.draft.create@1', store: memoryClaimStore(), feed: {...feed, fresh: o => feed.fresh(o)}, now: () => Date.now() + 120000,
      performEffect: async () => { performed.push('offline'); }, reconcile: async () => ({exists: false})});
    const r = await offline.commit({receipt: fresh.receipt, requested_effect: fresh.requested_effect, registry_statement: statement, current_state: cs});
    assert.equal(r.performed, false); assert.ok(['BUYER_CHAIN_INVALID', 'BUYER_FEED_NOT_FRESH'].includes(r.code), r.code); assert.equal(performed.length, 1);
    return {code: r.code, detail: r.detail ?? null};
  });
  await check('closing the session stops every later reference', async () => {
    const closed = await source.close();
    assert.equal(closed.status, 'closed');
    await feed.poll();
    assert.equal(feed.state.session_closed, true);
    const r = await effectDecision(decisionBody('create_draft_record'), 'enterprise');
    assert.equal(r.effects[0].execution_authorization_status, 'not_authorized'); assert.ok(r.effects[0].authority_reason_codes.some(c => /CONFORMANCE_SESSION_(CLOSED|UNAVAILABLE)/.test(c)), JSON.stringify(r.effects[0].authority_reason_codes));
    return {feed_last_sequence: feed.state.last_sequence};
  });
  await check('the feed is hash-chained and signed end to end', async () => {
    const body = await get('/v1/authority-conformance/feed?session_id=' + source.session_id + '&after=0');
    const verifier = createFeedSubscriber({base, sessionId: source.session_id, registryKey, fetchImpl});
    await verifier.apply(body);
    assert.equal(verifier.state.last_sequence, feed.state.last_sequence);
    return {entries: body.entries.length, actions: [...new Set(body.entries.map(e => e.action))]};
  });
  if (lab.session_id) await conformance({action: 'close', session_id: lab.session_id, session_token: lab.credentials.institution.session_token}, {key: null});
  if (checkQuota) await check('the Enterprise realm quota is per licensed tenant', async () => {
    const answers = [];
    for (let i = 0; i < 12; i++) { const r = await conformance(issueBody, {key: 'enterprise'}); answers.push(r.http_status); if (r.http_status === 429) { assert.equal(r.quota.scope, 'per_licensed_tenant_per_utc_hour'); break; } }
    assert.ok(answers.includes(429), JSON.stringify(answers));
    return {statuses: answers};
  });
  return {passed: checks.every(c => c.passed), checks, session_id: source.session_id, realm: ENTERPRISE_REALM, effects_performed: performed.length};
}
