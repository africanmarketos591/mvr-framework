import assert from 'node:assert/strict';
import fs from 'node:fs';
import {runProtectedMcpFixture} from './protected-mcp-runner.mjs';
const profile=process.argv[2];assert(['full_advisory','strict_calibrated'].includes(profile),'Choose full_advisory or strict_calibrated');
const base=new URL(process.env.AMOS_BASE_URL||'https://africanmarketos.com');assert(base.protocol==='https:'&&!base.username&&!base.password&&!base.search&&!base.hash,'HTTPS origin required');
const creator=process.env.AMOS_CREATOR_KEY,reviewer=process.env.AMOS_REVIEWER_KEY;assert(creator&&reviewer,'Set AMOS_CREATOR_KEY and AMOS_REVIEWER_KEY in the host environment');
const fixture=JSON.parse(fs.readFileSync(new URL('./mcp-'+profile+'.json',import.meta.url)));
const transport=async(path,body,responseProfile,role)=>{const response=await fetch(new URL(path,base),{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json','X-API-Key':role==='reviewer'?reviewer:creator,'X-Response-Profile':responseProfile},body:JSON.stringify(body)});return {status:response.status,body:await response.json()};};
try{console.log(JSON.stringify(await runProtectedMcpFixture(transport,fixture),null,2));}catch(error){console.error('Protected MCP rerun failed: '+error.message.replaceAll(creator,'[redacted]').replaceAll(reviewer,'[redacted]'));process.exitCode=1;}
