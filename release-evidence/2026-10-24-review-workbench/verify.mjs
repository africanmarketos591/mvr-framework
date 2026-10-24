import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../../',import.meta.url),base='examples/decision-review-workbench/';
const files=['core.mjs','review.mjs','holds.mjs','counterfactual.mjs','cli.mjs','fixtures.mjs','test.mjs','demo.mjs','demo.html','demo-output.json','README.md'].map(f=>base+f).concat(['.github/workflows/review-workbench.yml','release-evidence/2026-10-24-review-workbench/verify.mjs']);
const hashes=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(new URL(f,root))).digest('hex')]));
function run(file,args=[]){const r=spawnSync(process.execPath,[fileURLToPath(new URL(file,root)),...args],{encoding:'utf8',timeout:60000,windowsHide:true});assert.equal(r.status,0,r.stderr||'TEST_FAILED');return JSON.parse(r.stdout);}
const tests=run(base+'test.mjs'),demo=run(base+'demo.mjs',['--check']);
assert.equal(tests.exhaustive_oracle_cases,6912);assert.equal(tests.test_groups,9);assert.equal(tests.passed,true);assert.equal(demo.passed,true);
const evidence={contract_version:'amos.review-workbench-evidence/1',classification:'public synthetic implementation tests; no live provider effect',source_sha256:hashes,tests,demo,external_authority_verified:false,production_deployment:false,human_time_savings_measured:false,paid_resources_required:false};
const target=new URL('evidence.json',import.meta.url);
if(process.argv.includes('--record'))writeFileSync(target,JSON.stringify(evidence,null,2)+'\n');else assert.deepEqual(JSON.parse(readFileSync(target,'utf8')),evidence,'EVIDENCE_OR_SOURCE_DRIFT');
console.log(JSON.stringify({passed:true,mode:process.argv.includes('--record')?'recorded':'reproduced',files_verified:files.length,test_groups:tests.test_groups,exhaustive_oracle_cases:tests.exhaustive_oracle_cases}));
