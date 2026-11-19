// Scores a frozen R14 set against a live deployment, in both response profiles, with no retries.
//   MVR_API_KEY=... node conformance/effect-decision/r14/run-live.mjs r14-direct-holdout [--out result.json] [--base URL]
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const args = process.argv.slice(2), name = args.find(a => !a.startsWith('--')), opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const BASE = opt('base') || 'https://africanmarketos.com', KEY = process.env.MVR_API_KEY;
if (!KEY || !name) throw new Error('Set MVR_API_KEY and name a set');
const dir = new URL('./', import.meta.url), bytes = fs.readFileSync(new URL(name + '.json', dir)), sha = createHash('sha256').update(bytes).digest('hex');
if (sha !== fs.readFileSync(new URL(name + '.sha256', dir), 'utf8').split(/\s+/)[0]) throw new Error(name + '.json changed after freezing');
const corrections = JSON.parse(fs.readFileSync(new URL('../label-corrections-r16.json', import.meta.url), 'utf8')).corrections.filter(c => c.sets.includes(name));
const cases = JSON.parse(bytes).map(c => { for (const k of corrections) if (k.variants.includes(c.variant) && c.expected?.[k.effect_id]?.[k.field] === k.from) c.expected[k.effect_id] = {...c.expected[k.effect_id], [k.field]: k.to, label_corrected_from: k.from}; return c; }), audit = name.includes('audit'), manifest = await (await fetch(BASE + '/.well-known/mvr-release-manifest.json')).json();
const jobs = cases.flatMap(c => ['strict_calibrated', 'full_advisory'].map(profile => ({c, profile}))), rows = [];
let pos = 0;
async function work() {
  while (pos < jobs.length) {
    const {c, profile} = jobs[pos++];
    try {
      const r = await fetch(BASE + (audit ? c.route : '/v1/effect-decision'), {method: 'POST', signal: AbortSignal.timeout(90000), headers: {'X-API-Key': KEY, 'Content-Type': 'application/json', 'X-Response-Profile': profile, 'Idempotency-Key': crypto.randomUUID()}, body: JSON.stringify(audit ? c.body : c.request)});
      const b = await r.json(), bound = r.headers.get('X-MVR-Release-Manifest') === manifest.manifest_id;
      if (audit) {
        const f = b.audit_findings, first = f?.findings?.[0], hit = f?.findings?.find(x => x.defect_code === c.expected_defect_code);
        const row = {id: c.case_id, profile, http: r.status, bound, outcome: f?.audit_outcome ?? null, codes: (f?.findings ?? []).map(x => x.defect_code)};
        if (c.expected_defect_code) Object.assign(row, {kind: 'defect', detected: !!hit, false_permit: ['no_defects_found', 'not_applicable', null].includes(row.outcome), controlling: first?.defect_code === c.expected_defect_code, targeted: !!hit && Object.entries(c.expected_locus).every(([k, v]) => hit.locus?.[k] === v)});
        else row.kind = c.expected_outcome === 'not_applicable' ? 'internal' : 'clean';
        row.pass = bound && r.status === 200 && (row.kind === 'defect' ? row.detected && !row.false_permit && row.controlling && row.targeted : row.outcome === c.expected_outcome);
        rows.push(row);
      } else for (const [effect, want] of Object.entries(c.expected)) {
        const e = b.effects?.find(x => x.effect_id === effect), row = {id: c.id, variant: c.variant, profile, effect, http: r.status, bound, analytical: e?.analytical_evidence_status, authority: e?.institutional_authority_status, execution: e?.execution_authorization_status, rule: e?.precedence_rule, want};
        row.false_favorable = row.analytical === 'favorable' && !!want.analytical && want.analytical !== 'favorable';
        row.pass = bound && r.status === 200 && !!e && e.execution_authorization_status !== 'authorized' && Object.entries(want).filter(([k]) => k !== 'label_corrected_from').every(([k, v]) => row[k] === v);
        rows.push(row);
      }
    } catch (e) { rows.push({id: c.id ?? c.case_id, profile, error: e.name, pass: false}); }
  }
}
await Promise.all([work(), work()]);
const group = r => audit ? r.kind : r.variant, classes = {};
for (const r of rows) { const k = group(r) ?? 'error'; classes[k] ??= [0, 0]; classes[k][1]++; if (r.pass) classes[k][0]++; }
const summary = {set: name, sha256: sha, deployment_revision: manifest.deployment_revision, manifest_id: manifest.manifest_id, rows: rows.length, passed: rows.filter(r => r.pass).length, by_class: Object.fromEntries(Object.entries(classes).map(([k, [a, b]]) => [k, a + '/' + b])),
  ...(audit ? {detected: rows.filter(r => r.detected).length, false_permits: rows.filter(r => r.false_permit).length} : {false_favorable: rows.filter(r => r.false_favorable).length, execution_authorized: rows.filter(r => r.execution === 'authorized').length}), misses: [...new Set(rows.filter(r => !r.pass).map(r => r.id))]};
if (opt('out')) fs.writeFileSync(opt('out'), JSON.stringify({summary, rows}, null, 1));
console.log(JSON.stringify(summary, null, 1));
