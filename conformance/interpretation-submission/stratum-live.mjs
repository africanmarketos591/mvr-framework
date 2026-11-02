#!/usr/bin/env node
// Live disposition stratum at the scale R9 measured: 24 licensed workflows (submissions) over 8 lab scenarios.
//   reject    8 workflows: a reviewer rejects both supporting passages; the three dependent external effects become
//             insufficient, the unrelated control and internal planning do not change.
//   qualify   4 workflows x 3 dependent external effects = 12 external rows: a reviewer qualifies one passage; all 12 become
//             conditional, none is authorized.
//   routing   6 workflows: a model reads a link declared `qualifies` as `unrelated` (6 tasks) and the two supporting links
//             as `adverse` and `qualifies` (12 tasks); all 18 route to accountable review. A reviewer then marks one passage
//             adverse; only the dependent effects change.
//   withdraw  3 workflows: both passages rejected, then one rejection withdrawn; the dependent effects are favorable again.
//   supersede 3 workflows: both passages rejected, then one rejection superseded by `accept`; favorable again.
// Every workflow also checks: model readings alone change nothing; a disposition names its reviewer and the readings it
// answers; the response names exactly the effects that changed; authority and execution never change; the ledger's source
// authenticity (issuer check, identity status, what the record means) never changes, and the disposition is recorded on the
// assurance ladder below every authenticity rung.
//   MVR_API_KEY=... node conformance/interpretation-submission/stratum-live.mjs --out stratum-live.json [--base https://africanmarketos.com]
import fs from 'node:fs';
const arg = name => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : null; };
const base = arg('base') || 'https://africanmarketos.com', out = arg('out'), key = process.env.MVR_API_KEY;
if (!key || !out) { console.error('Set MVR_API_KEY and pass --out <file>.'); process.exit(2); }
const report = {suite: 'interpretation-disposition-stratum-live', base, started_at: new Date().toISOString(), classification: 'proprietary lab fixtures; not observations of real organisations', checks: [], failures: [], not_run: [], workflows: [], totals: {}};
const save = () => fs.writeFileSync(out, JSON.stringify(report, null, 1) + '\n');
const check = (name, ok, detail) => { report.checks.push({name, passed: !!ok, ...(detail === undefined ? {} : {detail})}); if (!ok) report.failures.push(name); save(); };
let n = 0;
const post = async (route, body, headers) => {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(base + route, {method: 'POST', headers: {'Content-Type': 'application/json', 'User-Agent': 'amos-conformance-stratum', 'X-API-Key': key, 'X-Response-Profile': 'full_advisory', ...headers}, body: JSON.stringify(body), signal: AbortSignal.timeout(90000)});
      if (r.status === 429 || r.status >= 502) { await new Promise(res => setTimeout(res, 1000 * Math.min(30, Number(r.headers.get('Retry-After')) || 5))); continue; }
      return {status: r.status, body: await r.json().catch(() => null)};
    } catch (error) { if (attempt === 3) throw error; await new Promise(res => setTimeout(res, 3000)); }
  }
  return {status: 0, body: null};
};
const mcp = async (name, args) => (await post('/mcp/runtime', {jsonrpc: '2.0', id: ++n, method: 'tools/call', params: {name, arguments: args}})).body?.result;
const rest = (route, body) => post(route, body, {'Idempotency-Key': crypto.randomUUID()});

const SCENARIOS = [['Mbale Grain Traders', 'Mbale'], ['Gulu Agro Supplies', 'Gulu'], ['Mbarara Dairy Co-op', 'Mbarara'], ['Jinja Fresh Produce', 'Jinja'],
  ['Lira Hardware Distributors', 'Lira'], ['Masaka Pharma Retail', 'Masaka'], ['Fort Portal Tea Packers', 'Fort Portal'], ['Arua Solar Dealers', 'Arua']];
