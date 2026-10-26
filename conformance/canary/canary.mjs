// Read-only live canary. Node.js 24+, no dependencies or credentials. It checks that production still matches
// what this repository publishes: one serving revision equal to the newest release evidence, the generated client
// contract, the issuer-state vectors' bindings, receipt-verifier tamper rejection, refusal behaviour, cache and
// security headers, and that no public route carries private key material. It creates nothing and signs nothing.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2), base = args.includes('--base') ? args[args.indexOf('--base') + 1] : 'https://africanmarketos.com';
const origin = new URL(base); assert.equal(origin.protocol, 'https:'); assert.equal(origin.pathname, '/');
const output = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;
const checks = [], failures = [], revisions = new Map();
const PRIVATE_MARKERS = ['PRIVATE KEY-----', 'MC4CAQAw', '"d":"'];
async function probe(route, init = {}) {
  const started = Date.now();
  const response = await fetch(new URL(route, origin), {...init, redirect:'manual', signal:AbortSignal.timeout(20000)});
  const text = await response.text(); let body = null; try { body = JSON.parse(text); } catch {}
  const served = response.headers.get('x-mvr-deployment-revision'); if (served) revisions.set(route, served);
  return {status:response.status, headers:response.headers, text, body, ms:Date.now() - started};
}
async function check(name, run) {
  try { const detail = await run(); checks.push({name, passed:true, ...(detail ? {detail} : {})}); }
  catch (error) { failures.push({name, error:error.message.split('\n')[0].slice(0, 300)}); checks.push({name, passed:false}); }
}

// The newest published release is the one production must be serving.
const releases = fs.readdirSync(path.join(repo, 'release-evidence')).map(dir => path.join(repo, 'release-evidence', dir, 'deployment.json')).filter(fs.existsSync)
  .map(file => JSON.parse(fs.readFileSync(file, 'utf8'))).filter(d => d.deployment_revision && d.verified_at).sort((a, b) => Date.parse(b.verified_at) - Date.parse(a.verified_at));
const expectedRevision = args.includes('--expect-revision') ? args[args.indexOf('--expect-revision') + 1] : releases[0]?.deployment_revision;

