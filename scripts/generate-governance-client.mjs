#!/usr/bin/env node
// Generates the AMOS governance clients from an OpenAPI contract:
//   sdks/javascript/governance-client.mjs + governance-client.d.ts, and sdks/python/governance_client.py.
//   node scripts/generate-governance-client.mjs [--spec openapi.json|https://africanmarketos.com/v1/openapi.json] [--check]
// --check fails when the committed files differ from what this contract generates. Standard library only.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';

export const GOVERNANCE_OPERATIONS_LIST=['/v1/review-cases','/v1/review-cases/contract','/v1/review-sandbox','/v1/review-sandbox/contract','/v1/authority-chain','/v1/authority-chain/contract','/v1/authority-receipts/verify','/v1/reviewer-attestations','/v1/reviewer-attestations/contract','/v1/authority-conformance','/v1/key-ceremony','/v1/key-ceremony/status','/v1/key-ceremony/contract'];
const SDK_VERSION='2026-10-26';
const camel=p=>p.replace(/^\/v1\//,'').split(/[-/]/).map((w,i)=>i?w[0].toUpperCase()+w.slice(1):w).join('');
const pascal=n=>n[0].toUpperCase()+n.slice(1);
const snake=n=>n.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());

export function generateGovernanceClients(spec,{operations=GOVERNANCE_OPERATIONS_LIST}={}){
  const ops=operations.map(p=>{
    const entry=spec.paths?.[p];if(!entry)throw new Error('OpenAPI path missing: '+p);
    const [method,op]=Object.entries(entry).find(([m])=>['get','post'].includes(m));
    return {path:p,method:method.toUpperCase(),name:camel(p),auth:(op.security||[]).length>0,request:op.requestBody?.content?.['application/json']?.schema||null,response:op.responses?.['200']?.content?.['application/json']?.schema||null,summary:String(op.summary||op.description||'').replace(/\s+/g,' ').trim()};
  });
  const components=spec.components?.schemas||{};
  // Type names: component schemas keep their names. An operation alias that would collide with a component is not
  // emitted when it simply refers to that component, and is renamed otherwise, so no alias references itself.
  const refs=new Set();
  function ts(schema,depth=0){
    if(!schema||typeof schema!=='object'||depth>12)return 'unknown';
    const nullable=schema.nullable?' | null':'';
    if(schema.$ref){const name=schema.$ref.split('/').pop();refs.add(name);return name+nullable;}
    if(schema.const!==undefined)return JSON.stringify(schema.const)+nullable;
    if(Array.isArray(schema.enum))return schema.enum.map(v=>JSON.stringify(v)).join(' | ')+nullable;
    const branches=(schema.oneOf||schema.anyOf||[]).filter(b=>b.properties||b.type||b.$ref||b.enum||b.const!==undefined);
    if(branches.length&&!schema.properties)return '('+branches.map(b=>ts(b,depth+1)).join(' | ')+')'+nullable;
    const type=Array.isArray(schema.type)?schema.type:[schema.type];
    const tn=type.includes('null')?' | null':'';
    if(type.includes('array'))return 'Array<'+ts(schema.items,depth+1)+'>'+nullable+tn;
    if(type.includes('string'))return 'string'+nullable+tn;
    if(type.includes('integer')||type.includes('number'))return 'number'+nullable+tn;
    if(type.includes('boolean'))return 'boolean'+nullable+tn;
    if(schema.properties||type.includes('object')||schema.additionalProperties){
      const required=new Set(schema.required||[]),indent='  '.repeat(depth+1);
      const lines=Object.entries(schema.properties||{}).map(([k,v])=>`${indent}${/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k)?k:JSON.stringify(k)}${required.has(k)?'':'?'}: ${ts(v,depth+1)};`);
      if(schema.additionalProperties!==false)lines.push(`${indent}[key: string]: ${schema.additionalProperties&&typeof schema.additionalProperties==='object'?ts(schema.additionalProperties,depth+1)+' | ':''}unknown;`);
      return '{\n'+lines.join('\n')+'\n'+'  '.repeat(depth)+'}'+nullable+tn;
    }
    return 'unknown'+nullable;
  }
  const blocks=[],names=new Set(),opTypes={};
  const declare=(name,body,doc)=>{if(names.has(name))throw new Error('Duplicate generated type: '+name);names.add(name);blocks.push((doc?`/** ${doc} */\n`:'')+`export type ${name} = ${body};`);};
  for(const op of ops){
    const t={};
    for(const [kind,schema] of [['Request',op.request],['Response',op.response]]){
      if(kind==='Request'&&!schema)continue;
      let name=pascal(op.name)+kind;
      const target=schema?.$ref?.split('/').pop();
      if(components[name]!==undefined){
        if(target===name){refs.add(name);t[kind]=name;continue;}
        name=pascal(op.name)+'Operation'+kind;
      }
      declare(name,schema?ts(schema):'Record<string, unknown>',`${kind} body for ${op.method} ${op.path}.`);t[kind]=name;
    }
    opTypes[op.name]=t;
  }
  const emitted=new Set();
  for(let guard=0;guard<500;guard++){const pending=[...refs].filter(n=>!emitted.has(n)).sort();if(!pending.length)break;for(const n of pending){emitted.add(n);if(names.has(n))continue;declare(n,components[n]===undefined?'unknown':ts(components[n]));}}
  const subset=JSON.stringify(ops.map(({path,method,request,response})=>({path,method,request,response})));
  const contractSha=createHash('sha256').update(subset).digest('hex');
  const revision=spec.info?.['x-deployment-revision']||spec.info?.version||'unknown';
  const header=`// Generated from the AMOS OpenAPI contract by scripts/generate-governance-client.mjs (https://github.com/africanmarketos591/mvr-framework).\n// Contract version ${revision}; operation subset SHA-256: ${contractSha}. Do not edit by hand; regenerate instead.\n`;
  const operationMap=Object.fromEntries(ops.map(o=>[o.name,{method:o.method,path:o.path,api_key:o.auth,summary:o.summary.slice(0,200)}]));
  const js=header+`// Every method returns {status, body, deployment_revision} and never throws on a coded refusal. Network failures and
// timeouts throw. expectedRevision pins the deployment: the server refuses a mismatch with 409 DEPLOYMENT_REVISION_MISMATCH.
export const GOVERNANCE_CLIENT_VERSION = ${JSON.stringify(SDK_VERSION)};
export const GOVERNANCE_OPERATIONS = Object.freeze(${JSON.stringify(operationMap,null,2)});
const inBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
export class GovernanceClient {
  constructor({baseUrl = 'https://africanmarketos.com', apiKey = null, fetch: fetchImpl = globalThis.fetch, responseProfile = 'full_advisory', headers = {}, timeoutMs = 30000, expectedRevision = null, userAgent = 'amos-governance-client-js/' + GOVERNANCE_CLIENT_VERSION} = {}) {
    if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 600000) throw new RangeError('timeoutMs must be between 1 and 600000');
    if (expectedRevision !== null && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(expectedRevision)) throw new TypeError('expectedRevision must be a deployment identifier');
    this.baseUrl = String(baseUrl).replace(/\\/$/, ''); this.apiKey = apiKey; this.fetch = fetchImpl; this.responseProfile = responseProfile; this.headers = headers;
    this.timeoutMs = timeoutMs; this.expectedRevision = expectedRevision; this.userAgent = userAgent;
  }
  async call(name, body, {signal, timeoutMs = this.timeoutMs} = {}) {
    const op = GOVERNANCE_OPERATIONS[name]; if (!op) throw new Error('Unknown governance operation: ' + name);
    if (op.api_key && !this.apiKey) throw new Error(op.path + ' needs an API key');
    const timeout = AbortSignal.timeout(timeoutMs), combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const headers = {'Content-Type':'application/json', 'X-Response-Profile':this.responseProfile, ...(op.api_key ? {'X-API-Key':this.apiKey} : {}), ...(this.expectedRevision ? {'X-MVR-Expected-Deployment-Revision':this.expectedRevision} : {}), ...(!inBrowser && this.userAgent ? {'User-Agent':this.userAgent} : {}), ...this.headers};
    const response = await this.fetch(this.baseUrl + op.path, {method:op.method, redirect:'error', signal:combined, headers, ...(op.method === 'POST' ? {body:JSON.stringify(body ?? {})} : {})});
    let parsed = null; try { parsed = await response.json(); } catch { parsed = null; }
    const served = response.headers.get('X-MVR-Deployment-Revision');
    return {status:response.status, body:parsed, deployment_revision:served, revision_matches:this.expectedRevision ? served === this.expectedRevision : null};
  }
${ops.map(o=>`  /** ${o.method} ${o.path}${o.auth?' (API key)':''} */\n  ${o.name}(${o.method==='POST'?'body, options':'options'}) { return this.call('${o.name}', ${o.method==='POST'?'body':'undefined'}, options); }`).join('\n')}
}
`;
  const dts=header+`${blocks.join('\n\n')}

export interface GovernanceResult<T> { status: number; body: T | null; deployment_revision: string | null; revision_matches: boolean | null; }
export interface GovernanceClientOptions { baseUrl?: string; apiKey?: string | null; fetch?: typeof fetch; responseProfile?: string; headers?: Record<string, string>; timeoutMs?: number; expectedRevision?: string | null; userAgent?: string; }
export interface GovernanceCallOptions { signal?: AbortSignal; timeoutMs?: number; }
export declare const GOVERNANCE_CLIENT_VERSION: string;
export declare const GOVERNANCE_OPERATIONS: Readonly<Record<string, {method: 'GET' | 'POST'; path: string; api_key: boolean; summary: string}>>;
export declare class GovernanceClient {
  constructor(options?: GovernanceClientOptions);
  call(name: string, body?: unknown, options?: GovernanceCallOptions): Promise<GovernanceResult<unknown>>;
${ops.map(o=>`  ${o.name}(${o.method==='POST'?`body: ${opTypes[o.name].Request||'unknown'}, `:''}options?: GovernanceCallOptions): Promise<GovernanceResult<${opTypes[o.name].Response}>>;`).join('\n')}
}
`;
  const py=header.replace(/^\/\/ /gm,'# ')+`"""AMOS governance client (Python standard library only).

Every method returns a dict {"status", "body", "deployment_revision", "revision_matches"} and does not raise on a coded
refusal. Network failures and timeouts raise. expected_revision pins the deployment: the server refuses a mismatch with
409 DEPLOYMENT_REVISION_MISMATCH. A User-Agent is always sent; the default Python one is blocked at the edge.
"""
import json
import re
import urllib.error
import urllib.request

GOVERNANCE_CLIENT_VERSION = ${JSON.stringify(SDK_VERSION)}
GOVERNANCE_OPERATIONS = json.loads(${JSON.stringify(JSON.stringify(operationMap))})


class GovernanceClient:
    def __init__(self, base_url="https://africanmarketos.com", api_key=None, response_profile="full_advisory", timeout=30.0,
                 expected_revision=None, user_agent="amos-governance-client-python/" + GOVERNANCE_CLIENT_VERSION, headers=None, opener=None):
        if not (isinstance(timeout, (int, float)) and 0 < timeout <= 600):
            raise ValueError("timeout must be between 0 and 600 seconds")
        if expected_revision is not None and not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", expected_revision):
            raise ValueError("expected_revision must be a deployment identifier")
        self.base_url = str(base_url).rstrip("/")
        self.api_key = api_key
        self.response_profile = response_profile
        self.timeout = float(timeout)
        self.expected_revision = expected_revision
        self.user_agent = user_agent
        self.headers = dict(headers or {})
        self.opener = opener or urllib.request.build_opener()

    def call(self, name, body=None, timeout=None):
        op = GOVERNANCE_OPERATIONS.get(name)
        if op is None:
            raise KeyError("Unknown governance operation: " + name)
        if op["api_key"] and not self.api_key:
            raise ValueError(op["path"] + " needs an API key")
        headers = {"Content-Type": "application/json", "X-Response-Profile": self.response_profile, "User-Agent": self.user_agent}
        if op["api_key"]:
            headers["X-API-Key"] = self.api_key
        if self.expected_revision:
            headers["X-MVR-Expected-Deployment-Revision"] = self.expected_revision
        headers.update(self.headers)
        data = json.dumps(body if body is not None else {}, separators=(",", ":")).encode("utf-8") if op["method"] == "POST" else None
        request = urllib.request.Request(self.base_url + op["path"], data=data, headers=headers, method=op["method"])
        try:
            response = self.opener.open(request, timeout=self.timeout if timeout is None else timeout)
            status, raw, served = response.status, response.read(), response.headers.get("X-MVR-Deployment-Revision")
        except urllib.error.HTTPError as error:
            status, raw, served = error.code, error.read(), error.headers.get("X-MVR-Deployment-Revision")
        try:
            parsed = json.loads(raw.decode("utf-8")) if raw else None
        except ValueError:
            parsed = None
        return {"status": status, "body": parsed, "deployment_revision": served,
                "revision_matches": (served == self.expected_revision) if self.expected_revision else None}

${ops.map(o=>`    def ${snake(o.name)}(self${o.method==='POST'?', body':''}, timeout=None):\n        """${o.method} ${o.path}${o.auth?' (API key)':''}."""\n        return self.call(${JSON.stringify(o.name)}, ${o.method==='POST'?'body':'None'}, timeout=timeout)\n`).join('\n')}`;
  return {files:{'javascript/governance-client.mjs':js,'javascript/governance-client.d.ts':dts,'python/governance_client.py':py},operations:ops.length,types:names.size,contract_sha256:contractSha,revision};
}

if(import.meta.url===pathToFileURL(process.argv[1]||'').href){
  const args=process.argv.slice(2),opt=n=>{const i=args.indexOf(n);return i>=0?args[i+1]:undefined;};
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  const source=opt('--spec')||path.join(root,'openapi.json');
  const spec=/^https:\/\//.test(source)?await (await fetch(source,{headers:{'User-Agent':'amos-governance-generator'},signal:AbortSignal.timeout(30000)})).json():JSON.parse(fs.readFileSync(source,'utf8'));
  const out=opt('--out')||path.join(root,'sdks');
  const result=generateGovernanceClients(spec),drift=[];
  for(const [name,text] of Object.entries(result.files)){
    const file=path.join(out,name);
    if(args.includes('--check')){const current=fs.existsSync(file)?fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'):null;if(current!==text)drift.push(name);}
    else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);}
  }
  if(drift.length){console.error(JSON.stringify({passed:false,stale:drift,fix:'node scripts/generate-governance-client.mjs'}));process.exit(1);}
  console.log(JSON.stringify({passed:true,mode:args.includes('--check')?'check':'written',operations:result.operations,types:result.types,contract_sha256:result.contract_sha256}));
}
