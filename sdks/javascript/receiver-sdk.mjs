// AMOS receiver SDK: what a customer system runs to perform an AMOS-committed effect at most once.
//
// Semantics (also in conformance/receiver-kit/README.md):
//   consume      A commit_id is consumed by one atomic insert in the receiver's own durable store. Nothing else is.
//   idempotency  The commit_id is the idempotency key the receiver passes to its effect system.
//   retry        A failure before the effect leaves the commit retryable inside commit_valid_until; never after it.
//   reconcile    A crash between the effect and the store update is resolved by asking the effect system whether that
//                commit_id produced an effect. The receiver never performs again to find out.
//   acknowledge  After the effect, the receiver reports the outcome to AMOS (record_effect). A lost acknowledgement is
//                retried from the store; it never repeats the effect.
//   irreversible Once performEffect returns, the effect is treated as done and irreversible. A later revocation,
//                a failed acknowledgement or a local error after that point is recorded as a post-effect failure;
//                the effect is not undone and is never repeated. AMOS cannot recall it.
// Monitoring reports unconsumed, expired, duplicated, in-doubt and unacknowledged commits.
import {DatabaseSync} from 'node:sqlite';
import http from 'node:http';
import {createCommitReceiver} from '../../conformance/receiver-kit/receiver.mjs';
import {verifyPermissionStatement} from './permission-verifier.mjs';

export const RECEIVER_SDK_VERSION='amos.receiver-sdk/1';
const iso=ms=>new Date(ms).toISOString();

