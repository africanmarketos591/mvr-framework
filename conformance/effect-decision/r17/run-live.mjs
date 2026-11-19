// Scores a frozen R17 set against a live deployment, in both response profiles, with no retries.
//   MVR_API_KEY=... node conformance/effect-decision/r17/run-live.mjs r17-closure-holdout [--out result.json] [--base URL]
// Closure rows score the analytical state, the named open step and execution separately. Audit rows record HTTP refusals, unresolved
// results and route-level permits separately, and check the scoped controlling decision beside the reviewer-verification state.
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
const FIELD = {analytical: 'analytical_evidence_status', authority: 'institutional_authority_status', execution: 'execution_authorization_status', rule: 'precedence_rule'};
const low = v => JSON.stringify(v ?? null).toLowerCase();
async function work() {
  while (pos < jobs.length) {
    const {c, profile} = jobs[pos++];
    try {
      const r = await fetch(BASE + (audit ? c.route : '/v1/effect-decision'), {method: 'POST', signal: AbortSignal.timeout(90000), headers: {'X-API-Key': KEY, 'Content-Type': 'application/json', 'X-Response-Profile': profile, 'Idempotency-Key': crypto.randomUUID()}, body: JSON.stringify(audit ? c.body : c.request)});
      const b = await r.json(), bound = r.headers.get('X-MVR-Release-Manifest') === manifest.manifest_id;
      if (audit) {
        const f = b.audit_findings, codes = (f?.findings ?? []).map(x => x.defect_code), decision = b.route_audit_result?.controlling?.decision ?? null;
        const row = {id: c.case_id, profile, http: r.status, bound, outcome: f?.audit_outcome ?? null, codes, route_decision: decision, native_status: b.status ?? null, result_class: r.status >= 400 ? 'http_refusal' : !f ? 'unresolved' : decision === 'clear' ? 'route_permit' : decision === 'not_applicable' ? 'not_applicable' : 'route_hold_or_block'};
        const top = f?.findings?.[0], remediation = top?.smallest_remediation?.action ?? null, acceptance = top?.acceptance_condition ?? null, acceptText = low(acceptance), remedyText = low(remediation);
        // A verification warning beside a scoped clear is not disagreement; a strict blocker or a failed status is.
        row.native_agrees = decision !== 'clear' || (!(b.strict_mode_blockers?.length) && !['validation_failed', 'review_required', 'unsupported_claims_detected'].includes(b.status));
        const checks = {
          forbidden_codes: (c.forbidden_codes ?? []).every(x => !codes.includes(x)),
          no_strict_blockers: !c.no_strict_blockers || !(b.strict_mode_blockers?.length),
          advisory_note_kept: !c.advisory_note_kept || (b.advisory_scope_notes ?? []).length > 0,
          acceptance_mentions: (c.acceptance_must_mention ?? []).every(w => acceptText.includes(w.toLowerCase())),
          acceptance_not_generic: (c.acceptance_must_not_offer ?? []).every(w => !acceptText.includes(w.toLowerCase())),
          remediation_mentions: (c.remediation_must_mention ?? []).every(w => remedyText.includes(w.toLowerCase())),
          verification_state: !c.verification_state || b.route_audit_result?.verification?.status === c.verification_state};
        row.checks = checks;
        const extra = Object.values(checks).every(Boolean);
        if (c.expected_defect_code || (c.expected_route_decision === 'block' && !c.expected_outcome)) Object.assign(row, {kind: 'defect', detected: c.expected_defect_code ? codes.includes(c.expected_defect_code) : codes.length > 0, controlling: c.expected_defect_code ? codes[0] === c.expected_defect_code : codes.length > 0, bounded_remediation: !!remediation && !!acceptance && checks.acceptance_mentions && checks.acceptance_not_generic && checks.remediation_mentions, critical_false_permit: r.status < 400 && decision === 'clear'});
        else row.kind = c.calibration ? 'calibration' : c.expected_outcome === 'not_applicable' ? 'internal' : 'clean';
        if (row.kind === 'calibration') row.pass = bound && (profile === 'strict_calibrated' ? (r.status === 422 ? b.audit_performed === false && (b.route_audit_result?.controlling?.decision ?? 'unresolved') === 'unresolved' : decision === 'unresolved') : r.status === 200 && !!f?.audit_outcome && decision !== null);
        else row.pass = bound && r.status === 200 && decision === c.expected_route_decision && row.native_agrees && extra && (row.kind === 'defect' ? row.detected && row.controlling && row.bounded_remediation : f?.audit_outcome === c.expected_outcome);
        rows.push(row);
      } else for (const [effect, want] of Object.entries(c.expected)) {
        const e = b.effects?.find(x => x.effect_id === effect), row = {id: c.id, variant: c.variant, class: c.class, profile, effect, http: r.status, bound, analytical: e?.analytical_evidence_status, authority: e?.institutional_authority_status, execution: e?.execution_authorization_status, rule: e?.precedence_rule};
        row.false_favorable = row.analytical === 'favorable' && want.analytical !== 'favorable';
        row.state_pass = !!e && Object.entries(want).filter(([k]) => FIELD[k]).every(([k, v]) => e[FIELD[k]] === v);
        // The named step must be carried on the effect, linked to the record that states it, and into the effect's closure.
        if (want.names_step) { const step = want.names_step.toLowerCase(), named = (e?.open_conditions ?? []).filter(x => String(x.condition ?? '').toLowerCase().includes(step)); row.step_named = named.length > 0; row.step_linked = named.some(x => (x.record_ids ?? []).includes(want.step_record)); row.step_in_closure = low(e?.smallest_decisive_closure).includes(step); }
        row.closure_pass = !want.names_step || (row.step_named && row.step_linked && row.step_in_closure);
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
const per = p => { const x = rows.filter(r => r.profile === p); return audit ? {passed: x.filter(r => r.pass).length, rows: x.length, recall: `${x.filter(r => r.detected).length}/${x.filter(r => r.kind === 'defect').length}`, controlling: `${x.filter(r => r.controlling).length}/${x.filter(r => r.kind === 'defect').length}`, bounded_remediation: `${x.filter(r => r.bounded_remediation).length}/${x.filter(r => r.kind === 'defect').length}`, critical_false_permits: x.filter(r => r.critical_false_permit).length, clean_false_positives: x.filter(r => r.kind === 'clean' && !r.pass).length, http_refusals: x.filter(r => r.result_class === 'http_refusal').length}
  : {passed: x.filter(r => r.pass).length, rows: x.length, state: `${x.filter(r => r.state_pass).length}/${x.length}`, named_step: `${x.filter(r => r.step_named !== undefined && r.closure_pass).length}/${x.filter(r => r.step_named !== undefined).length}`, false_favorable: x.filter(r => r.false_favorable).length}; };
const summary = {set: name, sha256: sha, deployment_revision: manifest.deployment_revision, manifest_id: manifest.manifest_id, rows: rows.length, passed: rows.filter(r => r.pass).length, by_class: Object.fromEntries(Object.entries(classes).sort().map(([k, [a, n]]) => [k, `${a}/${n}`])), strict_calibrated: per('strict_calibrated'), full_advisory: per('full_advisory'), ...(audit ? {} : {false_favorable: rows.filter(r => r.false_favorable).length, execution_authorized: rows.filter(r => r.execution === 'authorized').length}), misses: [...new Set(rows.filter(r => !r.pass).map(r => r.id))]};
const out = {summary, rows};
if (opt('out')) fs.writeFileSync(opt('out'), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(summary, null, 1));
process.exitCode = summary.passed === summary.rows ? 0 : 1;
