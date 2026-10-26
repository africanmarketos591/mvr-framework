#!/usr/bin/env node
// Runs every published OpenAPI request example exactly as published, in each profile it claims, following its
// x-mvr-example run policy: dependency order, copied response fields and generated headers. A key that lacks a
// listed plan or role is reported as not_run with the reason, never as a pass.
//   MVR_API_KEY=... node run-examples.mjs [--base https://africanmarketos.com] [--spec openapi.json] [--roles admin,org_admin]
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export function examplePlan(spec){
  const rows=[];
  for(const [path,item] of Object.entries(spec.paths||{}))for(const [method,op] of Object.entries(item)){
    const content=op.requestBody?.content?.['application/json'];
    if(!content||content.example===undefined)continue;
    rows.push({path,method:method.toUpperCase(),example:content.example,policy:op['x-mvr-example']||{profiles:['full_advisory'],after:[],copy:[],headers:[],required_roles_any:[],plans:[]},access:op['x-mvr-access']||null});
  }
  // Order by dependencies so state-creating examples run first.
  const byPath=new Map(rows.map(r=>[r.path,r])),ordered=[],seen=new Set();
  const visit=(r,stack=new Set())=>{if(seen.has(r.path))return;if(stack.has(r.path))throw new Error('Example dependency cycle at '+r.path);stack.add(r.path);for(const dep of r.policy.after||[]){const d=byPath.get(dep);if(d)visit(d,stack);}seen.add(r.path);ordered.push(r);};
  for(const r of rows)visit(r);
  return ordered;
}

export async function runPublishedExamples({spec,call,keyRoles=[],keyPlan=null}){
  const results=[],responses=new Map();
  for(const row of examplePlan(spec)){
    for(const profile of row.policy.profiles||['full_advisory']){
      const roles=row.policy.required_roles_any||[],plans=row.policy.plans||[];
      if(roles.length&&!roles.some(r=>keyRoles.includes(r))){results.push({path:row.path,profile,result:'not_run',reason:'key lacks one of the roles: '+roles.join(', ')});continue;}
      if(keyPlan&&plans.length&&!plans.includes(keyPlan)){results.push({path:row.path,profile,result:'not_run',reason:'key plan '+keyPlan+' not in '+plans.join(', ')});continue;}
      const body=structuredClone(row.example);
      let missingDependency=null;
      for(const c of row.policy.copy||[]){const prior=responses.get(c.from_route+'|'+profile);if(!prior||prior[c.response_field]===undefined){missingDependency=c.from_route;break;}body[c.request_field]=prior[c.response_field];}
      if(missingDependency){results.push({path:row.path,profile,result:'failed',reason:'dependency example did not return its field: '+missingDependency});continue;}
      const headers=Object.fromEntries((row.policy.headers||[]).map(h=>[h,'examples-'+randomUUID()]));
      const r=await call(row.path,row.method==='POST'?body:null,{profile,headers});
      responses.set(row.path+'|'+profile,r.body||{});
      const ok=r.status<400&&!['invalid_input','validation_failed','error'].includes(r.body?.status);
      results.push({path:row.path,profile,result:ok?'passed':'failed',status:r.status,code:r.body?.code||r.body?.error?.code||null,error:typeof r.body?.error==='string'?r.body.error.slice(0,240):null,details:Array.isArray(r.body?.details)?r.body.details.slice(0,3):undefined});
    }
  }
  const failed=results.filter(r=>r.result==='failed'),notRun=results.filter(r=>r.result==='not_run');
  return {passed:failed.length===0,run:results.length-notRun.length,failed:failed.length,not_run:notRun.length,results};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const args=process.argv.slice(2),opt=n=>{const i=args.indexOf(n);return i>=0?args[i+1]:undefined;};
  const base=(opt('--base')||'https://africanmarketos.com').replace(/\/$/,''),key=process.env.MVR_API_KEY;
  if(!key){console.error('Set MVR_API_KEY.');process.exit(2);}
  const spec=opt('--spec')?JSON.parse(fs.readFileSync(opt('--spec'),'utf8')):await (await fetch(base+'/v1/openapi.json',{headers:{'User-Agent':'amos-example-runner'}})).json();
  const call=async(path,body,{profile,headers})=>{const r=await fetch(base+path,{method:body===null?'GET':'POST',headers:{'Content-Type':'application/json','User-Agent':'amos-example-runner','X-API-Key':key,'X-Response-Profile':profile,...headers},...(body===null?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(90000)});let json=null;try{json=await r.json();}catch{}return {status:r.status,body:json};};
  const report=await runPublishedExamples({spec,call,keyRoles:(opt('--roles')||'').split(',').filter(Boolean),keyPlan:opt('--plan')||null});
  console.log(JSON.stringify(report,null,1));process.exitCode=report.passed?0:1;
}
