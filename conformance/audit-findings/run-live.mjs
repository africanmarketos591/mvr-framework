#!/usr/bin/env node
// Live audit qualification: 24 cells (16 single-defect cases, 8 clean controls) per audit route family and licensed
// profile, scored with scorer.mjs; strict evidence-audit must answer audit_performed=false with alternatives; the
// capability listing must say so before submission; an internal-only request is not applicable.
//   MVR_API_KEY=... node conformance/audit-findings/run-live.mjs --out audit-live.json [--base https://africanmarketos.com]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {scoreCell} from './scorer.mjs';
import {routeShape} from './route-shape.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const arg = name => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : null; };
const base = arg('base') || 'https://africanmarketos.com', out = arg('out'), key = process.env.MVR_API_KEY;
if (!key || !out) { console.error('Set MVR_API_KEY and pass --out <file>.'); process.exit(2); }
const cohort = JSON.parse(fs.readFileSync(path.join(here, 'cohort.json'), 'utf8'));
const report = {suite: 'audit-findings-live', base, started_at: new Date().toISOString(), classification: cohort.classification, cells: {}, checks: [], failures: []};
const save = () => fs.writeFileSync(out, JSON.stringify(report, null, 1));
const check = (name, ok, detail) => { report.checks.push({name, passed: !!ok, ...(detail === undefined ? {} : {detail})}); if (!ok) report.failures.push(name); save(); };
let n = 0;
const post = async (route, body, profile) => { const r = await fetch(base + route, {method: 'POST', headers: {'Content-Type': 'application/json', 'User-Agent': 'amos-conformance-audit', 'X-API-Key': key, 'X-Response-Profile': profile, 'Idempotency-Key': 'audit-live-' + Date.now() + '-' + (++n)}, body: JSON.stringify(body)}); return {status: r.status, body: await r.json().catch(() => null)}; };
for (const profile of ['strict_calibrated', 'full_advisory']) for (const route of cohort.route_families) {
  const results = [];
  for (const c of cohort.defects) results.push({...(await post(route, routeShape(c.request_core, route), profile)), expected_defect_code: c.expected_defect_code, expected_locus: c.expected_locus, case_id: c.case_id});
  for (const c of cohort.clean_controls) results.push({...(await post(route, routeShape(c.request_core, route), profile)), case_id: c.case_id});
  const cell = scoreCell(results);
  cell.http_statuses = results.reduce((a, r) => ({...a, [r.status]: (a[r.status] || 0) + 1}), {});
  cell.undetected = results.filter(r => r.expected_defect_code && !(r.body?.audit_findings?.findings || []).some(f => f.defect_code === r.expected_defect_code)).map(r => r.case_id);
  cell.clean_false_positive_cases = results.filter(r => !r.expected_defect_code && (r.body?.audit_findings?.findings || []).length).map(r => r.case_id);
  report.cells[profile + ' ' + route] = cell;
  check(`${profile} ${route}: R8 audit bar`, cell.passes_r8_bar, cell);
}
const strict = await post('/v1/evidence-audit', routeShape(cohort.defects[0].request_core, '/v1/evidence-audit'), 'strict_calibrated');
check('strict evidence-audit: non-2xx, audit_performed=false, stable reason, alternatives, structural findings', strict.status === 422 && strict.body?.audit_performed === false && strict.body?.audit_not_performed_reason === 'STRICT_CALIBRATION_MODEL_NOT_CERTIFIED' && Array.isArray(strict.body?.supported_alternatives) && strict.body?.audit_findings?.components?.[0]?.performed === true, {status: strict.status});
const caps = await (await fetch(base + '/v1/audit-capabilities', {headers: {'User-Agent': 'amos-conformance-audit'}})).json();
check('capabilities say before submission that strict evidence-audit is unavailable and why', caps.routes?.['/v1/evidence-audit']?.profiles?.strict_calibrated?.available === false && caps.routes['/v1/evidence-audit'].profiles.strict_calibrated.components[1].calibration_dependency.current_status === 'not_certified');
report.finished_at = new Date().toISOString();
report.passed = report.failures.length === 0;
save();
console.log(JSON.stringify({passed: report.passed, checks: report.checks.length, failures: report.failures}));
process.exitCode = report.passed ? 0 : 1;
