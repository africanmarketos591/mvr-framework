#!/usr/bin/env node
// Runs the favourable-path conformance against the isolated AMOS lab.
//   node run-live.mjs [--lab https://africanmarketos.com] [--output report.json]
// Uses one lab session (sessions are limited per client address per UTC hour). Proprietary lab fixtures; lab keys.
import fs from 'node:fs';
import {runFavourablePath} from './runner.mjs';
const args=process.argv.slice(2),opt=n=>{const i=args.indexOf(n);return i>=0?args[i+1]:undefined;};
const lab=(opt('--lab')||'https://africanmarketos.com').replace(/\/$/,'');
let served=null;
const transport=async body=>{const r=await fetch(lab+'/v1/authority-conformance',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':'amos-favourable-path'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});served??=r.headers.get('X-MVR-Deployment-Revision');return r.json();};
let report;
try{report={...await runFavourablePath(transport),lab,revision:served};}
catch(error){report={passed:false,lab,revision:served,error:error.message.slice(0,2000)};}
if(opt('--output'))fs.writeFileSync(opt('--output'),JSON.stringify(report,null,1));
console.log(JSON.stringify({passed:report.passed,revision:report.revision,checks:report.checks?.length??0,requests:report.requests??null,error:report.error??null}));
process.exitCode=report.passed?0:1;
