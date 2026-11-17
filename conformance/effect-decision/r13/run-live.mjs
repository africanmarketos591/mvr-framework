// Scores one frozen R13 blind set against a live deployment. Every case runs over REST in both response profiles and
// over licensed MCP in strict_calibrated. No retries. A strict-profile request for a country without strict calibration
// must be refused on every surface; those rows are reported separately, never as passes or misses.
//
//   MVR_API_KEY=... node conformance/effect-decision/r13/run-live.mjs blind-cases-c [--out result.json] [--base https://africanmarketos.com]
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const args = process.argv.slice(2), name = args.find(a => !a.startsWith('--')) || 'blind-cases-c';
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const BASE = opt('base') || 'https://africanmarketos.com', KEY = process.env.MVR_API_KEY;
if (!KEY) throw new Error('Set MVR_API_KEY');
const dir = new URL('./', import.meta.url);
const bytes = fs.readFileSync(new URL(name + '.json', dir));
const sha = createHash('sha256').update(bytes).digest('hex');
if (sha !== fs.readFileSync(new URL(name + '.sha256', dir), 'utf8').split(/\s+/)[0]) throw new Error(name + '.json changed after freezing');
const corrections = JSON.parse(fs.readFileSync(new URL('label-corrections.json', dir), 'utf8')).corrections.filter(c => c.file === name + '.json');
const cases = JSON.parse(bytes);
const manifest = await (await fetch(BASE + '/.well-known/mvr-release-manifest.json')).json();
const runs = cases.flatMap(c => [['strict_calibrated', 'REST'], ['full_advisory', 'REST'], ['strict_calibrated', 'MCP']].map(([profile, surface]) => ({c, profile, surface})));
const rows = [];
let pos = 0;
async function worker() {
  while (pos < runs.length) {
    const i = pos++, {c, profile, surface} = runs[i], mcp = surface === 'MCP';
    const expected = corrections.find(x => x.id === c.id)?.corrected ?? c.expected;
    const row = {id: c.id, category: c.category, grade: c.grade, expected, original_label: c.expected, profile, surface};
    try {
      const r = await fetch(BASE + (mcp ? '/mcp/runtime' : '/v1/effect-decision'), {method: 'POST', signal: AbortSignal.timeout(60000),
        headers: {'X-API-Key': KEY, 'Content-Type': 'application/json', 'X-Response-Profile': profile},
        body: JSON.stringify(mcp ? {jsonrpc: '2.0', id: i + 1, method: 'tools/call', params: {name: 'mvr_effect_decision', arguments: c.request}} : c.request)});
      const body = await r.json(), o = mcp ? body.result?.structuredContent : body;
      row.http = r.status; row.manifest_bound = r.headers.get('X-MVR-Release-Manifest') === manifest.manifest_id;
      if (profile === 'strict_calibrated' && o?.code === 'COUNTRY_NOT_STRICT_CALIBRATED') row.refused_by_design = true;
      const x = o?.effects?.find(e => e.effect_id === 'X'), p = o?.effects?.find(e => e.effect_id === 'P');
      Object.assign(row, {analytical: x?.analytical_evidence_status, authority: x?.institutional_authority_status, execution: x?.execution_authorization_status, planning: p?.execution_authorization_status, receipt: Boolean(o?.applicability_receipt?.receipt_id)});
    } catch (e) { row.error = e.name; }
    const stateOk = row.grade === 'exact' ? row.analytical === expected : row.grade === 'safety' ? Boolean(row.analytical) && row.analytical !== 'favorable' : row.authority === 'revoked';
    row.false_favorable = row.analytical === 'favorable' && expected !== 'favorable' && row.grade !== 'authority';
    row.pass = row.http === 200 && row.manifest_bound && row.execution !== 'authorized' && row.planning === 'planning_only' && row.receipt && stateOk;
    rows.push(row);
  }
}
await Promise.all([worker(), worker()]);
rows.sort((a, b) => a.id.localeCompare(b.id) || a.surface.localeCompare(b.surface) || a.profile.localeCompare(b.profile));
const scored = rows.filter(r => !r.refused_by_design);
const summary = {set: name, sha256: sha, deployment_revision: manifest.deployment_revision, manifest_id: manifest.manifest_id, calls: rows.length,
  cases_fully_passed: cases.filter(c => scored.filter(r => r.id === c.id).every(r => r.pass)).length + '/' + cases.length,
  rows_passed: scored.filter(r => r.pass).length + '/' + scored.length, false_favorable_cases: new Set(scored.filter(r => r.false_favorable).map(r => r.id)).size,
  execution_authorized_rows: rows.filter(r => r.execution === 'authorized').length, refused_by_design_rows: rows.length - scored.length,
  misses: [...new Set(scored.filter(r => !r.pass).map(r => r.id))]};
if (opt('out')) fs.writeFileSync(opt('out'), JSON.stringify({summary, rows}, null, 1));
console.log(JSON.stringify(summary, null, 1));
