// Verifies the published effect-state release evidence: file hashes and every claim the README makes.
// Usage: node release-evidence/2026-11-01-effect-state/verify.mjs
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
assert.equal(revision, '2026-11-01.effect-state.2');
const deployment = j('deployment.json'), local = j('local-acceptance.json');
assert.equal(deployment.deployment_revision, revision); assert.equal(deployment.provider_bytes_match, true); assert.equal(deployment.bindings_unchanged, true); assert.equal(deployment.renderer_unchanged, true);
assert.equal(deployment.release_manifest_id, manifest.release_manifest_id);
assert.equal(local.passed, true); assert.equal(local.commands, local.total); assert.equal(local.head, deployment.source_head, 'Local acceptance ran on the deployed source');
const committed = JSON.parse(fs.readFileSync(new URL('../../release-manifests/' + revision + '.json', dir), 'utf8'));
assert.equal(committed.manifest_id, deployment.release_manifest_id, 'the attested manifest is the deployed one');
// R8 live results.
const drift = j('live-release-drift.json'); assert.equal(drift.passed, true); assert.deepEqual(drift.not_run, []); assert(drift.checks >= 23);
assert.equal(drift.deployment_revision, revision); assert.equal(drift.release_manifest_id, deployment.release_manifest_id); assert(drift.results.every(r => r.passed));
// Reports that do not carry the revision ran after the deployment; the canary, run last, saw only this revision serving.
for (const name of ['live-audit-findings.json', 'live-interpretation-submission.json', 'live-interpretation-submission-cross-tenant.json', 'live-dogfood-rehearsal.json', 'live-licensed-favourable.json']) {
  const r = j(name), at = r.started_at || r.ran_at; assert(at && Date.parse(at) > Date.parse(deployment.verified_at), name + ' ran after the deployment'); }
assert.deepEqual(j('live-canary.json').served_revisions, [revision], 'one serving revision at the end of the run');
const effect = j('live-effect-decision.json'); assert.equal(effect.passed, true); assert(effect.checks.length >= 122); assert.equal(effect.release_manifest_id, deployment.release_manifest_id);
const audit = j('live-audit-findings.json'); assert.equal(audit.passed, true);
for (const [cell, s] of Object.entries(audit.cells)) { assert.equal(s.passes_r8_bar, true, cell); assert.equal(s.clean_false_positives, 0, cell); assert.equal(s.critical_false_permits, 0, cell); assert(s.defects_detected >= 15, cell); }
assert(Object.keys(audit.cells).length >= 14, 'every route family in both profiles');
for (const name of ['live-interpretation-submission.json', 'live-interpretation-submission-cross-tenant.json']) assert.equal(j(name).passed, true, name);
assert.deepEqual(j('live-interpretation-submission-cross-tenant.json').not_run, [], 'cross-tenant injection ran');
const dog = j('live-dogfood-rehearsal.json'); assert.equal(dog.runner_passed, true); assert.equal(dog.summary.FAIL, 0); assert.equal(dog.summary.PASS, 21); assert.equal(dog.trust_root_pinned, true);
{ const fp = j('live-favourable-path.json'); assert.equal(fp.passed, true); assert.equal(fp.checks.length, 85); assert.equal(fp.revision, revision); assert.equal(fp.session_closed, true); }
const issuer = j('live-issuer-state-v2.json'); assert.equal(issuer.passed, true); assert.equal(issuer.steps.length, 14);
assert.equal(j('live-receiver-staging.json').passed, true);
assert.equal(j('live-licensed.json').passed, true);
// The licensed favourable run passed every check; its own cleanup could not write the revocations, so they were written
// separately and re-read (live-licensed-favourable-cleanup.json). Every listed credential must be revoked.
{ const lf = j('live-licensed-favourable.json'), cleanup = j('live-licensed-favourable-cleanup.json');
  assert.deepEqual(lf.findings, []); assert(lf.checks.length >= 25 && lf.checks.every(c => c.passed !== false));
  assert.deepEqual(cleanup.map(c => c.credential_id).sort(), lf.credentials.map(c => c.credential_id).sort()); assert(cleanup.every(c => c.status === 'revoked')); }
assert.equal(j('live-canary.json').passed, true);
console.log(JSON.stringify({verified: true, revision, release_manifest_id: deployment.release_manifest_id, files: manifest.files.length}));
