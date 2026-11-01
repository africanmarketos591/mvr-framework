#!/usr/bin/env node
// Live model-attributed passage lane: a licensed MCP workflow step issues tasks and a one-time submission slot; readings
// go to mvr_interpretation_submission (never into a continuation payload); every reading gets a stable code; replays and
// negatives fail for their own reason; conflicting readings are retained; a reviewer disposition changes only the effects
// that depend on that claim. Cross-tenant injection runs when MVR_API_KEY_2 (another tenant) is set; otherwise NOT RUN.
//   MVR_API_KEY=... [MVR_API_KEY_2=...] node conformance/interpretation-submission/run-live.mjs --out submission-live.json
import fs from 'node:fs';
const arg = name => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : null; };
const base = arg('base') || 'https://africanmarketos.com', out = arg('out'), key = process.env.MVR_API_KEY, key2 = process.env.MVR_API_KEY_2 || null;
if (!key || !out) { console.error('Set MVR_API_KEY and pass --out <file>.'); process.exit(2); }
const report = {suite: 'interpretation-submission-live', base, started_at: new Date().toISOString(), classification: 'proprietary lab fixtures', checks: [], failures: [], not_run: []};
const save = () => fs.writeFileSync(out, JSON.stringify(report, null, 1));
const check = (name, ok, detail) => { report.checks.push({name, passed: !!ok, ...(detail === undefined ? {} : {detail})}); if (!ok) report.failures.push(name); save(); };
let n = 0;
const mcp = async (name, args, k = key, profile = 'full_advisory') => { const r = await fetch(base + '/mcp/runtime', {method: 'POST', headers: {'Content-Type': 'application/json', 'User-Agent': 'amos-conformance-submission', 'X-API-Key': k, 'X-Response-Profile': profile}, body: JSON.stringify({jsonrpc: '2.0', id: ++n, method: 'tools/call', params: {name, arguments: args}})}); return (await r.json()).result; };
const rest = async (route, body, k = key) => { const r = await fetch(base + route, {method: 'POST', headers: {'Content-Type': 'application/json', 'User-Agent': 'amos-conformance-submission', 'X-API-Key': k, 'X-Response-Profile': 'full_advisory'}, body: JSON.stringify(body)}); return {status: r.status, body: await r.json()}; };
const passages = ['The lab registry filing shows twelve of the twelve lab retailers renewed after the launch.', 'Retail partners in Kampala reported reorders after launch.'];
const args = {company_name: 'AMOS lab distributor', country: 'UG', entity_archetype: 'fintech_lending', decision_question: 'Should the lab distributor pilot a second retail wave?',
  claims: [{claim_id: 'C1', claim: 'Lab retailers reorder after launch.', support_links: [{claim_id: 'C1', evidence_id: 'E1', relationship: 'direct_support', locator: 'claim'}, {claim_id: 'C1', evidence_id: 'E2', relationship: 'direct_support', locator: 'claim'}]}],
  evidence_pack: [{id: 'E1', claim: passages[0], load_bearing: true, evidence_origin: 'public_osint', stakeholder_class: 'guardian', source_class: 'regulator_published', source_grade: 'A', evidence_type: 'public_filing', collection_method: 'direct', freshness_date: '2026-10-01', geography: 'UG', evidence_geography: {country: 'UG'}, source_doc_id: 'LAB-FILING-1', public_metric_registry: 'fintech_lending', public_metrics: {regulatory_authorization_status: true}, privacy_envelope: {safe_for_modeling: true}},
    {id: 'E2', claim: passages[1], load_bearing: true, evidence_origin: 'field_research', stakeholder_class: 'retailer', source_class: 'structured_field_research', source_grade: 'B', evidence_type: 'interview', collection_method: 'field_interview', freshness_date: '2026-10-05', geography: 'UG', evidence_geography: {country: 'UG'}, source_doc_id: 'LAB-FIELD-1', privacy_envelope: {safe_for_modeling: true}, structured_values: {trust: 60, permission: 55}}]};
