#!/usr/bin/env node
// Live R9 qualification run against production with an Enterprise key, both profiles:
//   effect sufficiency   R9-shaped held-out set A (56 cases) and set B (16 cases, new wording) over REST and MCP, scored;
//   audit                held-out audit cohort (24 cases, ten routes), scored against the R9 bar;
//   relevance            eight internal non-market controls on licensed first call, public preflight, guided preflight,
//                        claim audit and the effect route;
//   contracts            capabilities names the tools tools/list returns; detailed output schemas; 429 headers; buyer SDK aliases.
//   MVR_API_KEY=... node conformance/r9-qualification/run-live.mjs --output r9-live.json [--base https://africanmarketos.com]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {scoreEffects} from '../effect-decision/r9-heldout/score.mjs';
import {scoreHeldout} from '../audit-findings/heldout-r9/score.mjs';
import {ACTION_ALIASES} from '../../sdks/javascript/buyer-executor-verifier.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const arg = name => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : null; };
const base = arg('base') || 'https://africanmarketos.com', output = arg('output'), key = process.env.MVR_API_KEY;
if (!key || !output) { console.error('Set MVR_API_KEY and pass --output <file>.'); process.exit(2); }
const read = p => JSON.parse(fs.readFileSync(path.join(here, '..', p), 'utf8'));
const report = {suite: 'r9-qualification-live', base, started_at: new Date().toISOString(), classification: 'proprietary lab fixtures; not observations of real organisations', checks: [], failures: [], scores: {}};
const save = () => fs.writeFileSync(output, JSON.stringify(report, null, 1) + '\n');
const check = (name, ok, detail) => { report.checks.push({name, passed: !!ok, ...(detail === undefined ? {} : {detail})}); if (!ok) report.failures.push(name); save(); };
const headers = (profile, licensed = true) => ({'Content-Type': 'application/json', 'User-Agent': 'amos-r9-qualification', Accept: 'application/json, text/event-stream', ...(licensed ? {'X-API-Key': key, 'X-Response-Profile': profile} : {})});
const call = async (route, body, profile = 'full_advisory', {licensed = true, method = 'POST'} = {}) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { const r = await fetch(base + route, {method, headers: headers(profile, licensed), ...(method === 'GET' ? {} : {body: JSON.stringify(body)}), signal: AbortSignal.timeout(90000)}); return {status: r.status, headers: r.headers, body: await r.json().catch(() => null)}; }
    catch (error) { if (attempt === 2) throw error; await new Promise(r => setTimeout(r, 2000)); }
  }
};
let id = 0;
const mcp = async (route, name, args, profile = 'full_advisory', licensed = true) => (await call(route, {jsonrpc: '2.0', id: ++id, method: 'tools/call', params: {name, arguments: args}}, profile, {licensed})).body?.result?.structuredContent;
const manifest = (await call('/.well-known/mvr-release-manifest.json', null, 'full_advisory', {licensed: false, method: 'GET'})).body;
report.deployment_revision = manifest.deployment_revision; report.release_manifest_id = manifest.manifest_id;
const strip = b => { const {response_meta, mvr_response_receipt, workflow_integrity, diagnostics, ...rest} = b || {}; return rest; };

