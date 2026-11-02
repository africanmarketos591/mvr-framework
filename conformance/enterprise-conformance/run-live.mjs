#!/usr/bin/env node
// Live Enterprise conformance realm run: the shared flow (flow.mjs) against production with your Enterprise key.
// A second key in another tenant (MVR_API_KEY_OTHER_TENANT) runs the cross-tenant check; without it that check is NOT RUN.
// The Enterprise root is pinned from this repository (trust/amos-conformance-trust-root.json) when the file exists.
//   MVR_API_KEY=... [MVR_API_KEY_OTHER_TENANT=...] node conformance/enterprise-conformance/run-live.mjs --output result.json [--base https://africanmarketos.com]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {runEnterpriseConformanceFlow} from './flow.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const arg = name => { const i = process.argv.indexOf('--' + name); return i > 0 ? process.argv[i + 1] : null; };
const base = arg('base') || 'https://africanmarketos.com', output = arg('output');
const keys = {enterprise: process.env.MVR_API_KEY, other_tenant: process.env.MVR_API_KEY_OTHER_TENANT || null};
if (!keys.enterprise || !output) { console.error('Set MVR_API_KEY and pass --output <file>.'); process.exit(2); }
const ua = {'User-Agent': 'amos-enterprise-conformance', Accept: 'application/json'};
const fetchImpl = (url, init = {}) => fetch(url, {...init, headers: {...ua, ...(init.headers || {})}, signal: init.signal ?? AbortSignal.timeout(60000)});
const conformance = async (body, {key} = {}) => {
  const r = await fetchImpl(base + '/v1/authority-conformance', {method: 'POST', headers: {'Content-Type': 'application/json', ...(key ? {'X-API-Key': keys[key]} : {})}, body: JSON.stringify(body)});
  const j = await r.json(); return {...j, http_status: j.http_status ?? r.status};
};
const get = async p => (await fetchImpl(base + p)).json();
const effectDecision = async (body, key) => {
  if (!keys[key]) return {effects: [{execution_authorization_status: 'not_authorized', authority_reason_codes: ['CONFORMANCE_SESSION_NOT_THIS_TENANT'], not_run: true}]};
  return (await fetchImpl(base + '/v1/effect-decision', {method: 'POST', headers: {'Content-Type': 'application/json', 'X-API-Key': keys[key], 'X-Response-Profile': 'full_advisory'}, body: JSON.stringify(body)})).json();
};
const pinFile = path.join(here, '..', '..', 'trust', 'amos-conformance-trust-root.json'), labPinFile = path.join(here, '..', '..', 'trust', 'amos-lab-trust-root.json');
const pinnedEnterpriseRoot = fs.existsSync(pinFile) ? JSON.parse(fs.readFileSync(pinFile, 'utf8')).trust_root : null;
const pinnedLabRoot = fs.existsSync(labPinFile) ? JSON.parse(fs.readFileSync(labPinFile, 'utf8')).trust_root : null;
const manifest = await get('/.well-known/mvr-release-manifest.json');
const started = new Date().toISOString();
const result = await runEnterpriseConformanceFlow({conformance, get, effectDecision, fetchImpl, base, pinnedEnterpriseRoot, pinnedLabRoot});
const notRun = keys.other_tenant ? [] : [{check: 'another tenant cannot reference the session', reason: 'MVR_API_KEY_OTHER_TENANT not set'}];
if (!keys.other_tenant) for (const c of result.checks) if (c.name === 'another tenant cannot reference the session') { c.passed = null; c.not_run = true; }
const report = {suite: 'enterprise-conformance-live', base, started_at: started, finished_at: new Date().toISOString(), deployment_revision: manifest.deployment_revision, release_manifest_id: manifest.manifest_id,
  classification: 'proprietary lab fixtures; one harmless draft record (amos-lab, amount 0, no external contact); the Enterprise conformance realm asserts no institutional standing',
  root_pinned_from: pinnedEnterpriseRoot ? 'trust/amos-conformance-trust-root.json' : 'served root (pin file absent)', ...result, passed: result.checks.every(c => c.passed !== false), not_run: notRun};
fs.writeFileSync(output, JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify({passed: report.passed, checks: result.checks.length, failed: result.checks.filter(c => c.passed === false).map(c => c.name), not_run: notRun.length, effects_performed: result.effects_performed}));
process.exitCode = report.passed ? 0 : 1;