let step = await mcp('mvr_first_call', args), slot = null, tasks = null, instruction = null;
for (let i = 0; i < 6 && step; i++) {
  const sc = step.structuredContent || {};
  if (sc.interpretation_submission?.submission_token) { slot = sc.interpretation_submission; tasks = sc.claim_review.interpretation_tasks.items; instruction = sc.claim_review.interpretation_tasks.how_to_answer; break; }
  if (!sc.mcp_next_call) break;
  step = await mcp(sc.mcp_next_call.name, sc.mcp_next_call.arguments);
}
check('a licensed workflow step issues a slot bound to its tasks, and names the tool', !!slot && tasks?.length >= 1 && /mvr_interpretation_submission/.test(instruction || ''), {tasks: tasks?.length, submission_id: slot?.submission_id});
if (slot) {
  const model = v => ({provider: 'lab', model: 'conformance-' + v, model_version: '1'});
  const reading = (t, label) => ({task_id: t.task_id, claim_sha256: t.claim_sha256, passage_sha256: t.passage_sha256, label});
  const submit = (m, readings, extra = {}, k = key) => mcp('mvr_interpretation_submission', {action: 'submit', submission_token: slot.submission_token, schema_version: 'mvr.interpretation-submission/1', model: m, prompt_policy_sha256: '1'.repeat(64), readings, ...extra}, k);
  const a = await submit(model('a'), tasks.map(t => reading(t, 'supports')));
  check('positive: every reading reaches label evaluation and is accepted', a?.isError === false && a.structuredContent.readings.every(r => r.code === 'READING_ACCEPTED'), a?.structuredContent?.readings);
  const replay = await submit(model('a'), tasks.map(t => reading(t, 'supports')));
  check('replay by the same model fails SUBMISSION_REPLAYED', replay?.structuredContent?.code === 'SUBMISSION_REPLAYED');
  const b = await submit(model('b'), tasks.map(t => reading(t, 'adverse')));
  check('a conflicting second model is accepted and the conflict retained', b?.isError === false && b.structuredContent.review.conflicting_task_ids.length === tasks.length);
  const t = tasks[0];
  const neg = await submit(model('c'), [{...reading(t, 'supports'), claim_sha256: 'a'.repeat(64)}, {...reading(t, 'supports'), passage_sha256: 'b'.repeat(64)}, {...reading(t, 'maybe')}, {...reading(t, 'supports'), task_id: 'PT-' + '0'.repeat(48)}, {...reading(t, 'supports'), extra: 1}, {...reading(t, 'supports'), model: model('a')}, reading(t, 'qualifies'), reading(t, 'qualifies')]);
  check('each negative reading fails for its own reason', JSON.stringify(neg?.structuredContent?.readings?.map(r => r.code)) === JSON.stringify(['CLAIM_HASH_MISMATCH', 'PASSAGE_HASH_MISMATCH', 'LABEL_NOT_ALLOWED', 'TASK_NOT_IN_SUBMISSION', 'READING_FIELD_NOT_ALLOWED', 'MODEL_IDENTITY_MISMATCH', 'READING_ACCEPTED', 'DUPLICATE_TASK_IN_SUBMISSION']), neg?.structuredContent?.readings?.map(r => r.code));
  for (const [label, extra, code] of [['receipt as fresh input', {submission_token: a.structuredContent.receipt_id}, 'RECEIPT_NOT_SUBMISSION_INPUT'], ['wrong schema version', {schema_version: 'mvr.interpretation-submission/0'}, 'SUBMISSION_SCHEMA_VERSION_UNSUPPORTED'], ['mutated workflow binding', {workflow_id: 'MVRWF-other'}, 'IMMUTABLE_FIELD_MISMATCH'], ['extra field', {claims: []}, 'SUBMISSION_FIELD_NOT_ALLOWED']]) {
    const r = await submit(model('neg-' + label), [reading(t, 'supports')], extra);
    check('submission negative: ' + label, r?.structuredContent?.code === code, r?.structuredContent?.code);
  }
  if (key2) { const x = await submit(model('x'), [reading(t, 'supports')], {}, key2); check('cross-tenant injection: the slot is unknown to another tenant', x?.structuredContent?.code === 'SUBMISSION_UNKNOWN'); }
  else report.not_run.push({check: 'cross-tenant injection', reason: 'MVR_API_KEY_2 (a key in another tenant) not supplied'});
  const effectBody = id => ({analysis_date: '2026-11-01', subject: {entity_name: 'AMOS lab distributor'}, market_scope: {country: 'UG'}, claims: [{claim_id: 'C1', claim: 'Lab retailers reorder after launch.', support_links: [{evidence_id: 'E1', relationship: 'direct_support', locator: 'claim'}, {evidence_id: 'E2', relationship: 'direct_support', locator: 'claim'}]}, {claim_id: 'C9', claim: 'An unrelated claim.', support_links: [{evidence_id: 'E9', relationship: 'direct_support', locator: 'p1'}]}],
    evidence_pack: [{evidence_id: 'E1', claim: passages[0], evidence_geography: {country: 'UG'}, source_date: '2026-10-01'}, {evidence_id: 'E2', claim: passages[1], evidence_geography: {country: 'UG'}, source_date: '2026-10-05'}, {evidence_id: 'E9', claim: 'An unrelated record.', evidence_geography: {country: 'UG'}, source_date: '2026-10-05'}],
    requested_effects: [{effect_id: 'EXT-C1', effect_type: 'external_offer', depends_on_claims: ['C1']}, {effect_id: 'EXT-C9', effect_type: 'external_offer', depends_on_claims: ['C9']}], interpretation_submission_id: id});
  const before = await rest('/v1/effect-decision', effectBody(slot.submission_id));
  check('model readings alone change no effect decision', before.status === 200 && before.body.effects.every(e => e.analytical_evidence_status === 'favorable'), before.body.effects?.map(e => e.analytical_evidence_status));
  for (const task of tasks) await rest('/v1/interpretation-submissions', {action: 'dispose', submission_id: slot.submission_id, task_id: task.task_id, disposition: 'reject_support', reason: 'Conformance: the passage does not support the claim as stated.'});
  const after = await rest('/v1/effect-decision', effectBody(slot.submission_id));
  check('a reviewer rejection changes only the dependent effect; no permission is granted', JSON.stringify(after.body.effects?.map(e => [e.effect_id, e.analytical_evidence_status])) === JSON.stringify([['EXT-C1', 'insufficient'], ['EXT-C9', 'favorable']]) && after.body.effects.every(e => e.execution_authorization_status !== 'authorized'), after.body.effects?.map(e => [e.effect_id, e.analytical_evidence_status]));
}
report.finished_at = new Date().toISOString();
report.passed = report.failures.length === 0;
save();
console.log(JSON.stringify({passed: report.passed, checks: report.checks.length, failures: report.failures, not_run: report.not_run}));
process.exitCode = report.passed ? 0 : 1;
