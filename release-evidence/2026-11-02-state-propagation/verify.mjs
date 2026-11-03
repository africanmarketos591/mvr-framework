// Verifies the published state-propagation release evidence: file hashes, the credential scan and every claim the README makes.
// Usage: node release-evidence/2026-11-02-state-propagation/verify.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const dir = new URL('./', import.meta.url), read = name => fs.readFileSync(new URL(name, dir));
const sha = name => createHash('sha256').update(Buffer.from(read(name).toString('utf8').replace(/\r\n/g, '\n'))).digest('hex');
const manifest = JSON.parse(read('manifest.json'));
const listed = new Set(manifest.files.map(f => f.path));
for (const name of fs.readdirSync(dir)) if (!['manifest.json', 'SHA256SUMS.txt'].includes(name)) assert(listed.has(name), 'Unlisted file: ' + name);
for (const f of manifest.files) assert.equal(sha(f.path), f.sha256, 'Hash mismatch: ' + f.path);
assert.equal(manifest.credential_scan.hits, 0, 'credential scan');
const j = name => JSON.parse(read(name)), revision = manifest.deployment_revision;
assert.equal(revision, '2026-11-02.state-propagation.3');
const deployment = j('deployment.json'), local = j('local-acceptance.json');
assert.equal(deployment.deployment_revision, revision); assert.equal(deployment.provider_bytes_match, true); assert.equal(deployment.bindings_unchanged, true); assert.equal(deployment.renderer_unchanged, true);
assert.equal(deployment.release_manifest_id, manifest.release_manifest_id);
assert.equal(local.passed, true); assert.equal(local.commands, local.total); assert.equal(local.head, deployment.source_head, 'Local acceptance ran on the deployed source');
const committed = JSON.parse(fs.readFileSync(new URL('../../release-manifests/' + revision + '.json', dir), 'utf8'));
assert.equal(committed.manifest_id, deployment.release_manifest_id, 'the attested manifest is the deployed one');
const bound = (r, name) => { if (r.deployment_revision !== undefined || r.revision !== undefined) assert.equal(r.deployment_revision ?? r.revision, revision, name + ' revision'); if (r.release_manifest_id !== undefined) assert.equal(r.release_manifest_id, deployment.release_manifest_id, name + ' manifest'); };
// Release identity.
const drift = j('live-release-drift.json'); assert.equal(drift.passed, true); assert.deepEqual(drift.not_run, []); bound(drift, 'drift'); assert(drift.results.every(r => r.passed));
// R9 qualification: effect sets A and B, audit, relevance, contracts, both profiles.
const r9 = j('live-r9-qualification.json'); assert.equal(r9.passed, true); bound(r9, 'r9'); assert(r9.checks.every(c => c.passed));
assert.deepEqual(r9.parity_mismatches, [], 'no REST/MCP parity miss'); assert(Array.isArray(r9.retries), 'throttle and gateway retries are recorded');
for (const p of ['strict_calibrated', 'full_advisory']) {
  for (const set of ['A', 'B']) { const s = r9.scores[`effect_set_${set}_${p}`]; assert.equal(s.false_favorable, 0); assert.equal(s.market_agree, s.market_rows); assert.equal(s.missing_precedence, s.missing_rows); assert.equal(s.qualifier_precedence, s.qualifier_rows); assert.equal(s.external_authorized, 0); }
  assert.equal(r9.scores[`effect_set_A_${p}`].market_rows, 240); assert.equal(r9.scores[`effect_set_B_${p}`].market_rows, 80);
  const a = r9.scores['audit_' + p]; assert.equal(a.detected, '16/16'); assert.equal(a.route_level_false_permits, 0); assert.equal(a.clean_false_positives, '0/7'); assert.equal(a.controlling, '24/24'); assert.equal(a.targeted, '16/16'); assert.equal(a.internal_only_false_triggers, 0); assert.equal(a.missing_contract, 0);
}
assert.deepEqual(r9.scores.relevance, {internal_controls: 8, first_call: 16, preflight: 8, guided: 8, audit: 8, effect: 8});
// The set B first pass before the structural fix is kept as measured.
const b = j('live-effect-set-b-first-pass.json'); assert.equal(b.summary.market_agree, 64); assert.equal(b.summary.false_favorable, 16); assert.match(b.environment, /not a production call/);
// Interpretation lane, cross-tenant injection, Enterprise conformance realm and buyer adapter.
assert.equal(j('live-interpretation-submission.json').passed, true);
const xt = j('live-interpretation-submission-cross-tenant.json'); assert.equal(xt.passed, true); assert.deepEqual(xt.not_run, []);
// Disposition stratum at the scale R9 measured: 24 workflows, 6 + 12 routed tasks, 12 conditional and 24 insufficient external rows.
{ const st = j('live-interpretation-disposition-stratum.json'); assert.equal(st.passed, true); assert.equal(st.totals.slots, 24); assert(st.checks.every(c => c.passed === true));
  for (const [k, v] of [['routing_unrelated_vs_qualifies', '6/6'], ['routing_adverse_or_qualifying', '12/12'], ['supports_not_routed', '36/36'], ['qualify_external_conditional', '12/12'], ['reject_external_insufficient', '24/24'], ['effect_maps_changed', '24/24'], ['restored_after_withdraw', '3/3'], ['restored_after_supersede', '3/3']]) assert.equal(st.totals[k], v, 'stratum ' + k);
  assert.equal(st.totals.authority_or_execution_changed, 0); assert.equal(st.totals.ledger_authenticity_changed, 0); assert.equal(st.totals.authorized, 0); }
