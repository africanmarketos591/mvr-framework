import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../../',import.meta.url),read=f=>JSON.parse(readFileSync(new URL(f,import.meta.url)));
const manifest=read('manifest.json');
assert.equal(manifest.contract_version,'amos.hosted-review-evidence/1');
for(const [file,hash]of Object.entries(manifest.sha256)){assert(!file.includes('..'));assert.equal(createHash('sha256').update(readFileSync(new URL(file,root))).digest('hex'),hash,file);}
const deploy=read('deployment.json'),live=read('live-acceptance.json'),local=read('local-acceptance.json'),ui=read('browser-acceptance.json');
assert.equal(deploy.deployment_revision,'2026-10-24.hosted-review.1');assert.equal(live.deployment_revision,deploy.deployment_revision);
assert.equal(local.source_head,deploy.source_head);assert(deploy.ci.length>0&&deploy.ci.every(x=>x.result==='success'));
for(const key of ['provider_bytes_match','bindings_unchanged','runtime_unchanged','renderer_unchanged','no_new_resources_requested'])assert.equal(deploy[key],true,key);
assert.equal(live.checks.length,24);assert.equal(live.session_closed,true);assert.equal(live.post_close_denial.http_status,401);assert.equal(live.production_account_identity_verified,false);assert.equal(live.credentials_published,false);
assert.equal(live.page_html_and_policy_verified,true);assert.equal(live.published_actions_verified,6);assert.equal(live.anonymous_production_access_denied,401);assert.equal(live.external_execution_authorized,false);
assert.equal(local.rest_checks,24);assert.equal(local.mcp_checks,24);assert.equal(local.evaluation_checks,24);assert.equal(local.workerd_checks,24);assert.equal(local.worker_regression_passed,156);assert.equal(local.authority_mutants_killed,14);
assert.equal(ui.passed,true);assert.equal(ui.session_closed,true);assert.equal(manifest.independent_institutional_authority_verified,false);
const test=spawnSync(process.execPath,[fileURLToPath(new URL('examples/decision-review-workbench/test.mjs',root))],{encoding:'utf8',windowsHide:true,timeout:60000});assert.equal(test.status,0,test.stderr);assert.equal(JSON.parse(test.stdout).exhaustive_oracle_cases,6912);
console.log(JSON.stringify({passed:true,files_verified:Object.keys(manifest.sha256).length,public_oracle_cases:6912,live_record_checks:24,note:'Hashes verify publication integrity. This offline run does not repeat private tests or the historical provider deployment. Use the live runner for a new hosted evaluation.'}));
