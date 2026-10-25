// Verifies the published key ceremony release evidence: file hashes and the claims the README makes.
// Usage: node release-evidence/2026-10-25-key-ceremony/verify.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const dir = new URL('./', import.meta.url), read = name => fs.readFileSync(new URL(name, dir));
const sha = (name, bytes) => createHash('sha256').update(/\.(json|md|mjs)$/.test(name) ? Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n')) : bytes).digest('hex');
const manifest = JSON.parse(read('manifest.json'));
for (const f of manifest.files) assert.equal(sha(f.path, read(f.path)), f.sha256, 'Hash mismatch: ' + f.path);
const j = name => JSON.parse(read(name)), revision = manifest.deployment_revision;
const deployment = j('deployment.json'), local = j('local-acceptance.json'), production = j('live-ceremony-production.json'), rehearsal = j('rehearsal-live.json');
assert.equal(deployment.deployment_revision, revision); assert.equal(deployment.provider_bytes_match, true); assert.equal(deployment.bindings_unchanged, true); assert.equal(deployment.renderer_unchanged, true);
assert.equal(local.passed, true); assert.equal(local.commands, local.total); assert.equal(local.head, deployment.source_head, 'Local acceptance ran on the deployed source'); assert.equal(local.python_release_checks.passed, true);
assert(local.ceremony_suites.length >= 4 && local.ceremony_suites.every(s => s.exit === 0), 'Ceremony suites ran and passed');
assert.equal(production.passed, true); assert.equal(production.revision, revision); assert.equal(production.status.ceremony, 'not_started', 'No ceremony has run');
assert(production.checks.every(c => c.passed));
assert.equal(rehearsal.passed, true); assert.equal(rehearsal.checks.length, 18); assert.equal(rehearsal.cleanup_confirmed, true);
assert.equal(rehearsal.version_comparison.before.etag, rehearsal.version_comparison.after.etag, 'The rehearsal deployment ran identical code');
assert(rehearsal.probe.binding.extractable === false && rehearsal.probe.export_refused === true, 'The rehearsal key was not exportable');
assert(rehearsal.leak_scan.oauth_token_absent && rehearsal.leak_scan.placeholder_absent);
for (const name of ['page-check-production.json', 'rehearsal-page-check.json']) { const p = j(name); assert(p.passed && Object.values(p.flags).every(Boolean), name); }
const shape = j('production-api-shape.json'); assert.equal(shape.newest_version_is_deployed, true); assert.equal(shape.first_listed_version_is_newest, true); assert.deepEqual(shape.receipt_key_secrets_present, []);
assert.equal(j('live-release-gate.json').authority_leaks.length, 0); assert.equal(j('live-release-gate.json').protective_failures.length, 0);
assert.equal(j('live-authority-conformance.json').passed, true); assert.equal(j('live-licensed.json').passed, true);
assert.equal(j('live-permission-path.json').passed, true); assert.equal(j('live-original-review.json').passed, true);
const all = manifest.files.filter(f => f.path.endsWith('.json')).map(f => read(f.path).toString('utf8')).join('\n');
assert(!/"execution_authorized":\s*true/.test(all) && !/"external_action_authorized":\s*true/.test(all), 'No evidence file claims authorization');
assert(!/key_base64|PRIVATE KEY/.test(all), 'No private key material');
console.log(JSON.stringify({passed:true, revision, files:manifest.files.length, classification:'AMOS lab verification; the ceremony itself has not run'}));
