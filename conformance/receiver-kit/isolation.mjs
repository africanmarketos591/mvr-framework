// Receiver isolation run (mvr.receiver-isolation/1). One Enterprise conformance session, one store, and one scenario per refusal
// mechanism, so a refusal can be attributed to the rule under test: valid delivery, revoked capability, expired commit, stale lease
// with an otherwise deliverable commit, and signed registry succession. The observer packet it writes can be checked offline with
// observer-verify.mjs, without the operator's database.
//   MVR_API_KEY=... node conformance/receiver-kit/isolation.mjs --out receiver-isolation
// Proprietary lab fixtures. One harmless draft row per performed scenario, in a local SQLite file. No external effect.
import fs from 'node:fs';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {setTimeout as pause} from 'node:timers/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createLabCommitSource} from './lab-commits.mjs';
import {createFeedSubscriber} from './feed-subscriber.mjs';
import {createBuyerExecutor, memoryClaimStore} from '../../sdks/javascript/buyer-executor-verifier.mjs';
import {canonicalJson} from '../../sdks/javascript/authority-receipts.mjs';
import {publicKeyOf} from '../../sdks/javascript/trust-chain-verifier.mjs';

export const RECEIVER_ISOLATION_VERSION = 'mvr.receiver-isolation/1';
export const OBSERVER_PACKET_VERSION = 'mvr.observer-packet/1';
const here = path.dirname(fileURLToPath(import.meta.url));
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : canonicalJson(v)).digest('hex');
const must = (ok, message) => { if (!ok) throw new Error(message); };

