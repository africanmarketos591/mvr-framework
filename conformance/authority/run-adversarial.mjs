// Node.js 24+. No operator credentials or dependencies. Runs the adversarial authority suite against a live
// deployment in two isolated lab sessions (two of the hourly per-client allowance). Reports never contain tokens.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runAdversarialConformance} from './adversarial.mjs';
const args = process.argv.slice(2), base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'https://africanmarketos.com';
const origin = new URL(base); assert.equal(origin.protocol, 'https:'); assert.equal(origin.pathname, '/'); assert(!origin.username && !origin.password && !origin.search && !origin.hash);
const output = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;
let revision = null;
async function request(path, init = {}) {
  const response = await fetch(new URL(path, origin), {...init, redirect:'error', signal:AbortSignal.timeout(25000)});
  const served = response.headers.get('x-mvr-deployment-revision');
  if (served) { if (revision) assert.equal(served, revision, 'Serving revision changed during the run'); else revision = served; }
  return {...await response.json(), http_status:response.status};
}
const post = (path, body) => request(path, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
try {
  const result = await runAdversarialConformance(body => post('/v1/authority-conformance', body), {verifyReceipt:body => post('/v1/authority-receipts/verify', body), getPublic:path => request(path)});
  const report = {...result, revision, completed_at:new Date().toISOString(), base:origin.origin, credential_cleanup:'Both sessions closed and their next use rejected. Tokens are never written to the report.'};
  if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', {flag:'wx'});
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  // The suite closes every issued session in finally. Never print request bodies or tokens.
  console.error(JSON.stringify({passed:false, revision, message:error.message.split('\n')[0].slice(0, 300), classification:'AMOS lab verification'}));
  process.exitCode = 1;
}
