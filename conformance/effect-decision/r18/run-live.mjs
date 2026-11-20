// Scores a frozen R18 set against a live deployment, in both response profiles, with no retries.
//   MVR_API_KEY=... node conformance/effect-decision/r18/run-live.mjs r18-closure-holdout [--out result.json] [--base URL]
// Closure rows score the analytical state, whether the named step is open or closed, and execution, separately. Audit rows check the
// controlling decision and the targeted closure; first-call rows check the internal-only terminal outcome; the strict capability row
// checks the explicit capability outcome.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const args = process.argv.slice(2), name = args.find(a => !a.startsWith('--')), opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : null; };
const BASE = opt('base') || 'https://africanmarketos.com', KEY = process.env.MVR_API_KEY;
if (!KEY || !name) throw new Error('Set MVR_API_KEY and name a set');
const dir = new URL('./', import.meta.url), bytes = fs.readFileSync(new URL(name + '.json', dir)), sha = createHash('sha256').update(bytes).digest('hex');
if (sha !== fs.readFileSync(new URL(name + '.sha256', dir), 'utf8').split(/\s+/)[0]) throw new Error(name + '.json changed after freezing');
const cases = JSON.parse(bytes), audit = name.includes('audit'), manifest = await (await fetch(BASE + '/.well-known/mvr-release-manifest.json')).json();
const jobs = cases.flatMap(c => ['strict_calibrated', 'full_advisory'].map(profile => ({c, profile}))), rows = [];
let pos = 0;
const FIELD = {analytical: 'analytical_evidence_status', execution: 'execution_authorization_status'};
const low = v => JSON.stringify(v ?? null).toLowerCase();
async function work() {
  while (pos < jobs.length) {
    const {c, profile} = jobs[pos++];
    try {
      const r = await fetch(BASE + (audit ? c.route : '/v1/effect-decision'), {method: 'POST', signal: AbortSignal.timeout(90000), headers: {'X-API-Key': KEY, 'Content-Type': 'application/json', 'X-Response-Profile': profile, 'Idempotency-Key': crypto.randomUUID()}, body: JSON.stringify(audit ? c.body : c.request)});
      const b = await r.json(), bound = r.headers.get('X-MVR-Release-Manifest') === manifest.manifest_id;
      if (audit) {
        const row = {id: c.case_id, profile, http: r.status, bound};
        if (c.expected_first_call) {
          const terminal = b.status === 'not_relevant' && b.continuation_disposition === 'terminal';
          Object.assign(row, {kind: c.expected_first_call === 'terminal_not_relevant' ? 'internal_prose' : 'market_control', status: b.status ?? null, disposition: b.continuation_disposition ?? null});
          row.pass = bound && r.status === 200 && (c.expected_first_call === 'terminal_not_relevant' ? terminal : !terminal);
        } else if (c.capability_outcome) {
          const cap = b.capability_outcome, decision = b.route_audit_result?.controlling?.decision ?? null;
          Object.assign(row, {kind: 'capability', decision, capability: cap?.status ?? null});
          row.pass = bound && (profile === 'strict_calibrated' ? r.status === 422 && cap?.status === 'calibrated_assessment_unavailable' && cap?.supported_alternative?.profile === 'full_advisory' && !(b.audit_findings?.findings ?? []).some(f => /CALIBRATION/.test(f.defect_code)) && (decision ?? 'unresolved') === 'unresolved' : r.status === 200 && decision !== null);
        } else {
          const f = b.audit_findings, codes = (f?.findings ?? []).map(x => x.defect_code), decision = b.route_audit_result?.controlling?.decision ?? null, top = f?.findings?.[0];
          const acceptText = low(top?.acceptance_condition), remedyText = low(top?.smallest_remediation?.action);
          Object.assign(row, {kind: 'defect', codes, decision,
            acceptance_mentions: (c.acceptance_must_mention ?? []).every(w => acceptText.includes(w.toLowerCase())), acceptance_not_generic: (c.acceptance_must_not_offer ?? []).every(w => !acceptText.includes(w.toLowerCase())), remediation_mentions: (c.remediation_must_mention ?? []).every(w => remedyText.includes(w.toLowerCase()))});
          row.pass = bound && r.status === 200 && decision === c.expected_route_decision && codes.length > 0 && row.acceptance_mentions && row.acceptance_not_generic && row.remediation_mentions;
        }
        rows.push(row);
      } else for (const [effect, want] of Object.entries(c.expected)) {
        const e = b.effects?.find(x => x.effect_id === effect), row = {id: c.id, encoding: c.encoding, variant: c.variant, class: c.class, profile, effect, http: r.status, bound, analytical: e?.analytical_evidence_status, execution: e?.execution_authorization_status};
        row.false_favorable = row.analytical === 'favorable' && want.analytical !== 'favorable';
        row.state_pass = !!e && Object.entries(want).filter(([k]) => FIELD[k]).every(([k, v]) => e[FIELD[k]] === v);
        const conds = e?.open_conditions ?? [];
        if (want.names_step) { const s = want.names_step.toLowerCase(), open = conds.filter(x => String(x.condition ?? '').toLowerCase().includes(s) && x.status === 'open'); row.step_open = open.length > 0 && open.some(x => (x.record_ids ?? []).includes(want.step_record)); }
        if (want.step_closed) { const s = want.step_closed.toLowerCase(); row.step_closed = !conds.some(x => String(x.condition ?? '').toLowerCase().includes(s) && x.status === 'open'); }
        row.closure_pass = (!want.names_step || row.step_open) && (!want.step_closed || row.step_closed);
        row.pass = bound && r.status === 200 && row.state_pass && row.closure_pass && row.execution !== 'authorized';
        rows.push(row);
      }
    } catch (e) { rows.push({id: c.id ?? c.case_id, profile, error: e.name, pass: false}); }
  }
}
await Promise.all(Array.from({length: 4}, work));
rows.sort((a, b) => String(a.id).localeCompare(String(b.id)) || a.profile.localeCompare(b.profile) || String(a.effect ?? '').localeCompare(String(b.effect ?? '')));
const group = r => audit ? r.kind : r.class, classes = {};
for (const r of rows) { const k = group(r) ?? 'error'; classes[k] ??= [0, 0]; classes[k][1]++; if (r.pass) classes[k][0]++; }
const per = p => { const x = rows.filter(r => r.profile === p); return {passed: x.filter(r => r.pass).length, rows: x.length, ...(audit ? {} : {state: `${x.filter(r => r.state_pass).length}/${x.length}`, closure: `${x.filter(r => r.closure_pass).length}/${x.length}`, false_favorable: x.filter(r => r.false_favorable).length})}; };
const summary = {set: name, sha256: sha, deployment_revision: manifest.deployment_revision, manifest_id: manifest.manifest_id, rows: rows.length, passed: rows.filter(r => r.pass).length, by_class: Object.fromEntries(Object.entries(classes).sort().map(([k, [a, n]]) => [k, `${a}/${n}`])), strict_calibrated: per('strict_calibrated'), full_advisory: per('full_advisory'), ...(audit ? {} : {false_favorable: rows.filter(r => r.false_favorable).length, execution_authorized: rows.filter(r => r.execution === 'authorized').length}), misses: [...new Set(rows.filter(r => !r.pass).map(r => r.id))]};
const out = {summary, rows};
if (opt('out')) fs.writeFileSync(opt('out'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(summary, null, 1));
process.exitCode = summary.passed === summary.rows ? 0 : 1;