export async function runReceiverIsolation({base = 'https://africanmarketos.com', key, fetchImpl = fetch, pinnedRoot, skipLeaseWait = false, dbPath = ':memory:', log = () => {}} = {}) {
  must(key, 'an Enterprise key is required');
  const today = new Date().toISOString().slice(0, 10), sourceText = `The conformance case was opened on ${today} to create one harmless lab draft record.`;
  const claimText = 'The lab draft record request is in scope for the conformance case.';
  const post = async (route, payload, profile = 'full_advisory') => { const r = await fetchImpl(base + route, {method: 'POST', headers: {'Content-Type': 'application/json', 'X-API-Key': key, 'X-Response-Profile': profile, 'User-Agent': 'amos-receiver-isolation'}, body: JSON.stringify(payload)}); return {status: r.status, manifest: r.headers.get('X-MVR-Release-Manifest'), body: await r.json()}; };
  const mcp = async (name, args) => { const r = await post('/mcp/runtime', {jsonrpc: '2.0', id: randomUUID(), method: 'tools/call', params: {name, arguments: args}}); return r.body.result ?? {isError: true, structuredContent: r.body.error}; };
  const db = new DatabaseSync(dbPath); db.exec('CREATE TABLE draft(scenario TEXT NOT NULL, commit_id TEXT PRIMARY KEY, effect_id TEXT NOT NULL, applied_at TEXT NOT NULL)');
  const count = scenario => db.prepare('SELECT count(*) AS n FROM draft WHERE scenario=?').get(scenario).n;
  const packet = {contract_version: OBSERVER_PACKET_VERSION, classification: 'proprietary lab fixtures; AMOS-operated or evaluator-operated receiver, not buyer-owned production', production_authority: false, started_at: new Date().toISOString(), feed_log: [], operations: [], scenarios: {}};
  let institutionToken = null, sessionId = null, watchVerification = false, closed = false, leaseOffset = 0, source;
  const transport = async body => {
    if (watchVerification && body.request?.action === 'verify_capability') { watchVerification = false; await bindDecision(body.request.requested_effect); }
    const r = await post('/v1/authority-conformance', body), j = {...r.body, http_status: r.body.http_status ?? r.status};
    if (body.action === 'issue') { institutionToken = j.credentials?.institution?.session_token; sessionId = j.session_id; }
    if (body.request && ['verify_capability', 'commit_effect', 'register_capability', 'revoke_capability'].includes(body.request.action)) packet.operations.push({action: body.request.action, capability_id: body.request.capability_id ?? null, effect_id: body.request.effect_id ?? body.request.requested_effect?.effect_id ?? null, verification_id: j.verification_id ?? body.request.verification_id ?? null, decision: j.decision ?? null, receipt: j.receipt ?? null});
    return j;
  };
  // The evidence basis and the accountable disposition are bound to the exact effect before the capability is used.
  async function bindDecision(effect) {
    const position = await source.check_permission(effect), binding = position.permission_position?.exact_effect_binding?.sha256;
    must(/^[a-f0-9]{64}$/.test(binding ?? ''), 'no exact effect binding');
    const record = {id: 'E1', evidence_id: 'E1', claim: sourceText, load_bearing: true, source_doc_id: 'LAB-DOC-1', source_hash: sha(sourceText), source_class: 'administrative_record', evidence_type: 'public_filing', evidence_origin: 'public_osint', collection_method: 'direct', stakeholder_class: 'guardian', source_grade: 'A', freshness_date: today, source_date: today, geography: 'UG', evidence_geography: {country: 'UG'}, public_metric_registry: 'fintech_lending', public_metrics: {regulatory_authorization_status: true}, privacy_envelope: {safe_for_modeling: true}};
    const claim = {claim_id: 'C1', claim: claimText, support_links: [{claim_id: 'C1', evidence_id: 'E1', relationship: 'direct_support', locator: 'claim'}]};
    let step = await mcp('mvr_first_call', {company_name: 'AMOS Lab Receiver Venture', country: 'UG', entity_archetype: 'fintech_lending', decision_question: 'Should the lab distributor pilot a second retail wave?', claims: [claim], evidence_pack: [record]}), slot = null, tasks = null;
    for (let i = 0; i < 6 && step; i++) { const c = step.structuredContent ?? {}; if (c.interpretation_submission?.submission_token) { slot = c.interpretation_submission; tasks = c.claim_review.interpretation_tasks.items; break; } if (!c.mcp_next_call) break; step = await mcp(c.mcp_next_call.name, c.mcp_next_call.arguments); }
    must(slot && tasks?.length, 'no interpretation slot was issued');
    const read = await mcp('mvr_interpretation_submission', {action: 'submit', submission_token: slot.submission_token, schema_version: 'mvr.interpretation-submission/1', model: {provider: 'lab', model: 'receiver-isolation', model_version: '1'}, prompt_policy_sha256: '1'.repeat(64), readings: tasks.map(t => ({task_id: t.task_id, claim_sha256: t.claim_sha256, passage_sha256: t.passage_sha256, label: 'supports'}))});
    must(read.isError === false, 'reading refused');
    const task = tasks.find(t => t.claim_id === 'C1'), disposed = await post('/v1/interpretation-submissions', {action: 'dispose', submission_id: slot.submission_id, task_id: task.task_id, disposition: 'accept', reason: 'Conformance: the passage states the scope of the lab case.', reviewer: {reviewer_id: 'conformance-reviewer-1', role_title: 'Conformance reviewer', independence: 'declared_independent'}});
    must(disposed.status === 200 && disposed.body.disposition_id, 'disposition refused ' + JSON.stringify(disposed.body).slice(0, 200));
    const request = {analysis_date: today, market_scope: {country: 'UG'}, subject: {entity_name: 'AMOS Lab Receiver Venture'}, interpretation_submission_id: slot.submission_id, claims: [{claim_id: 'C1', claim: claimText, support_links: [{evidence_id: 'E1', relationship: 'direct_support', locator: 'claim'}]}], evidence_pack: [{evidence_id: 'E1', claim: sourceText, source_doc_id: 'LAB-DOC-1', source_hash: sha(sourceText), source_class: 'administrative_record', evidence_geography: {country: 'UG'}, source_date: today}],
      requested_effects: [{effect_id: effect.effect_id, effect_type: effect.effect_type, resource: effect.resource, geography: {country: 'UG'}, amount: {amount_minor: effect.amount_minor, currency: effect.currency}, counterparty_ref: effect.counterparty_ref, external_contact: effect.external_contact, authority_binding_sha256: binding, authority_ref: {case_id: source.case_id, geography: 'UG', requested_effect: effect, conformance_session_id: source.session_id}}]};
    const decided = await post('/v1/effect-decision', request), e = decided.body.effects?.[0];
    must(decided.status === 200 && e?.execution_authorization_status === 'authorized', 'effect not authorized ' + JSON.stringify(e?.execution_reason_codes ?? decided.body).slice(0, 200));
    packet.release_manifest_id = decided.manifest;
    packet.evidence_basis = {claim_id: 'C1', claim_sha256: sha(claimText), claim: claimText, records: request.evidence_pack.map(r => ({evidence_id: r.evidence_id, record_sha256: sha(r), record: r})), source_sha256: sha(sourceText)};
    packet.disposition = {disposition_id: disposed.body.disposition_id, disposition_sha256: disposed.body.disposition_sha256, submission_id: slot.submission_id, task_id: task.task_id, claim_sha256: task.claim_sha256, passage_sha256: task.passage_sha256, disposition: 'accept', receipt: disposed.body.disposition_receipt};
    packet.effect = {requested_effect: effect, requested_effect_sha256: sha(effect), effect_id: effect.effect_id, effect_sha256: e.effect_sha256, normative_sha256: e.normative_sha256, authority_binding_sha256: binding, disposition_ids: e.claims.flatMap(c => c.disposition_ids ?? []), applied_dispositions: decided.body.dispositions?.applied ?? [], verification_ledger: decided.body.verification_ledger ?? null, analytical_evidence_status: e.analytical_evidence_status, execution_authorization_status: e.execution_authorization_status};
  }
  const report = {contract_version: RECEIVER_ISOLATION_VERSION, scenarios: {}, buyer_operated: false};
  try {
    pinnedRoot ??= JSON.parse(fs.readFileSync(path.join(here, '..', '..', 'trust', 'amos-conformance-trust-root.json'), 'utf8')).trust_root;
    packet.pinned_root = pinnedRoot;
    source = await createLabCommitSource(transport, {realm: 'enterprise_conformance', sourceText});
    let statement = source.trust_chain.registry_statement;
    packet.session_id = source.session_id; packet.registry_statements = [statement];
    const recordFeed = async (...args) => { const r = await fetchImpl(...args); if (r.ok) packet.feed_log.push({batch: await r.clone().json()}); return r; };
    const feedOpts = {base, sessionId: source.session_id, pinnedRoot, registryId: statement.registry_id, registryKey: publicKeyOf(statement.keys[0])};
    const live = createFeedSubscriber({...feedOpts, fetchImpl: recordFeed});
    const receiver = (scenario, feed) => createBuyerExecutor({pinnedRoot, expect: {realm: 'amos-enterprise-conformance'}, action: 'amos.document.draft.create@1', store: memoryClaimStore(), feed, reconcile: async () => ({exists: false}), performEffect: async (e, {commit_id}) => { db.prepare('INSERT INTO draft VALUES(?,?,?,?)').run(scenario, commit_id, e.effect_id, new Date().toISOString()); return {draft_id: 'draft-' + commit_id.slice(-12)}; }});
    const deliver = (c, proof) => ({...c, registry_statement: statement, current_state: proof});
    const record = (name, row) => { packet.scenarios[name] = row; report.scenarios[name] = {...row, receipt: undefined, current_state: undefined}; log(name, row.observed_code ?? 'performed'); };

    await live.poll(); watchVerification = true;
    const valid = await source.commitFresh(); must(valid.requested_effect.effect_id === packet.effect.effect_id, 'decision and commit differ'); await live.poll();
    const validProof = await source.current_state(), first = await receiver('valid', live).commit(deliver(valid, validProof));
    record('valid', {rule: 'every check passes', expected: 'performed', performed: first.performed === true, observed_code: first.code ?? null, draft_count: count('valid'), receipt: valid.receipt, requested_effect: valid.requested_effect, current_state: validProof, registry_version: statement.registry_version});

    const pending = await source.commitFresh(); await live.poll(); const before = await source.current_state(), capability = before.capability_id;
    const watch = live.follow({deadlineMs: Date.now() + 24000, wait: 8, stop: () => live.state.revoked_capabilities.has(capability)}), t0 = performance.now();
    await source.revoke_current('Receiver isolation: revoke before delivery'); await watch;
    const revoked = await receiver('revoked', live).commit(deliver(pending, before));
    record('revoked', {rule: 'a signed revocation in the feed', expected: 'BUYER_CAPABILITY_REVOKED_IN_FEED', performed: revoked.performed === true, observed_code: revoked.code ?? null, draft_count: count('revoked'), revocation_observed_ms: Math.round(performance.now() - t0), commit_still_open: Date.parse(pending.receipt.commit_valid_until) > Date.now(), feed_fresh: live.fresh({riskClass: before.risk_class}).fresh, receipt: pending.receipt, requested_effect: pending.requested_effect, current_state: before, registry_version: statement.registry_version});
    await source.register_capability();

    const late = await source.commitFresh(), waitFor = Math.max(0, Date.parse(late.receipt.commit_valid_until) + 2500 - Date.now()); await pause(waitFor); await live.poll();
    const lateProof = await source.current_state(), expired = await receiver('expired', live).commit(deliver(late, lateProof));
    record('expired', {rule: 'the commit window has closed while feed and capability are current', expected: 'BUYER_COMMIT_EXPIRED', performed: expired.performed === true, observed_code: expired.code ?? null, draft_count: count('expired'), feed_fresh: live.fresh({riskClass: lateProof.risk_class}).fresh, capability_permitted: lateProof.permitted === true, receipt: late.receipt, requested_effect: late.requested_effect, current_state: lateProof, registry_version: statement.registry_version});

    let connected = true;
    const lease = createFeedSubscriber({...feedOpts, registryKey: publicKeyOf(statement.keys[0]), now: () => Date.now() + leaseOffset, fetchImpl: (...a) => { must(connected, 'receiver feed is disconnected'); return recordFeed(...a); }});
    await lease.poll(); const cursor = lease.state.last_sequence, risk = lateProof.risk_class, allowance = lease.state.offline_policy.risk_classes[risk].max_offline_age_seconds;
    connected = false;
    if (skipLeaseWait) leaseOffset = allowance * 1000 + 1100; else await pause(Math.max(0, lease.state.head_observed_at + allowance * 1000 + 1100 - Date.now()));
    const eligible = await source.commitFresh(), eligibleProof = await source.current_state(), leaseReceiver = receiver('lease_recovered', lease), stale = lease.fresh({riskClass: risk});
    const refused = await leaseReceiver.commit(deliver(eligible, eligibleProof)), atRefusal = {commit_open: Date.parse(eligible.receipt.commit_valid_until) > Date.now(), capability_permitted: eligibleProof.permitted === true, no_feed_advance: eligibleProof.feed_sequence === cursor, feed_reason: stale.reason ?? null, feed_age_seconds: stale.age_seconds ?? null, draft_count: count('lease_recovered')};
    connected = true; leaseOffset = 0; await lease.poll();
    let recoveredProof = eligibleProof, recovered = await leaseReceiver.commit(deliver(eligible, eligibleProof));
    if (!recovered.performed && Date.parse(eligible.receipt.commit_valid_until) > Date.now()) { recoveredProof = await source.current_state(); recovered = await leaseReceiver.commit(deliver(eligible, recoveredProof)); }
    const replay = await leaseReceiver.commit(deliver(eligible, recoveredProof));
    record('lease_recovered', {rule: 'only the offline lease has lapsed', expected: 'BUYER_FEED_NOT_FRESH then performed once after catch-up', performed: recovered.performed === true, observed_code: refused.code ?? null, at_refusal: atRefusal, replay_already_performed: replay.already_performed === true, draft_count: count('lease_recovered'), lease_seconds: allowance, lease_time: skipLeaseWait ? 'advanced_in_test_clock' : 'real_elapsed', receipt: eligible.receipt, requested_effect: eligible.requested_effect, current_state: recoveredProof, registry_version: statement.registry_version});

    const rotated = await transport({action: 'rotate_registry', session_id: sessionId, session_token: institutionToken});
    must(rotated.status === 'rotated', 'rotation refused ' + (rotated.code ?? rotated.status));
    const oldStatement = statement; await live.rotateRegistry(rotated.previous_registry_statement, rotated.registry_statement); packet.feed_log.push({rotate: {previous: rotated.previous_registry_statement, next: rotated.registry_statement}}); packet.registry_statements.push(rotated.previous_registry_statement, rotated.registry_statement); statement = rotated.registry_statement;
    await live.poll(); const after = await source.commitFresh(); await live.poll(); const afterProof = await source.current_state();
    const wrongRegistry = await receiver('rotated_old_registry', live).commit({...after, registry_statement: oldStatement, current_state: afterProof}), successor = await receiver('rotated', live).commit(deliver(after, afterProof));
    record('rotated', {rule: 'signed registry succession on a provisioned conformance issuer', expected: 'performed under the new key; the old registry refuses', performed: successor.performed === true, observed_code: successor.code ?? null, old_registry_code: wrongRegistry.code ?? null, old_registry_draft_count: count('rotated_old_registry'), draft_count: count('rotated'), registry_version: statement.registry_version, new_key_id: statement.keys[0].key_id, receipt: after.receipt, requested_effect: after.requested_effect, current_state: afterProof});

    const done = await source.close(); closed = done.status === 'closed'; await live.poll();
    packet.store_rows = db.prepare('SELECT scenario, commit_id, effect_id, applied_at FROM draft ORDER BY applied_at').all().map(r => ({...r}));
    packet.finished_at = new Date().toISOString(); report.session_closed = closed; report.store_rows = packet.store_rows.length;
    const raw = JSON.stringify(packet); must(!/mvr_eval_|PRIVATE KEY|"(?:session_token|reference_secret|private_pkcs8_b64)"\s*:/i.test(raw), 'packet contains secret-like content');
    return {packet, report};
  } finally { if (source && !closed) await source.close().catch(() => {}); db.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
  const out = arg('out') || 'receiver-isolation', key = process.env.MVR_API_KEY; fs.mkdirSync(out, {recursive: true});
  const {packet, report} = await runReceiverIsolation({base: arg('base') || undefined, key, dbPath: path.join(out, 'receiver-store.sqlite'), log: (a, b) => console.error(a, b)});
  fs.writeFileSync(path.join(out, 'observer-packet.json'), JSON.stringify(packet, null, 1) + '\n'); fs.writeFileSync(path.join(out, 'receiver-report.json'), JSON.stringify(report, null, 1) + '\n');
  const {verifyObserverPacket} = await import('./observer-verify.mjs'), verdict = await verifyObserverPacket(packet);
  fs.writeFileSync(path.join(out, 'observer-verification.json'), JSON.stringify(verdict, null, 1) + '\n'); console.log(JSON.stringify({passed: verdict.passed, failed: verdict.checks.filter(c => !c.passed).map(c => c.name), scenarios: Object.fromEntries(Object.entries(report.scenarios).map(([k, v]) => [k, {code: v.observed_code, performed: v.performed, drafts: v.draft_count}]))}));
  process.exitCode = verdict.passed ? 0 : 1;
}
