// Verifies the published favourable-path release evidence: file hashes and every claim the README makes.
// Usage: node release-evidence/2026-10-26-favourable-path/verify.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const dir = new URL('./', import.meta.url), read = name => fs.readFileSync(new URL(name, dir));
const sha = (name, bytes) => createHash('sha256').update(/\.(json|md|mjs)$/.test(name) ? Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n')) : bytes).digest('hex');
const manifest = JSON.parse(read('manifest.json'));
const listed = new Set(manifest.files.map(f => f.path));
for (const name of fs.readdirSync(dir)) if (name !== 'manifest.json') assert(listed.has(name), 'Unlisted file: ' + name);
for (const f of manifest.files) assert.equal(sha(f.path, read(f.path)), f.sha256, 'Hash mismatch: ' + f.path);
const j = name => JSON.parse(read(name)), revision = manifest.deployment_revision;
assert.equal(revision, '2026-10-26.favourable-path.2');
const names = report => (report.checks || []).map(c => typeof c === 'string' ? c : c.name);
const has = (report, part, label) => assert(names(report).some(n => n.includes(part)), (label || 'missing check') + ': ' + part);

// Deployment and local acceptance on the deployed source.
const deployment = j('deployment.json'), local = j('local-acceptance.json');
assert.equal(deployment.deployment_revision, revision); assert.equal(deployment.provider_bytes_match, true); assert.equal(deployment.bindings_unchanged, true); assert.equal(deployment.renderer_unchanged, true);
assert.equal(local.passed, true); assert.equal(local.commands, local.total); assert.deepEqual(local.failed, []); assert.equal(local.head, deployment.source_head, 'Local acceptance ran on the deployed source'); assert.equal(local.python_release_checks.passed, true);
const SUITES = ['test-decision-state', 'test-decision-review-licensed', 'test-mcp-passage-interpretations', 'test-favourable-path-workerd', 'test-receiver-http-workerd', 'test-issuer-state-live-workerd', 'test-credential-classification', 'test-published-examples', 'test-authority-response-invariants', 'pilot-study/test', 'decision-state/test'];
for (const s of SUITES) { const row = local.release_suites.find(r => r.command.includes(s)); assert(row, 'Suite not run: ' + s); assert.equal(row.exit, 0, 'Suite failed: ' + s); }
const report = part => Object.entries(local.suite_reports).find(([command]) => command.includes(part))?.[1];
assert(report('test-favourable-path-workerd').checks >= 80, 'Favourable path in workerd');
assert.equal(report('test-authority-response-invariants').passed, true);

// P1 and P2 and P3 in the production lab.
const fav = j('live-favourable-path.json');
assert.equal(fav.passed, true); assert.equal(fav.revision, revision); assert.equal(fav.session_closed, true);
for (const part of ['acceptance 1', 'acceptance 2', 'acceptance 3', 'acceptance 4', 'explicit prohibition routed to its exact passage', 'the model reading did not change the claim', 'disagreement between models is captured',
  'the statement says who asserted', 'the verifier refuses a broadened effect', 'the commit receipt carries the decision basis', 'the customer receiver performs the committed effect exactly once', 'a forged journal entry fails replay']) has(fav, part, 'Favourable path');
const finalTargets = Object.fromEntries((fav.final_targets || []).map(t => [t.target, t.state]));
assert(Object.keys(finalTargets).length >= 3, 'Final targets recorded');

// Issuer-state/2 with the exact fixture: after 14/14; before, the alias was left open.
const issuer = j('live-issuer-state-v2.json'), before = j('issuer-state-v2-live-before.json');
assert.equal(issuer.passed, true); assert.equal(issuer.revision, revision); assert.equal(issuer.action, 'create_draft_record'); assert.equal(issuer.steps.length, 14); assert(issuer.steps.every(s => s.passed));
assert.equal(before.steps.length, 14); assert.equal(before.steps.filter(s => s.passed).length, 12);
const aliasBefore = before.steps.find(s => s.name.includes('binds the canonical alias'));
assert.equal(aliasBefore.passed, false); assert.equal(aliasBefore.observed, 'planning_only', 'Before: the alias of a prohibited action stayed planning_only');
assert.equal(issuer.steps.find(s => s.name.includes('binds the canonical alias')).passed, true);

// P4 receiver against the reference staging receiver.
const receiver = j('live-receiver-staging.json');
assert.equal(receiver.passed, true); assert.equal(receiver.revision, revision);
assert.deepEqual(receiver.restart, {first_performed:true, after_restart_performed:false, after_restart_already_performed:true});
assert.deepEqual(receiver.health.in_doubt, []); assert(receiver.scenarios.length >= 10 && receiver.scenarios.every(s => s.passed));

// Licensed production checks.
const lic = j('live-licensed-favourable.json');
assert.equal(lic.passed, true); assert.equal(lic.revision, revision); assert.deepEqual(lic.findings, []); assert.deepEqual(lic.cleanup_errors, []); assert(lic.checks.every(c => c.passed));
for (const part of ['twenty unknown keys', 'designated reviews reach the internal recommendation', 'one adverse claim withdraws only the effects that use it', 'the public replay reproduces the production journal',
  'both prose cases route the exact passage', 'conditional and negated wording is review-first', 'tasks never echo the passage text', 'routes the exact passage on REST and on the MCP decision-check tool', 'a supporting model reading clears nothing',
  'standing', 'every live authority response validates', 'every published example passes as published', 'clients pin the revision']) has(lic, part, 'Licensed');
const reg = j('live-licensed.json'); assert.equal(reg.passed, true); assert.equal(reg.revision, revision); assert(reg.checks.every(c => c.passed));

// Examples sent unchanged, before and after (no dependency handling; recorded, not judged).
const exAfter = j('live-examples-unchanged.json'), exBefore = j('examples-unchanged-before.json');
assert.deepEqual(exAfter.served_revisions, [revision]); assert.deepEqual(exAfter.cleanup_errors, []);
const failing = r => r.results.filter(x => x.status >= 400).length;
const examples = {before:{rows:exBefore.results.length, failing:failing(exBefore)}, after:{rows:exAfter.results.length, failing:failing(exAfter)}};

// Clean room, authority conformance, adversarial, canary, Python vectors, regressions.
const evaluation = j('live-clean-room-evaluation.json'); assert.equal(evaluation.passed, true); assert.equal(evaluation.session_closed, true); assert.equal(evaluation.revision, revision);
const conformance = j('live-authority-conformance.json'); assert.equal(conformance.passed, true); assert.equal(conformance.revision, revision); assert.equal(conformance.receiver_kit?.passed, true, 'Receiver kit passed live');
const adversarial = j('live-adversarial.json'); assert.equal(adversarial.passed, true); assert.equal(adversarial.revision, revision); assert.equal(adversarial.sessions, 2); assert.deepEqual(adversarial.skipped, []);
for (const category of ['cross_tenant', 'confused_deputy', 'replay', 'altered_receipt', 'race', 'secret_export']) assert(adversarial.categories[category] >= 1, category);
const canary = j('live-canary.json'); assert.equal(canary.passed, true); assert.equal(canary.expected_revision, revision); assert.deepEqual(canary.served_revisions, [revision]);
const vectors = j('issuer-state-v2-check.json'); assert.equal(vectors.passed, true);
assert.equal(j('live-release-gate.json').authority_leaks.length, 0); assert.equal(j('live-release-gate.json').protective_failures.length, 0);
assert.equal(j('live-permission-path.json').passed, true); assert.equal(j('live-permission-path.json').revision, revision);
assert.equal(j('live-original-review.json').passed, true);
const ceremony = j('live-ceremony-production.json'); assert.equal(ceremony.passed, true); assert.equal(ceremony.revision, revision); assert.equal(ceremony.status.ceremony, 'not_started', 'No ceremony has run');
const page = j('page-check-production.json'); assert(page.passed && Object.values(page.flags).every(Boolean), 'Ceremony page');
const shape = j('production-api-shape.json'); assert.equal(shape.newest_version_is_deployed, true); assert.deepEqual(shape.receipt_key_secrets_present, []);

// Nothing claims authorization, and no secret is published.
const all = manifest.files.filter(f => f.path.endsWith('.json')).map(f => read(f.path).toString('utf8')).join('\n');
assert(!/"execution_authorized":\s*true/.test(all) && !/"external_action_authorized":\s*true/.test(all), 'No evidence file claims authorization');
assert(!/PRIVATE KEY-----|MC4CAQAw/.test(all), 'No private key material');
assert(!/"X-API-Key"\s*:\s*"[^"]{20,}"/i.test(all) && !/"session_token"\s*:\s*"[^"]{16,}"/.test(all), 'No key or session token values');
console.log(JSON.stringify({passed:true, revision, files:manifest.files.length, examples_sent_unchanged:examples, classification:'AMOS lab verification; not independent review'}));