// Effect sufficiency.
for (const [setName, file] of [['A', 'effect-decision/r9-heldout/cohort.json'], ['B', 'effect-decision/r9-heldout/cohort-b.json']]) {
  const cohort = read(file);
  for (const profile of ['strict_calibrated', 'full_advisory']) {
    const results = [];
    let parity = 0, bound = 0;
    for (const c of cohort.cases) {
      const r = await call('/v1/effect-decision', c.request, profile);
      const m = await mcp('/mcp/runtime', 'mvr_effect_decision', c.request, profile);
      results.push({case_id: c.case_id, body: r.body});
      if (m && JSON.stringify(strip(m)) === JSON.stringify(strip(r.body))) parity++;
      if (r.headers.get('X-MVR-Release-Manifest') === manifest.manifest_id) bound++;
    }
    const s = scoreEffects(cohort, results); const {mismatches, ...summary} = s;
    report.scores[`effect_set_${setName}_${profile}`] = {...summary, rest_mcp_parity: parity + '/' + cohort.cases.length, manifest_bound: bound + '/' + cohort.cases.length, mismatches: mismatches.slice(0, 20)};
    check(`effect set ${setName} ${profile}: zero false favorable, every market row exact, precedence on every missing-link and qualifier row`, s.false_favorable === 0 && s.market_agree === s.market_rows && s.missing_precedence === s.missing_rows && s.qualifier_precedence === s.qualifier_rows && s.external_authorized === 0 && s.irrelevant_identical === s.irrelevant_pairs && s.internal_not_relevant === s.internal, {market: s.market_agree + '/' + s.market_rows, false_favorable: s.false_favorable});
    check(`effect set ${setName} ${profile}: REST and MCP identical, release manifest bound`, parity === cohort.cases.length && bound === cohort.cases.length, {parity, bound});
  }
}
// Audit.
const audit = read('audit-findings/heldout-r9/heldout-r9.json');
for (const profile of ['strict_calibrated', 'full_advisory']) {
  const results = [];
  for (const c of audit.cases) { const r = await call(c.route, c.body, profile); results.push({case_id: c.case_id, http_status: r.status, body: r.body}); }
  const s = scoreHeldout(audit.cases, results);
  report.scores['audit_' + profile] = {detected: s.defects_detected + '/' + s.defects, route_level_false_permits: s.route_level_false_permits, clean_false_positives: s.clean_false_positives + '/' + s.clean, controlling: s.controlling + '/' + s.cases, targeted: s.targeted + '/' + s.defects, internal_only_false_triggers: s.internal_only_false_triggers, missing_contract: s.missing_contract, statuses: [...new Set(results.map(r => r.http_status))], rows: s.rows};
  check(`audit ${profile}: passes the R9 bar`, s.passes_r9_bar && !results.some(r => /"execution_authorized":\s*true|"external_action_authorized":\s*true/.test(JSON.stringify(r.body))), report.scores['audit_' + profile]);
}
// Relevance across routes.
const internal = read('effect-decision/r9-heldout/cohort.json').cases.filter(c => c.variant === 'internal_control').map(c => c.first_call_task);
const cells = {first_call: 0, preflight: 0, guided: 0, audit: 0, effect: 0};
for (const task of internal) {
  for (const profile of ['strict_calibrated', 'full_advisory']) {
    const fc = await mcp('/mcp/runtime', 'mvr_first_call', {decision_question: task, company_name: 'Rift Valley Dairies Ltd', country: 'KE', market_scope: {country: 'KE'}}, profile);
    if (fc?.status === 'not_relevant' && fc.continuation_disposition === 'terminal' && !fc.mcp_next_call?.name) cells.first_call++;
  }
  const pre = await mcp('/mcp/preflight', 'mvr_first_call', {decision_question: task, country: 'KE'}, 'full_advisory', false);
  if (pre?.status === 'not_relevant') cells.preflight++;
  const guided = await mcp('/mcp/guided', 'mvr_guided_preflight', {decision_question: task, country: 'KE', company_name: 'Rift Valley Dairies Ltd'}, 'full_advisory', false);
  if (guided && !(guided.stage_trace || []).some(s => s.tool_name !== 'mvr_first_call') && guided.guided_status !== 'completed_public_preflight') cells.guided++;
  const a = await call('/v1/claim-audit', {analysis_date: '2026-11-01', market_scope: {country: 'KE'}, subject: {entity_name: 'Rift Valley Dairies Ltd', entity_archetype: 'fmcg_brand'}, decision_question: task});
  if (a.body?.audit_findings?.audit_outcome === 'not_applicable') cells.audit++;
  const e = await call('/v1/effect-decision', {analysis_date: '2026-11-01', market_scope: {country: 'KE'}, requested_effects: [{effect_id: 'OPS', description: task}]});
  if (e.body?.effects?.[0]?.analytical_evidence_status === 'not_relevant') cells.effect++;
}
report.scores.relevance = {internal_controls: internal.length, ...cells};
check('relevance: 16/16 licensed first-call cells and 8/8 on preflight, guided, audit and effect routes terminate before market evidence work', cells.first_call === internal.length * 2 && ['preflight', 'guided', 'audit', 'effect'].every(k => cells[k] === internal.length), cells);
// Contracts.
const caps = (await call('/v1/capabilities', null, 'full_advisory', {method: 'GET'})).body;
const declared = caps?.enterprise_integration_readiness?.production_streamable_http_mcp;
for (const profile of ['strict_calibrated', 'full_advisory']) {
  const list = (await call('/mcp/runtime', {jsonrpc: '2.0', id: ++id, method: 'tools/list'}, profile)).body?.result?.tools || [];
  const names = list.map(t => t.name);
  check(`contracts ${profile}: capabilities names exactly the tools tools/list returns`, declared?.tool_count === names.length && JSON.stringify(declared.tools) === JSON.stringify(names), {declared: declared?.tools, listed: names});
  const ed = list.find(t => t.name === 'mvr_effect_decision'), sub = list.find(t => t.name === 'mvr_interpretation_submission');
  check(`contracts ${profile}: the exact-effect and submission tools publish detailed output schemas`, !!ed?.outputSchema?.properties?.effects?.items?.properties?.analytical_evidence_status && !!sub?.outputSchema?.properties?.disposition_receipt?.properties?.disposition_id);
}
const openapi = (await call('/v1/openapi.json', null, 'full_advisory', {licensed: false, method: 'GET'})).body;
const missing429 = []; let with429 = 0;
for (const [route, ops] of Object.entries(openapi?.paths || {})) for (const [method, op] of Object.entries(ops)) if (op?.responses?.['429']) { with429++; if (!op.responses['429'].headers?.['Retry-After'] || !op.responses['429'].headers?.['RateLimit-Reset']) missing429.push(method + ' ' + route); }
check('contracts: every OpenAPI 429 declares Retry-After and RateLimit headers', with429 > 200 && missing429.length === 0, {operations_with_429: with429, missing: missing429.slice(0, 10)});
const chain = (await call('/v1/authority-chain/contract', null, 'full_advisory', {licensed: false, method: 'GET'})).body;
check('contracts: the buyer SDK alias table equals the server action ontology', JSON.stringify(ACTION_ALIASES) === JSON.stringify(chain?.action_ontology?.legacy_aliases));
report.finished_at = new Date().toISOString();
report.passed = report.failures.length === 0;
save();
console.log(JSON.stringify({passed: report.passed, checks: report.checks.length, failures: report.failures}));
process.exitCode = report.passed ? 0 : 1;