// Durable store. Every state change is one SQLite transaction; claim is INSERT on a primary key, so two concurrent
// deliveries (or two processes sharing the file) cannot both win.
export function createSqliteCommitStore(filename,{now=Date.now}={}){
  if(typeof filename!=='string'||!filename||filename===':memory:')throw new TypeError('A persistent database filename is required');
  const db=new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS amos_commits (commit_id TEXT PRIMARY KEY, effect_id TEXT NOT NULL, requested_effect_sha256 TEXT NOT NULL, verification_id TEXT, commit_valid_until TEXT NOT NULL,
      state TEXT NOT NULL, claimed_at TEXT NOT NULL, completed_at TEXT, result TEXT, last_error TEXT, reason TEXT, reconciled INTEGER NOT NULL DEFAULT 0, irreversible INTEGER NOT NULL DEFAULT 0,
      post_effect_failure TEXT, acknowledged_at TEXT, ack_attempts INTEGER NOT NULL DEFAULT 0, ack_error TEXT, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS amos_deliveries (id INTEGER PRIMARY KEY AUTOINCREMENT, commit_id TEXT, received_at TEXT NOT NULL, outcome TEXT NOT NULL);`);
  const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}};
  const decode=row=>row?{...row,result:row.result?JSON.parse(row.result):null,reconciled:!!row.reconciled,irreversible:!!row.irreversible}:null;
  const columns=new Set(['state','completed_at','result','last_error','reason','reconciled','irreversible','post_effect_failure','acknowledged_at','ack_attempts','ack_error','commit_valid_until','verification_id']);
  return {
    kind:'sqlite',filename,
    async claim(commitId,row){return tx(()=>{
      const prior=db.prepare('SELECT * FROM amos_commits WHERE commit_id=?').get(commitId);
      if(prior)return {claimed:false,row:decode(prior)};
      db.prepare('INSERT INTO amos_commits (commit_id,effect_id,requested_effect_sha256,verification_id,commit_valid_until,state,claimed_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
        .run(commitId,row.effect_id,row.requested_effect_sha256,row.verification_id||null,row.commit_valid_until,'in_progress',row.claimed_at,iso(now()));
      return {claimed:true};
    });},
    async update(commitId,patch){return tx(()=>{
      const sets=[],values=[];
      for(const [k,v] of Object.entries(patch)){if(!columns.has(k))continue;sets.push(k+'=?');values.push(k==='result'?JSON.stringify(v??null):typeof v==='boolean'?Number(v):v??null);}
      sets.push('updated_at=?');values.push(iso(now()));
      db.prepare(`UPDATE amos_commits SET ${sets.join(',')} WHERE commit_id=?`).run(...values,commitId);
    });},
    async get(commitId){return decode(db.prepare('SELECT * FROM amos_commits WHERE commit_id=?').get(commitId));},
    async noteDelivery(commitId,outcome){db.prepare('INSERT INTO amos_deliveries (commit_id,received_at,outcome) VALUES (?,?,?)').run(commitId||null,iso(now()),String(outcome).slice(0,80));},
    async all(){return db.prepare('SELECT * FROM amos_commits ORDER BY claimed_at').all().map(decode);},
    async deliveryCounts(){return db.prepare('SELECT commit_id, COUNT(*) AS n FROM amos_deliveries WHERE commit_id IS NOT NULL GROUP BY commit_id').all();},
    close(){db.close();}
  };
}

// A receiver over any store with claim/update/get. Adds delivery logging, AMOS acknowledgement and an optional
// permission-statement requirement to the reference five-rule receiver.
export function createReceiver({registry,allowLabKeys=false,store,performEffect,reconcile,acknowledge=null,requireStatement=false,country=null,executorPrincipalSha256=null,now=()=>Date.now(),clockSkewMs=1000}){
  if(!registry||!store||typeof performEffect!=='function'||typeof reconcile!=='function')throw new Error('registry, store, performEffect and reconcile are required');
  // Wrap the effect so the store marks the irreversible point the moment the effect system returns.
  const wrapped=async(effect,{commit_id})=>{const result=await performEffect(effect,{commit_id});await store.update(commit_id,{irreversible:true});return result;};
  const inner=createCommitReceiver({registry,allowLabKeys,store,performEffect:wrapped,reconcile,now,clockSkewMs,executorPrincipalSha256});
  async function ack(commitId){
    if(typeof acknowledge!=='function')return {acknowledged:false,reason:'no_acknowledgement_configured'};
    const row=await store.get(commitId);if(!row||row.state!=='completed'||row.acknowledged_at)return {acknowledged:!!row?.acknowledged_at};
    try{await acknowledge({commit_id:commitId,verification_id:row.verification_id,effect_id:row.effect_id,outcome:'succeeded'});await store.update(commitId,{acknowledged_at:iso(now()),ack_attempts:(row.ack_attempts||0)+1,ack_error:null});return {acknowledged:true};}
    catch(error){await store.update(commitId,{ack_attempts:(row.ack_attempts||0)+1,ack_error:String(error?.message||error).slice(0,200),post_effect_failure:'acknowledgement_failed'});return {acknowledged:false,retry:true};}
  }
  return {version:RECEIVER_SDK_VERSION,
    async receive({receipt,requested_effect,statement_receipt}){
      const commitId=/^CM-[a-f0-9]{48}$/.test(receipt?.commit_id||'')?receipt.commit_id:null;
      if(requireStatement){
        const verdict=await verifyPermissionStatement(statement_receipt,{registry,allowLabKeys,expectedEffect:requested_effect,requireCommit:receipt,country,now:now()});
        if(!verdict.valid){await store.noteDelivery?.(commitId,'statement_refused');return {performed:false,refused:true,code:'RECEIVER_STATEMENT_INVALID',reasons:verdict.reasons};}
      }
      const out=await inner.receive({receipt,requested_effect});
      // The receipt verified on every path that reaches the store, so its verification id can be kept for acknowledgement.
      if(commitId&&(out.performed||out.already_performed||out.retryable||out.reconciled)){const row=await store.get(commitId);if(row&&!row.verification_id&&/^VR-[a-f0-9]{48}$/.test(receipt.verification_id||''))await store.update(commitId,{verification_id:receipt.verification_id});}
      await store.noteDelivery?.(commitId,out.performed?'performed':out.already_performed?'already_performed':out.code||'refused');
      if(commitId&&(out.performed||out.already_performed)){const a=await ack(commitId);return {...out,acknowledgement:a};}
      return out;
    },
    // Retry every completed but unacknowledged commit. Never touches the effect system.
    async retryAcknowledgements(){const rows=(await store.all?.())||[],out=[];for(const r of rows)if(r.state==='completed'&&!r.acknowledged_at)out.push({commit_id:r.commit_id,...await ack(r.commit_id)});return out;}
  };
}

export async function monitorReceiver(store,{now=Date.now(),staleMs=60000}={}){
  const rows=(await store.all?.())||[],deliveries=new Map(((await store.deliveryCounts?.())||[]).map(r=>[r.commit_id,r.n]));
  const t=typeof now==='function'?now():now;
  const report={version:RECEIVER_SDK_VERSION,checked_at:iso(t),
    unconsumed:rows.filter(r=>['in_progress','failed_retryable'].includes(r.state)&&Date.parse(r.commit_valid_until)>t).map(r=>r.commit_id),
    expired_unconsumed:rows.filter(r=>r.state==='abandoned'||['in_progress','failed_retryable'].includes(r.state)&&Date.parse(r.commit_valid_until)<=t).map(r=>r.commit_id),
    in_doubt:rows.filter(r=>r.state==='in_progress'&&t-Date.parse(r.claimed_at)>staleMs).map(r=>r.commit_id),
    duplicated:[...deliveries].filter(([,n])=>n>1).map(([commit_id,n])=>({commit_id,deliveries:n})),
    unacknowledged:rows.filter(r=>r.state==='completed'&&!r.acknowledged_at).map(r=>r.commit_id),
    post_effect_failures:rows.filter(r=>r.post_effect_failure).map(r=>({commit_id:r.commit_id,failure:r.post_effect_failure,acknowledged:!!r.acknowledged_at})),
    completed:rows.filter(r=>r.state==='completed').length,
    irreversible_effects:rows.filter(r=>r.irreversible||r.state==='completed').length};
  report.healthy=report.in_doubt.length===0&&report.unacknowledged.length===0;
  report.meaning='duplicated lists commits delivered more than once (each performed at most once). in_doubt are claims older than staleMs with no recorded outcome: reconcile them against the effect system. unacknowledged effects were performed but not yet reported to AMOS.';
  return report;
}

// HTTP surface for a staging receiver:
//   POST {base}/commits  {receipt, requested_effect, statement_receipt?}  -> receiver outcome
//   GET  {base}/health                                                   -> monitorReceiver report
//   GET  {base}/effects?commit_id=...                                    -> {commit_id, effect_count} (from effectCount)
//   POST {base}/test/faults {next:'fail_before_effect'|'crash_after_effect'} only when testHooks is true
export function createReceiverHttpHandler(receiver,{store,base='/amos',effectCount,testHooks=null,maxBodyBytes=262144}={}){
  const send=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  const readJson=req=>new Promise((resolve,reject)=>{let size=0;const chunks=[];req.on('data',c=>{size+=c.length;if(size>maxBodyBytes){reject(Object.assign(new Error('too_large'),{status:413}));req.destroy();}else chunks.push(c);});req.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}'));}catch{reject(Object.assign(new Error('invalid_json'),{status:400}));}});req.on('error',reject);});
  return async(req,res)=>{
    try{
      const url=new URL(req.url,'http://receiver.local');
      if(req.method==='POST'&&url.pathname===base+'/commits'){const body=await readJson(req);return send(res,200,await receiver.receive(body));}
      if(req.method==='GET'&&url.pathname===base+'/health')return send(res,200,await monitorReceiver(store));
      if(req.method==='GET'&&url.pathname===base+'/effects'&&typeof effectCount==='function'){const id=url.searchParams.get('commit_id');return send(res,200,id?{commit_id:id,effect_count:await effectCount(id)}:{total_effects:await effectCount(null)});}
      if(req.method==='POST'&&url.pathname===base+'/test/faults'&&testHooks){const body=await readJson(req);testHooks.next=['fail_before_effect','crash_after_effect'].includes(body.next)?body.next:null;return send(res,200,{next:testHooks.next});}
      return send(res,404,{error:'not_found'});
    }catch(error){return send(res,error.status||500,{error:error.message||'receiver_error'});}
  };
}

// A complete reference staging receiver: SQLite commit store plus a harmless SQLite draft ledger as the effect system.
export function startReferenceReceiver({port=0,host='127.0.0.1',databaseFile,registry,allowLabKeys=false,acknowledge=null,requireStatement=false,testHooks=false}={}){
  const store=createSqliteCommitStore(databaseFile);
  const ledger=new DatabaseSync(databaseFile);
  ledger.exec('CREATE TABLE IF NOT EXISTS staging_drafts (commit_id TEXT PRIMARY KEY, effect_id TEXT NOT NULL, draft_id TEXT NOT NULL, created_at TEXT NOT NULL)');
  const hooks=testHooks?{next:null}:null;
  const performEffect=async(effect,{commit_id})=>{
    if(hooks?.next==='fail_before_effect'){hooks.next=null;throw new Error('Staging transient failure before the effect');}
    ledger.prepare('INSERT OR IGNORE INTO staging_drafts VALUES (?,?,?,?)').run(commit_id,effect.effect_id,'STAGING-DRAFT-'+commit_id.slice(3,15),new Date().toISOString());
    if(hooks?.next==='crash_after_effect'){hooks.next=null;throw new Error('Staging crash after the effect, before the receiver recorded it');}
    return ledger.prepare('SELECT draft_id FROM staging_drafts WHERE commit_id=?').get(commit_id);
  };
  const reconcile=async({commit_id})=>{const row=ledger.prepare('SELECT draft_id FROM staging_drafts WHERE commit_id=?').get(commit_id);return row?{exists:true,result:{...row}}:{exists:false};};
  const effectCount=async id=>id?ledger.prepare('SELECT COUNT(*) AS n FROM staging_drafts WHERE commit_id=?').get(id).n:ledger.prepare('SELECT COUNT(*) AS n FROM staging_drafts').get().n;
  const receiver=createReceiver({registry,allowLabKeys,store,performEffect,reconcile,acknowledge,requireStatement});
  const server=http.createServer(createReceiverHttpHandler(receiver,{store,effectCount,testHooks:hooks}));
  return new Promise(resolve=>server.listen(port,host,()=>{const address=server.address();resolve({url:`http://${host}:${address.port}/amos`,receiver,store,
    close:()=>new Promise(done=>server.close(()=>{store.close();ledger.close();done();}))});}));
}
