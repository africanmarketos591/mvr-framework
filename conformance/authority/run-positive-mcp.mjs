import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {runPositiveMcpFixture} from './positive-mcp-runner.mjs';
const arg=name=>{const index=process.argv.indexOf(name);return index<0?null:process.argv[index+1];};
const base=arg('--base'),output=arg('--output');
if(!base||!output||new URL(base).protocol!=='https:'||new URL(base).username||new URL(base).password)throw Error('Use --base https://your-authorized-host and --output new-result.json');
const keys={creator:process.env.AMOS_FIXTURE_CREATOR_KEY,reviewer:process.env.AMOS_FIXTURE_REVIEWER_KEY};
if(!keys.creator||!keys.reviewer||keys.creator===keys.reviewer)throw Error('Provide two separately provisioned lab account credentials through AMOS_FIXTURE_CREATOR_KEY and AMOS_FIXTURE_REVIEWER_KEY');
// Reserve the output before creating any remotely persisted lab records.
const fd=fs.openSync(output,'wx');
try{
 const input=JSON.parse(fs.readFileSync(new URL('./mcp-positive-input.json',import.meta.url)));
 const transport=async(path,body,profile,role)=>{
  const response=await fetch(new URL(path,base),{method:'POST',redirect:'error',signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json','X-API-Key':keys[role],'X-Response-Profile':profile,...(path==='/v1/evidence-review'?{'Idempotency-Key':'positive-'+randomUUID()}:{})},body:JSON.stringify(body)});
  const result=await response.json();
  if(JSON.stringify(result).includes(keys.creator)||JSON.stringify(result).includes(keys.reviewer))throw Error('Credential echo detected; response withheld');
  return {status:response.status,body:result};
 };
 const proof=await runPositiveMcpFixture(transport,input,'strict_calibrated');
 fs.writeFileSync(fd,JSON.stringify({recorded_at:new Date().toISOString(),host:new URL(base).origin,...proof},null,2)+'\n');
 console.log('Bounded five-stage fixture passed. See the output file for limitations and receipts.');
}catch(error){fs.writeFileSync(fd,JSON.stringify({passed:false,classification:'Incomplete lab run; no positive acceptance claimed',error_type:error.name},null,2)+'\n');console.error('Fixture failed. No positive acceptance is claimed. Inspect authorized server diagnostics; credentials and response bodies are withheld.');process.exitCode=1;}finally{fs.closeSync(fd);}