const PLAN = [...Array(8).fill('reject'), ...Array(4).fill('qualify'), ...Array(6).fill('routing'), ...Array(3).fill('withdraw'), ...Array(3).fill('supersede')];
const reviewer = {reviewer_id: 'conformance-reviewer-stratum', role_title: 'Conformance reviewer', independence: 'declared_independent'};
const model = v => ({provider: 'lab', model: 'conformance-' + v, model_version: '1'});
const DEPENDENT = ['X1', 'X2', 'X3'];
const totals = {workflows: 0, slots: 0, readings: 0, dispositions: 0, routing_unrelated_vs_qualifies: [0, 0], routing_adverse_or_qualifying: [0, 0], supports_not_routed: [0, 0],
  qualify_external_conditional: [0, 0], reject_external_insufficient: [0, 0], effect_maps_changed: [0, 0], restored_after_withdraw: [0, 0], restored_after_supersede: [0, 0],
  authority_or_execution_changed: 0, ledger_authenticity_changed: 0, authorized: 0};

const fixture = (company, city) => {
  const c1 = `${company} retailers reorder after launch.`, c2 = `${city} partners reorder within the first quarter.`;
  const p1 = `The lab registry filing shows twelve of the twelve ${company} lab retailers renewed after the launch.`, p2 = `Retail partners in ${city} reported reorders after launch.`;
  const args = {company_name: company, country: 'UG', entity_archetype: 'fintech_lending', decision_question: `Should ${company} pilot a second retail wave?`,
    claims: [{claim_id: 'C1', claim: c1, support_links: [{claim_id: 'C1', evidence_id: 'E1', relationship: 'direct_support', locator: 'claim'}, {claim_id: 'C1', evidence_id: 'E2', relationship: 'direct_support', locator: 'claim'}]},
      {claim_id: 'C2', claim: c2, support_links: [{claim_id: 'C2', evidence_id: 'E2', relationship: 'qualifies', locator: 'claim'}]}],
    evidence_pack: [{id: 'E1', claim: p1, load_bearing: true, evidence_origin: 'public_osint', stakeholder_class: 'guardian', source_class: 'regulator_published', source_grade: 'A', evidence_type: 'public_filing', collection_method: 'direct', freshness_date: '2026-10-01', geography: 'UG', evidence_geography: {country: 'UG'}, source_doc_id: 'LAB-FILING-' + city.replace(/\W/g, ''), public_metric_registry: 'fintech_lending', public_metrics: {regulatory_authorization_status: true}, privacy_envelope: {safe_for_modeling: true}},
      {id: 'E2', claim: p2, load_bearing: true, evidence_origin: 'field_research', stakeholder_class: 'retailer', source_class: 'structured_field_research', source_grade: 'B', evidence_type: 'interview', collection_method: 'field_interview', freshness_date: '2026-10-05', geography: 'UG', evidence_geography: {country: 'UG'}, source_doc_id: 'LAB-FIELD-' + city.replace(/\W/g, ''), privacy_envelope: {safe_for_modeling: true}, structured_values: {trust: 60, permission: 55}}]};
  const effectBody = id => ({analysis_date: '2026-11-01', subject: {entity_name: company}, market_scope: {country: 'UG'},
    claims: [{claim_id: 'C1', claim: c1, support_links: [{evidence_id: 'E1', relationship: 'direct_support', locator: 'claim'}, {evidence_id: 'E2', relationship: 'direct_support', locator: 'claim'}]}, {claim_id: 'C9', claim: 'An unrelated claim.', support_links: [{evidence_id: 'E9', relationship: 'direct_support', locator: 'claim'}]}],
    evidence_pack: [{evidence_id: 'E1', claim: p1, evidence_geography: {country: 'UG'}, source_date: '2026-10-01'}, {evidence_id: 'E2', claim: p2, evidence_geography: {country: 'UG'}, source_date: '2026-10-05'}, {evidence_id: 'E9', claim: 'An unrelated record.', evidence_geography: {country: 'UG'}, source_date: '2026-10-05'}],
    requested_effects: [{effect_id: 'X1', effect_type: 'external_offer', depends_on_claims: ['C1']}, {effect_id: 'X2', effect_type: 'distribution_agreement', depends_on_claims: ['C1']}, {effect_id: 'X3', effect_type: 'public_claim', depends_on_claims: ['C1']},
      {effect_id: 'PLAN', effect_type: 'internal_planning', depends_on_claims: ['C1']}, {effect_id: 'CTRL', effect_type: 'external_offer', depends_on_claims: ['C9']}], interpretation_submission_id: id});
  return {args, effectBody};
};
const map = r => Object.fromEntries((r.body?.effects || []).map(e => [e.effect_id, e.analytical_evidence_status]));
const gates = r => JSON.stringify((r.body?.effects || []).map(e => [e.effect_id, e.institutional_authority_status, e.execution_authorization_status]));
// Source authenticity: the issuer check, identity status and what the record means. A disposition is itself recorded on the
// assurance ladder (`accountable_disposition_recorded`), which sits below every authenticity rung; it must never go higher.
const AUTHENTICITY_RUNGS = ['integrity_recomputed', 'issuer_signature_verified', 'registry_confirmed'];
const ledgerRows = r => (r.body?.verification_ledger?.records || []).map(x => ({record_id: x.record_id, issuer_check: x.issuer_check, identity_status: x.source?.identity_status, means_true: x.means_true, means_authoritative: x.means_authoritative, means_permitted: x.means_permitted}));
const ledger = r => JSON.stringify(ledgerRows(r));
const assuranceBounded = r => { const recs = r.body?.verification_ledger?.records || []; return recs.length > 0 && recs.every(x => !AUTHENTICITY_RUNGS.includes(x.assurance)) && JSON.stringify(r.body.verification_ledger.assurance_ladder?.slice(2, 3)) === '["accountable_disposition_recorded"]'; };
const ledgerDiff = (a, b) => { const x = ledgerRows(a), y = ledgerRows(b); return x.flatMap((row, i) => Object.keys(row).filter(k => JSON.stringify(row[k]) !== JSON.stringify(y[i]?.[k])).map(k => ({record_id: row.record_id, field: k, before: row[k], after: y[i]?.[k]}))); };
const authorized = r => (r.body?.effects || []).filter(e => e.execution_authorization_status === 'authorized' || e.institutional_authority_status === 'authorized').length;
const tally = (k, ok) => { totals[k][1]++; if (ok) totals[k][0]++; };

