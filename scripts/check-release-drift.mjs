#!/usr/bin/env node
// Release identity checks (mvr.release-manifest/1). Standard library only.
//   --offline  every committed release-manifests/*.json is content-addressed: manifest_id = MVRRM- + sha256(canonical body)[0:32].
//   --live     the live manifest equals the committed one for its revision; live OpenAPI, public MCP tool lists and published
//              contracts reproduce the bound hashes; responses name the manifest; generated clients reproduce from the live
//              OpenAPI. With MVR_API_KEY set, the licensed MCP tool lists are compared too; otherwise they are reported NOT RUN.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');
const canon = v => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v;
export const manifestId = body => 'MVRRM-' + sha(JSON.stringify(canon(body))).slice(0, 32);
const base = process.env.MVR_BASE_URL || 'https://africanmarketos.com';
const results = [], notRun = [], identity = {checked_at: new Date().toISOString(), base};
const check = (name, ok, detail) => { results.push({name, passed: !!ok, ...(detail === undefined ? {} : {detail})}); };
const dir = path.join(root, 'release-manifests');
const committed = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => ({file: f, manifest: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))})) : [];
for (const {file, manifest} of committed) {
  const {manifest_id, ...body} = manifest;
  check(`${file}: content-addressed`, manifest_id === manifestId(body), {manifest_id, recomputed: manifestId(body)});
  check(`${file}: named after its revision`, file === manifest.deployment_revision + '.json');
}
if (process.argv.includes('--live')) {
  const get = async (p, init = {}) => { const r = await fetch(base + p, {...init, headers: {'User-Agent': 'amos-release-drift', ...(init.headers || {})}, signal: AbortSignal.timeout(60000)}); return {status: r.status, headers: r.headers, text: await r.text()}; };
  const liveRes = await get('/.well-known/mvr-release-manifest.json');
  const live = JSON.parse(liveRes.text);
  const {manifest_id, ...body} = live;
  Object.assign(identity, {deployment_revision: live.deployment_revision, release_manifest_id: manifest_id});
  check('live manifest is content-addressed', manifest_id === manifestId(body), {manifest_id});
  const match = committed.find(c => c.manifest.deployment_revision === live.deployment_revision);
  check('live manifest is committed and attested in release-manifests/', !!match && JSON.stringify(match.manifest) === JSON.stringify(live), {revision: live.deployment_revision});
  const openapi = await get('/v1/openapi.json');
  check('live OpenAPI reproduces the bound hash', sha(openapi.text) === live.components.openapi.sha256, {live: sha(openapi.text), bound: live.components.openapi.sha256});
  check('API responses name the manifest', openapi.headers.get('X-MVR-Release-Manifest') === manifest_id);
  for (const [route, bound] of Object.entries(live.components.contracts)) { const r = await get(route); check('contract ' + route, r.status === 200 && sha(r.text) === bound); }
  const rpc = (headers = {}) => ({method: 'POST', headers: {'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers}, body: JSON.stringify({jsonrpc: '2.0', id: 1, method: 'tools/list'})});
  for (const [name, p] of [['consumer', '/mcp'], ['full', '/mcp/full'], ['preflight', '/mcp/preflight'], ['guided', '/mcp/guided'], ['openai', '/mcp/openai']]) {
    const r = await get(p, rpc());
    let tools = null; try { tools = JSON.parse(r.text).result.tools; } catch {}
    check('public MCP ' + name + ' tools/list', tools && sha(JSON.stringify(tools)) === live.components.mcp.public[name].tools_sha256);
  }
  if (process.env.MVR_API_KEY) for (const profile of ['full_advisory', 'strict_calibrated']) {
    const r = await get('/mcp/runtime', rpc({'X-API-Key': process.env.MVR_API_KEY, 'X-Response-Profile': profile}));
    let tools = null; try { tools = JSON.parse(r.text).result.tools; } catch {}
    check('licensed MCP ' + profile + ' tools/list', tools && sha(JSON.stringify(tools)) === live.components.mcp.licensed[profile].tools_sha256);
  } else notRun.push({check: 'licensed MCP tools/list hashes', reason: 'MVR_API_KEY not set'});
  try {
    fs.writeFileSync(path.join(root, '.live-openapi.json'), openapi.text);
    execFileSync(process.execPath, [path.join(root, 'scripts/generate-governance-client.mjs'), '--spec', path.join(root, '.live-openapi.json'), '--check'], {stdio: 'pipe'});
    check('generated clients reproduce from the live OpenAPI', true);
  } catch (e) { check('generated clients reproduce from the live OpenAPI', false, String(e.stdout || e.message).slice(0, 300)); }
  finally { fs.rmSync(path.join(root, '.live-openapi.json'), {force: true}); }
}
const failed = results.filter(r => !r.passed);
console.log(JSON.stringify({passed: failed.length === 0, checks: results.length, failed, not_run: notRun, ...identity, results: results.map(({name, passed}) => ({name, passed}))}, null, 1));
process.exitCode = failed.length ? 1 : 0;