const ent = j('live-enterprise-conformance.json'); assert.equal(ent.passed, true); bound(ent, 'enterprise'); assert.deepEqual(ent.not_run, []); assert.equal(ent.effects_performed, 1); assert.equal(ent.root_pinned_from, 'trust/amos-conformance-trust-root.json');
assert(ent.checks.every(c => c.passed === true), 'every Enterprise realm check ran and passed');
const suite = j('live-buyer-executor-suite.json'); assert.equal(suite.passed, true); assert.equal(suite.total, 28);
// Earlier release suites, rerun on this revision.
const effect = j('live-effect-decision.json'); assert.equal(effect.passed, true); assert(effect.checks.length >= 122); assert.equal(effect.release_manifest_id, deployment.release_manifest_id);
const audit8 = j('live-audit-findings.json'); assert.equal(audit8.passed, true);
const dog = j('live-dogfood-rehearsal.json'); assert.equal(dog.runner_passed, true); assert.equal(dog.summary.FAIL, 0); assert.equal(dog.summary.PASS, 21); assert.equal(dog.trust_root_pinned, true);
{ const fp = j('live-favourable-path.json'); assert.equal(fp.passed, true); assert.equal(fp.checks.length, 85); assert.equal(fp.revision, revision); assert.equal(fp.session_closed, true); }
const issuer = j('live-issuer-state-v2.json'); assert.equal(issuer.passed, true); assert.equal(issuer.steps.length, 14); bound(issuer, 'issuer');
const receiver = j('live-receiver-staging.json'); assert.equal(receiver.passed, true); assert.equal(receiver.scenarios.length, 14); bound(receiver, 'receiver');
assert.equal(j('live-licensed.json').passed, true);
{ const lf = j('live-licensed-favourable.json'); assert.deepEqual(lf.findings, []); assert(lf.checks.length >= 25 && lf.checks.every(c => c.passed !== false));
  if (lf.cleanup_errors?.length) { const cleanup = j('live-licensed-favourable-cleanup.json'); assert.deepEqual(cleanup.map(c => c.credential_id).sort(), lf.credentials.map(c => c.credential_id).sort()); assert(cleanup.every(c => c.status === 'revoked')); } }
// Reports without a revision field ran after the deployment; the canary, run last, saw only this revision serving.
for (const name of ['live-interpretation-submission.json', 'live-interpretation-submission-cross-tenant.json', 'live-interpretation-disposition-stratum.json', 'live-audit-findings.json', 'live-dogfood-rehearsal.json', 'live-licensed-favourable.json']) {
  const r = j(name), at = r.started_at || r.ran_at; assert(at && Date.parse(at) > Date.parse(deployment.verified_at), name + ' ran after the deployment'); }
const canary = j('live-canary.json'); assert.equal(canary.passed, true); assert.deepEqual(canary.served_revisions, [revision]);
console.log(JSON.stringify({verified: true, revision, release_manifest_id: deployment.release_manifest_id, files: manifest.files.length}));