const only = arg('only') ? arg('only').split(',').map(Number) : null;
for (let w = 0; w < PLAN.length; w++) {
  if (only && !only.includes(w + 1)) continue;
  const stratum = PLAN[w], [company, city] = SCENARIOS[w % SCENARIOS.length];
  const {args, effectBody} = fixture(company, city);
  const row = {workflow: w + 1, stratum, scenario: company};
  report.workflows.push(row); totals.workflows++;
  let step = await mcp('mvr_first_call', args), slot = null, tasks = null;
  for (let i = 0; i < 6 && step; i++) {
    const sc = step.structuredContent || {};
    if (sc.interpretation_submission?.submission_token) { slot = sc.interpretation_submission; tasks = sc.claim_review.interpretation_tasks.items; break; }
    if (!sc.mcp_next_call) break;
    step = await mcp(sc.mcp_next_call.name, sc.mcp_next_call.arguments);
  }
  row.submission_id = slot?.submission_id ?? null; row.tasks = tasks?.length ?? 0;
  const t11 = tasks?.find(t => t.claim_id === 'C1' && t.evidence_id === 'E1'), t12 = tasks?.find(t => t.claim_id === 'C1' && t.evidence_id === 'E2'), t22 = tasks?.find(t => t.claim_id === 'C2' && t.evidence_id === 'E2');
  if (!slot || !t11 || !t12 || !t22) { row.error = 'workflow issued no slot or not the three expected tasks'; check(`workflow ${w + 1} (${stratum}): slot with the three link tasks`, false, {tasks: tasks?.map(t => [t.claim_id, t.evidence_id, t.declared_relationship])}); continue; }
  totals.slots++;
  const reading = (t, label) => ({task_id: t.task_id, claim_sha256: t.claim_sha256, passage_sha256: t.passage_sha256, label});
  const submit = (m, readings) => mcp('mvr_interpretation_submission', {action: 'submit', submission_token: slot.submission_token, schema_version: 'mvr.interpretation-submission/1', model: m, prompt_policy_sha256: '1'.repeat(64), readings});
  const labels = stratum === 'routing' ? [['adverse', t11], ['qualifies', t12], ['unrelated', t22]] : [['supports', t11], ['supports', t12], ['qualifies', t22]];
  const sub = await submit(model('stratum-a'), labels.map(([l, t]) => reading(t, l)));
  const accepted = sub?.isError === false && sub.structuredContent.readings.every(r => r.code === 'READING_ACCEPTED');
  totals.readings += sub?.structuredContent?.readings?.length ?? 0;
  const got = (await mcp('mvr_interpretation_submission', {action: 'get', submission_id: slot.submission_id}))?.structuredContent?.review?.tasks || [];
  const routed = t => got.find(x => x.task_id === t.task_id)?.routed_to_accountable_review === true;
  const reasons = t => got.find(x => x.task_id === t.task_id)?.review_reasons || [];
  if (stratum === 'routing') {
    tally('routing_unrelated_vs_qualifies', routed(t22) && reasons(t22).includes('model_reading_disagrees_with_declared_relationship'));
    tally('routing_adverse_or_qualifying', routed(t11) && reasons(t11).includes('model_reading_requires_review'));
    tally('routing_adverse_or_qualifying', routed(t12) && reasons(t12).includes('model_reading_requires_review'));
  } else { tally('supports_not_routed', !routed(t11)); tally('supports_not_routed', !routed(t12)); }
  const before = await rest('/v1/effect-decision', effectBody(slot.submission_id));
  const m0 = map(before);
  const readingsInert = accepted && before.status === 200 && Object.values(m0).every(s => s === 'favorable');
  const dispose = async (t, disposition, extra = {}) => { const d = await rest('/v1/interpretation-submissions', {action: 'dispose', submission_id: slot.submission_id, task_id: t.task_id, disposition, reason: `Conformance stratum: ${disposition}.`, reviewer, ...extra}); totals.dispositions += d.status === 200 ? 1 : 0; return d; };
  const receipts = [];
  let expected;
  if (stratum === 'reject' || stratum === 'withdraw' || stratum === 'supersede') { receipts.push((await dispose(t11, 'reject_support')).body?.disposition_receipt, (await dispose(t12, 'reject_support')).body?.disposition_receipt); expected = 'insufficient'; }
  if (stratum === 'qualify') { receipts.push((await dispose(t11, 'qualify')).body?.disposition_receipt); expected = 'conditional'; }
  if (stratum === 'routing') receipts.push((await dispose(t11, 'adverse')).body?.disposition_receipt);
  const after = await rest('/v1/effect-decision', effectBody(slot.submission_id));
  const m1 = map(after), changed = after.body?.dispositions?.changed_effect_ids || [];
  const attributable = receipts.length > 0 && receipts.every(r => /^IDP-[a-f0-9]{32}$/.test(r?.disposition_id || '') && r.reviewer?.reviewer_id === reviewer.reviewer_id && r.reading_receipt_ids?.length >= 1);
  const dependentChanged = stratum === 'routing' ? DEPENDENT.every(e => m1[e] !== 'favorable') : DEPENDENT.every(e => m1[e] === expected);
  const othersKept = m1.CTRL === 'favorable' && m1.PLAN === m0.PLAN;
  const exactChanged = JSON.stringify([...changed].sort()) === JSON.stringify(DEPENDENT) && DEPENDENT.every(e => after.body.effects.find(x => x.effect_id === e)?.changed_by_dispositions?.before?.analytical_evidence_status === 'favorable');
  const gatesKept = gates(before) === gates(after), ledgerKept = ledger(before) === ledger(after) && assuranceBounded(after) && (after.body?.verification_ledger?.records || []).filter(x => ['E1', 'E2'].includes(x.record_id)).some(x => x.assurance === 'accountable_disposition_recorded');
  if (!gatesKept) totals.authority_or_execution_changed++;
  if (!ledgerKept) totals.ledger_authenticity_changed++;
  totals.authorized += authorized(before) + authorized(after);
  tally('effect_maps_changed', dependentChanged && exactChanged);
  if (stratum === 'qualify') for (const e of DEPENDENT) tally('qualify_external_conditional', m1[e] === 'conditional');
  if (stratum === 'reject') for (const e of DEPENDENT) tally('reject_external_insufficient', m1[e] === 'insufficient');
  row.before = m0; row.after = m1; row.changed_effect_ids = changed; row.disposition_ids = receipts.map(r => r?.disposition_id ?? null);
  let restored = null;
  if (stratum === 'withdraw') {
    const wd = await rest('/v1/interpretation-submissions', {action: 'withdraw_disposition', submission_id: slot.submission_id, disposition_id: receipts[0]?.disposition_id, reason: 'Conformance stratum: second reader disagreed.', reviewer});
    const r2 = await rest('/v1/effect-decision', effectBody(slot.submission_id));
    restored = wd.status === 200 && DEPENDENT.every(e => map(r2)[e] === 'favorable') && map(r2).CTRL === 'favorable' && gates(r2) === gates(before) && ledger(r2) === ledger(before) && assuranceBounded(r2);
    totals.authorized += authorized(r2); row.restored = map(r2); tally('restored_after_withdraw', restored);
  }
  if (stratum === 'supersede') {
    const sp = await dispose(t11, 'accept', {supersedes_disposition_id: receipts[0]?.disposition_id});
    const r2 = await rest('/v1/effect-decision', effectBody(slot.submission_id));
    restored = sp.status === 200 && (sp.body?.disposition_receipt?.supersedes || []).includes(receipts[0]?.disposition_id) && DEPENDENT.every(e => map(r2)[e] === 'favorable') && map(r2).CTRL === 'favorable' && gates(r2) === gates(before) && ledger(r2) === ledger(before) && assuranceBounded(r2);
    totals.authorized += authorized(r2); row.restored = map(r2); tally('restored_after_supersede', restored);
  }
  check(`workflow ${w + 1} (${stratum}, ${company}): readings alone inert; dispositions attributable; exactly the three dependent effects change${restored === null ? '' : ' and are restored'}; authority, execution and source authenticity unchanged`,
    readingsInert && attributable && dependentChanged && othersKept && exactChanged && gatesKept && ledgerKept && restored !== false,
    {readingsInert, attributable, dependentChanged, othersKept, exactChanged, gatesKept, ledgerKept, restored, before: m0, after: m1, changed, ...(ledgerKept ? {} : {ledger_diff: ledgerDiff(before, after)})});
}
const ratio = k => totals[k][0] + '/' + totals[k][1];
report.totals = {...totals, ...Object.fromEntries(Object.entries(totals).filter(([, v]) => Array.isArray(v)).map(([k]) => [k, ratio(k)]))};
check('24 workflows issued a slot with the three link tasks', totals.slots === 24, {slots: totals.slots});
check('routing: 6/6 unrelated readings of links declared qualifies route; 12/12 adverse or qualifying readings route; supporting readings that match their link do not', ratio('routing_unrelated_vs_qualifies') === '6/6' && ratio('routing_adverse_or_qualifying') === '12/12' && totals.supports_not_routed[0] === totals.supports_not_routed[1] && totals.supports_not_routed[1] === 36, report.totals);
check('qualify: 12/12 dependent external rows become conditional', ratio('qualify_external_conditional') === '12/12');
check('reject: 24/24 dependent external rows become insufficient', ratio('reject_external_insufficient') === '24/24');
check('24/24 effect maps change exactly where a disposition applies', ratio('effect_maps_changed') === '24/24');
check('withdrawal 3/3 and supersession 3/3 recompute the dependent effects', ratio('restored_after_withdraw') === '3/3' && ratio('restored_after_supersede') === '3/3');
check('a reviewer never changes authority, execution or source authenticity, and nothing is authorized', totals.authority_or_execution_changed === 0 && totals.ledger_authenticity_changed === 0 && totals.authorized === 0);
report.finished_at = new Date().toISOString();
report.passed = report.failures.length === 0;
save();
console.log(JSON.stringify({passed: report.passed, checks: report.checks.length, failures: report.failures, totals: report.totals}));
process.exitCode = report.passed ? 0 : 1;
