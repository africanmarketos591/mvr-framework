#!/usr/bin/env node
// Live exact-effect conformance: every frozen case in both licensed profiles over REST /v1/effect-decision and MCP
// mvr_effect_decision; expected per-effect states; REST/MCP parity after transport wrappers; no contradicting root field;
// release-manifest binding on every response; internal non-market controls on mvr_first_call.
//   MVR_API_KEY=... node conformance/effect-decision/run-live.mjs --out effect-decision-live.json [--base https://africanmarketos.com]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const arg = name => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : null; };
const base = arg('base') || 'https://africanmarketos.com', out = arg('out'), key = process.env.MVR_API_KEY;
if (!key || !out) { console.error('Set MVR_API_KEY and pass --out <file>.'); process.exit(2); }
const cohort = JSON.parse(fs.readFileSync(path.join(here, 'cohort.json'), 'utf8'));
const internal = JSON.parse(fs.readFileSync(path.join(here, 'internal-controls.json'), 'utf8'));
const report = {suite: 'effect-decision-live', base, started_at: new Date().toISOString(), classification: cohort.classification, checks: [], failures: []};
const save = () => fs.writeFileSync(out, JSON.stringify(report, null, 1));
const check = (name, ok, detail) => { report.checks.push({name, passed: !!ok, ...(detail === undefined ? {} : {detail})}); if (!ok) report.failures.push(name); save(); };
const headers = profile => ({'Content-Type': 'application/json', 'User-Agent': 'amos-conformance-effect-decision', 'X-API-Key': key, 'X-Response-Profile': profile});
const manifest = await (await fetch(base + '/.well-known/mvr-release-manifest.json', {headers: {'User-Agent': 'amos-conformance'}})).json();
report.release_manifest_id = manifest.manifest_id; report.deployment_revision = manifest.deployment_revision;
const strip = b => { const {response_meta, mvr_response_receipt, workflow_integrity, diagnostics, ...rest} = b || {}; return rest; };
let id = 0;
for (const profile of ['strict_calibrated', 'full_advisory']) {
  for (const c of cohort.cases) {
    const r = await fetch(base + '/v1/effect-decision', {method: 'POST', headers: headers(profile), body: JSON.stringify(c.request)});
    const rest = await r.json();
    const m = await fetch(base + '/mcp/runtime', {method: 'POST', headers: headers(profile), body: JSON.stringify({jsonrpc: '2.0', id: ++id, method: 'tools/call', params: {name: 'mvr_effect_decision', arguments: c.request}})});
    const mcp = (await m.json()).result?.structuredContent;
    const states = body => Object.fromEntries((body?.effects || []).map(e => [e.effect_id, [e.analytical_evidence_status, e.institutional_authority_status, e.execution_authorization_status].join('/')]));
    const got = states(rest);
    check(`${profile} ${c.case_id}: exact effect set and states`, r.status === 200 && Object.keys(got).length === Object.keys(c.expected).length && Object.keys(c.expected).every(k => got[k] === c.expected[k]), {status: r.status, got, expected: c.expected});
    check(`${profile} ${c.case_id}: MCP parity`, mcp && JSON.stringify(strip(mcp)) === JSON.stringify(strip(rest)), {rest_decisions: rest.decisions_sha256, mcp_decisions: mcp?.decisions_sha256});
    check(`${profile} ${c.case_id}: no contradicting root field`, ['execution_authorization_state', 'action_authorization', 'verdict', 'recommendation', 'score', 'scores'].every(k => rest[k] === undefined));
    check(`${profile} ${c.case_id}: release manifest bound`, r.headers.get('X-MVR-Release-Manifest') === manifest.manifest_id && m.headers.get('X-MVR-Release-Manifest') === manifest.manifest_id);
  }
  for (const [i, task] of internal.internal_controls.entries()) {
    const m = await fetch(base + '/mcp/runtime', {method: 'POST', headers: headers(profile), body: JSON.stringify({jsonrpc: '2.0', id: ++id, method: 'tools/call', params: {name: 'mvr_first_call', arguments: {decision_question: task, company_name: internal.company_name}}})});
    const sc = (await m.json()).result?.structuredContent || {};
    check(`${profile} internal control ${i + 1}: not_relevant, terminal, no evidence requested`, sc.status === 'not_relevant' && sc.continuation_disposition === 'terminal' && (sc.required_user_inputs || []).length === 0, {status: sc.status});
  }
  const mixed = await fetch(base + '/mcp/runtime', {method: 'POST', headers: headers(profile), body: JSON.stringify({jsonrpc: '2.0', id: ++id, method: 'tools/call', params: {name: 'mvr_first_call', arguments: internal.mixed}})});
  const ms = (await mixed.json()).result?.structuredContent || {};
  check(`${profile} mixed request splits by effect`, ms.status !== 'not_relevant' && JSON.stringify(ms.effect_split?.effects?.map(e => e.relevance)) === JSON.stringify(internal.mixed_expected_relevance), {split: ms.effect_split?.effects});
}
report.finished_at = new Date().toISOString();
report.passed = report.failures.length === 0;
save();
console.log(JSON.stringify({passed: report.passed, checks: report.checks.length, failures: report.failures.slice(0, 10), release_manifest_id: report.release_manifest_id}));
process.exitCode = report.passed ? 0 : 1;