const CONTRACTS = ['/v1/authority-chain/contract', '/v1/review-cases/contract', '/v1/review-sandbox/contract', '/v1/key-ceremony/status', '/v1/key-ceremony/contract', '/v1/authority-conformance/contract', '/v1/reviewer-attestations/contract'];
const responses = {};
await check('public contract routes answer 200 with no-store', async () => {
  for (const route of CONTRACTS) {
    const r = responses[route] = await probe(route);
    assert.equal(r.status, 200, route + ' status ' + r.status); assert(r.body, route + ' is JSON');
    assert.match(r.headers.get('cache-control') || '', /no-store/, route + ' cache-control');
    assert(r.ms < 15000, route + ' took ' + r.ms + ' ms');
  }
  return {routes:CONTRACTS.length};
});
await check('one serving revision, equal to the newest published release', async () => {
  const served = [...new Set(revisions.values())];
  assert.equal(served.length, 1, 'mixed revisions: ' + JSON.stringify(Object.fromEntries(revisions)));
  assert.equal(served[0], expectedRevision, 'production serves ' + served[0] + ' but the newest release evidence is ' + expectedRevision);
  return {revision:served[0]};
});
const openapi = await probe('/v1/openapi.json');
await check('the generated governance client matches the live contract', async () => {
  assert.equal(openapi.status, 200);
  const client = await import(pathToFileURL(path.join(repo, 'sdks/javascript/governance-client.mjs')).href);
  const published = fs.readFileSync(path.join(repo, 'sdks/javascript/governance-client.mjs'), 'utf8').match(/(?:Contract|operation) subset SHA-256: ([a-f0-9]{64})/i)?.[1];
  assert(published, 'client header names its contract hash');
  const subset = Object.values(client.GOVERNANCE_OPERATIONS).map(({method, path:route}) => {
    const op = openapi.body.paths?.[route]?.[method.toLowerCase()]; assert(op, 'live OpenAPI lacks ' + method + ' ' + route);
    return {path:route, method, request:op.requestBody?.content?.['application/json']?.schema || null, response:op.responses?.['200']?.content?.['application/json']?.schema || null};
  });
  const live = createHash('sha256').update(JSON.stringify(subset)).digest('hex');
  assert.equal(live, published, 'the live contract changed; regenerate sdks/javascript/governance-client.mjs');
  return {operations:subset.length, contract_subset_sha256:live};
});
await check('issuer-state vectors still bind the live engine', async () => {
  const vectors = JSON.parse(fs.readFileSync(path.join(repo, 'conformance/issuer-state-v2/vectors.json'), 'utf8'));
  const ontology = responses['/v1/authority-chain/contract'].body.action_ontology;
  assert.deepEqual([...ontology.entries.map(e => e.id), ...Object.keys(ontology.legacy_aliases)], vectors.constants.action_ids, 'live action catalogue differs from the vectors');
  assert.equal(openapi.body.info?.version, vectors.constants.issuer_review_engine_version, 'live engine version differs from the vectors');
  return {action_ids:vectors.constants.action_ids.length, engine:openapi.body.info.version};
});
await check('the public receipt verifier rejects tampering and unsessioned lab keys', async () => {
  const [receipt] = JSON.parse(fs.readFileSync(path.join(repo, 'conformance/authority/signed-receipts.json'), 'utf8'));
  const verify = async body => probe('/v1/authority-receipts/verify', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  const lab = await verify({receipt}); assert.equal(lab.status < 500, true); assert.equal(lab.body?.valid, false, 'a lab-key receipt verified without a session');
  const tampered = await verify({receipt:{...receipt, sequence:receipt.sequence + 1}}); assert.equal(tampered.body?.valid, false, 'a tampered receipt verified');
  return {lab_reason:lab.body?.reason || null, tampered_reason:tampered.body?.reason || null};
});
await check('protected routes refuse without credentials and never fail open', async () => {
  for (const [route, body] of [['/v1/authority-chain', {action:'get', kind:'anchor', id:'canary-probe'}], ['/v1/review-cases', {action:'get', case_id:'RC-' + '0'.repeat(64)}]]) {
    const r = await probe(route, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
    assert([401, 403].includes(r.status), route + ' answered ' + r.status + ' without a key');
  }
  const malformed = await probe('/v1/authority-conformance', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'canary-unknown'})});
  assert.equal(malformed.status, 422, 'malformed conformance request answered ' + malformed.status);
});
await check('the key ceremony status is coherent and the receipt registry is public-only', async () => {
  const status = responses['/v1/key-ceremony/status'].body;
  assert.equal(status.execution_authorized, false); assert.equal(status.grants_permission, false);
  const keyPresent = status.private_key_binding?.present === true, state = status.ceremony?.state;
  assert(keyPresent ? state === 'completed' || state === 'sealed' || status.ceremony_record_present === true : true, 'a key is bound without a ceremony record');
  const registry = await probe('/.well-known/mvr-signing-keys.json'); assert.equal(registry.status, 200);
  for (const key of registry.body?.keys || []) assert.match(key.public_key_spki_b64 || '', /^MCowBQYDK2VwAyEA/, 'registry entry is not an Ed25519 public key');
  return {ceremony_state:state || null, key_bound:keyPresent, registry_keys:(registry.body?.keys || []).length};
});
await check('no public route carries private key material', async () => {
  const pages = [...Object.values(responses).map(r => r.text), openapi.text, (await probe('/.well-known/mvr-signing-keys.json')).text, (await probe('/key-ceremony/')).text];
  for (const text of pages) for (const marker of PRIVATE_MARKERS) assert(!text.includes(marker), 'private marker ' + marker);
});
await check('the key ceremony page keeps its security headers', async () => {
  const page = await probe('/key-ceremony/');
  assert.equal(page.status, 200);
  const csp = page.headers.get('content-security-policy') || '';
  assert.match(csp, /default-src 'none'|default-src 'self'/, 'content security policy'); assert.match(page.headers.get('cache-control') || '', /no-store/);
  assert.equal(page.headers.get('x-frame-options')?.toUpperCase() || (/frame-ancestors 'none'/.test(csp) ? 'DENY' : null), 'DENY', 'framing allowed');
});

const report = {passed:failures.length === 0, base:origin.origin, expected_revision:expectedRevision, served_revisions:[...new Set(revisions.values())], checked_at:new Date().toISOString(), checks, failures, classification:'Read-only AMOS canary: no session, key, write or effect'};
if (output) fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', {flag:'wx'});
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
