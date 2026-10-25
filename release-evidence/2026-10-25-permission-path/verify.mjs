// Verifies the published permission-path release evidence: file hashes and the claims the README makes.
// Usage: node release-evidence/2026-10-25-permission-path/verify.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const dir=new URL('./',import.meta.url),read=name=>fs.readFileSync(new URL(name,dir));
const sha=(name,bytes)=>createHash('sha256').update(/\.(json|md|mjs)$/.test(name)?Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n')):bytes).digest('hex');
const manifest=JSON.parse(read('manifest.json'));
for(const f of manifest.files)assert.equal(sha(f.path,read(f.path)),f.sha256,'Hash mismatch: '+f.path);
const j=name=>JSON.parse(read(name));
const deployment=j('deployment.json'),local=j('local-acceptance.json'),live=j('live-permission-path.json'),conformance=j('live-authority-conformance.json'),licensed=j('live-licensed.json'),gate=j('live-release-gate.json'),original=j('live-original-review.json'),corpus=j('pdf-corpus-statistics.json');
const revision=manifest.deployment_revision;
assert.equal(deployment.deployment_revision,revision);assert.equal(deployment.provider_bytes_match,true);assert.equal(deployment.bindings_unchanged,true);assert.equal(deployment.renderer_unchanged,true);assert.equal(deployment.no_new_resources_requested,true);
assert.equal(local.passed,true);assert.equal(local.head,deployment.source_head,'Local acceptance ran on the deployed source');assert(Object.values(local.browser.flags).every(Boolean)&&local.browser.page_errors.length===0,'Every browser flag passed');assert.equal(local.browser_focus_regression.note_intact,true);assert.equal(local.python_release_checks.passed,true);assert.equal(local.commands,local.total,'Every worker-ci.yml node command ran');assert.equal(local.failed.length,0);
assert.equal(live.passed,true);assert.equal(live.revision,revision);assert(live.checks.every(c=>c.passed));assert.equal(live.credentials_published,false);
assert(live.registers.length===7&&live.registers.every(r=>r.status==='retrieved'),'All seven public registers retrieved live');
assert(Object.values(live.pdf.independent_verification).every(Boolean),'Live PDF receipt verified independently');
assert.equal(conformance.passed,true);assert(conformance.checks.includes('commit-time check stops an effect revoked after verification'));assert(conformance.receipt_kinds.includes('commit'));
assert.equal(conformance.committed_executor_harness.post_verification_race_closed_up_to_commit,true);
assert.equal(licensed.passed,true);assert(licensed.checks.every(c=>c.passed));assert(licensed.credentials.length===3&&licensed.credentials.every(c=>c.revocation_observed===true&&c.provider_status==='revoked'));
assert.equal(gate.authority_leaks.length,0);assert.equal(gate.protective_failures.length,0);
assert.equal(original.passed,true);assert.equal(original.session_closed,true);
const superseded=j('superseded-builds.json');assert.equal(superseded.current,revision);assert.equal(superseded.superseded.length,2);
for(const [i,build] of superseded.superseded.entries()){const run=j('superseded-permission-path-'+(i+1)+'-live-licensed.json');
  assert.equal(build.deployment_revision,'2026-10-25.permission-path.'+(i+1));assert.equal(run.passed,false);assert.deepEqual(build.failed_licensed_checks,run.findings);
  assert(run.credentials.every(c=>c.revocation_observed===true),'Superseded run keys revoked');
  for(const name of run.checks.filter(c=>!c.passed).map(c=>c.name))assert(licensed.checks.some(c=>c.name===name&&c.passed),'Fixed in this release: '+name);}
const attempt1=j('live-permission-path-attempt-1.json');assert.equal(attempt1.revision,revision);assert.equal(attempt1.passed,false);
assert(attempt1.registers.filter(r=>r.status!=='retrieved').every(r=>/^REGISTER_[A-Z_]+$/.test(r.reason)&&r.response_sha256===null),'Unavailable registers failed closed');
assert(corpus.files>=50&&corpus.extracted+corpus.refused===corpus.files&&corpus.unmapped_glyphs===0);
const all=[...manifest.files.filter(f=>f.path.endsWith('.json')).map(f=>read(f.path).toString('utf8'))].join('\n');
assert(!/"execution_authorized":\s*true/.test(all),'No evidence file claims execution authorization');
assert(!/"external_action_authorized":\s*true/.test(all),'No evidence file claims external action authorization');
console.log(JSON.stringify({passed:true,revision,files:manifest.files.length,classification:'AMOS lab verification; not independent review or customer validation'}));
