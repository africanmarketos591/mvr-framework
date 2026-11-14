// AMOS comparison harness: 56 pre-existing frozen cases x two profiles. Each layer receives exactly one request per cell.
import fs from 'node:fs';
import {createHash, randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';

const output = process.argv[2];
const key = process.env.MVR_API_KEY;
if (!key || !output) throw new Error('Set MVR_API_KEY and provide an output JSON path');
const base = 'https://africanmarketos.com';
const bytes = fs.readFileSync(new URL('../effect-decision/r9-heldout/cohort.json', import.meta.url));
const {cases} = JSON.parse(bytes);
if (cases.length !== 56) throw new Error('Expected the frozen 56-case set');
const manifest = await (await fetch(base + '/.well-known/mvr-release-manifest.json')).json();
const rows = [];
async function once(path, body, profile, expectedLayer) {
  const started = performance.now();
  try {
    const response = await fetch(base + path, {method: 'POST', redirect: 'error',
      headers: {'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'X-API-Key': key,
        'X-Response-Profile': profile, 'Idempotency-Key': randomUUID()}, body: JSON.stringify(body), signal: AbortSignal.timeout(60000)});
    const json = await response.json();
    const valid = expectedLayer === 'effect' ? Array.isArray(json.effects) && json.effects.length > 0 :
      !!json.result?.structuredContent && !json.result.isError && !json.error;
    return {http: response.status, release: response.headers.get('X-MVR-Release-Manifest'),
      ok: response.ok && valid && response.headers.get('X-MVR-Release-Manifest') === manifest.manifest_id,
      ms: Math.round(performance.now() - started), ...(valid ? {} : {code: json.code ?? json.error?.code ?? json.result?.structuredContent?.code ?? 'unexpected_response'})};
  } catch (e) { return {ok: false, error: e.cause?.code ?? e.name, ms: Math.round(performance.now() - started)}; }
}
for (const profile of ['full_advisory', 'strict_calibrated']) {
  for (const c of cases) {
    const country = c.request.market_scope?.country ?? 'KE';
    const question = c.first_call_task ?? 'Should ' + c.request.subject.entity_name + ' proceed with ' + c.request.requested_effects[0].description + '?';
    const params = {name: 'mvr_first_call', arguments: {decision_question: question, country, market_scope: {country}, company_name: c.request.subject?.entity_name ?? 'Internal operations'}};
    const primary = await once('/mcp/runtime', {jsonrpc: '2.0', id: rows.length + 1, method: 'tools/call', params}, profile, 'primary');
    const effect = await once('/v1/effect-decision', c.request, profile, 'effect');
    rows.push({case_id: c.case_id, profile, primary, effect});
  }
}
const summary = Object.fromEntries(['primary','effect'].map(layer => [layer, rows.filter(row => row[layer].ok).length]));
const report = {suite: 'AMOS 112-cell comparison', cohort_sha256: createHash('sha256').update(bytes).digest('hex'),
  deployment_revision: manifest.deployment_revision, manifest_id: manifest.manifest_id, retries: 0, cells: rows.length, summary, rows};
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({cells: rows.length, summary}));
process.exitCode = Object.values(summary).every(n => n === 112) ? 0 : 1;
