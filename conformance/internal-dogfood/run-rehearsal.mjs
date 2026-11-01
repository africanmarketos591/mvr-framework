#!/usr/bin/env node
// Lab rehearsal of the internal dogfood matrix against the live disposable lab (realm amos-lab). Runs the authority
// conformance runner with the trust root pinned from trust/amos-lab-trust-root.json, then reports every matrix case as
// PASS, FAIL or NOT RUN with the checks that prove it. Private-CI and team-run cases are reported as NOT RUN here.
//   node conformance/internal-dogfood/run-rehearsal.mjs --out dogfood-rehearsal.json [--base https://africanmarketos.com]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runAuthorityConformance} from '../authority/conformance-runner.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const arg = name => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : null; };
const base = arg('base') || 'https://africanmarketos.com', out = arg('out');
if (!out) { console.error('Pass --out <file>.'); process.exit(2); }
const matrix = JSON.parse(fs.readFileSync(path.join(here, 'attack-matrix.json'), 'utf8'));
const pinnedPath = path.join(here, '../../trust/amos-lab-trust-root.json');
const pinned = fs.existsSync(pinnedPath) ? JSON.parse(fs.readFileSync(pinnedPath, 'utf8')).trust_root : null;
const fetchTrustRoot = async () => {
  const live = (await (await fetch(base + '/.well-known/mvr-lab-trust-root.json', {headers: {'User-Agent': 'amos-dogfood-rehearsal'}})).json()).trust_root;
  if (pinned && (live.key_id !== pinned.key_id || live.public_key_spki_b64 !== pinned.public_key_spki_b64)) throw new Error('Live lab root does not match the root pinned in the public repository');
  return pinned || live;
};
const transport = async body => (await fetch(base + '/v1/authority-conformance', {method: 'POST', headers: {'Content-Type': 'application/json', 'User-Agent': 'amos-dogfood-rehearsal'}, body: JSON.stringify(body)})).json();
let result, error = null;
try { result = await runAuthorityConformance(transport, {fetchTrustRoot}); } catch (e) { error = String(e.message || e); }
const passedChecks = new Set(result?.checks || []);
const cases = matrix.cases.map(c => {
  if (c.proof_source !== 'live_lab_rehearsal') return {id: c.id, case: c.case, status: 'NOT RUN', reason: c.proof_source === 'private_ci_suite' ? 'proven by a private CI suite: ' + c.proof_checks.join('; ') : 'needs the team run: ' + (c.requires || []).join(', ')};
  const missing = c.proof_checks.filter(name => !passedChecks.has(name));
  return {id: c.id, case: c.case, expected: c.expected, status: !error && missing.length === 0 ? 'PASS' : 'FAIL', proof_checks: c.proof_checks, ...(missing.length ? {missing} : {})};
});
const report = {suite: 'internal-dogfood-lab-rehearsal', base, realm: 'amos-lab', trust_root_pinned: !!pinned, ran_at: new Date().toISOString(), runner_passed: result?.passed === true, runner_error: error,
  summary: Object.fromEntries(['PASS', 'FAIL', 'NOT RUN'].map(s => [s, cases.filter(c => c.status === s).length])), cases,
  boundary: 'Lab realm only. The team run (distinct AMOS team members, organisation-bound staging registry, 30 consecutive commits) is separate and not represented by this rehearsal.'};
fs.writeFileSync(out, JSON.stringify(report, null, 1));
console.log(JSON.stringify({summary: report.summary, runner_passed: report.runner_passed, runner_error: error}));
process.exitCode = report.summary.FAIL ? 1 : 0;
