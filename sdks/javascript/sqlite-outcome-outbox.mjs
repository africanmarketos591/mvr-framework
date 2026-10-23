import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';

// Persistent report delivery only. This adapter never performs or retries an external effect.
export function createSqliteOutcomeOutbox(filename,{now=Date.now,maxAttempts=12}={}) {
  if(typeof filename!=='string'||!filename||filename===':memory:')throw new TypeError('A persistent database filename is required');
  if(!Number.isSafeInteger(maxAttempts)||maxAttempts<1||maxAttempts>100)throw new TypeError('Invalid retry bound');
  const db=new DatabaseSync(filename);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS mvr_outcomes (verification_id TEXT PRIMARY KEY, effect_id TEXT NOT NULL UNIQUE, operation_id TEXT NOT NULL UNIQUE, intent_sha256 TEXT NOT NULL, state TEXT NOT NULL, payload TEXT, attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);');
  db.exec('CREATE TABLE IF NOT EXISTS mvr_outcome_reconciliations (operation_id TEXT PRIMARY KEY, verification_id TEXT NOT NULL, action TEXT NOT NULL, operator_ref TEXT NOT NULL, basis_ref TEXT NOT NULL, request_sha256 TEXT NOT NULL, recorded_at INTEGER NOT NULL);');
  const row=id=>db.prepare('SELECT * FROM mvr_outcomes WHERE verification_id=?').get(id);
  const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}};
  const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const text=value=>typeof value==='string'&&value.length>0&&value.length<=200;
  const outcomePayload=(prior,{outcome,external_ref_sha256})=>{
    if(!['succeeded','failed','not_attempted'].includes(outcome)||external_ref_sha256!==undefined&&!/^[a-f0-9]{64}$/.test(external_ref_sha256))throw new TypeError('Invalid outcome');
    if(!prior)throw new Error('OUTBOX_INTENT_MISSING');
    return {verification_id:prior.verification_id,effect_id:prior.effect_id,operation_id:prior.operation_id,outcome,...(external_ref_sha256?{external_ref_sha256}:{})};
  };
  const saveOutcome=(prior,input)=>{
    const payload=outcomePayload(prior,input),encoded=JSON.stringify(payload);
    if(prior.payload&&prior.payload!==encoded)throw new Error('OUTBOX_OUTCOME_CONFLICT');
    // A duplicate report cannot revive an acknowledged or dead-lettered delivery.
    if(!prior.payload)db.prepare('UPDATE mvr_outcomes SET payload=?,state=?,updated_at=? WHERE verification_id=?').run(encoded,'pending',now(),prior.verification_id);
    return payload;
  };
  const reconcile=(verification_id,action,input,perform)=>transaction(()=>{
    if(!text(verification_id)||!input||!['operation_id','operator_ref','basis_ref'].every(k=>text(input[k])))throw new TypeError('Reconciliation operation, operator and evidence reference are required');
    const prior=row(verification_id);if(!prior)throw new Error('OUTBOX_INTENT_MISSING');
    const request={verification_id,action,operator_ref:input.operator_ref,basis_ref:input.basis_ref,...(action==='reconcile'?{payload:outcomePayload(prior,input)}:{})},requestHash=digest(request);
    const saved=db.prepare('SELECT request_sha256 FROM mvr_outcome_reconciliations WHERE operation_id=?').get(input.operation_id);
    if(saved){if(saved.request_sha256!==requestHash)throw new Error('OUTBOX_RECONCILIATION_CONFLICT');return {verification_id,state:prior.state,idempotent_replay:true};}
    perform(prior,input);
    db.prepare('INSERT INTO mvr_outcome_reconciliations VALUES (?,?,?,?,?,?,?)').run(input.operation_id,verification_id,action,input.operator_ref,input.basis_ref,requestHash,now());
    return {verification_id,state:row(verification_id).state,idempotent_replay:false};
  });
  return {
    prepare({verification_id,effect_id,operation_id,requested_effect}) {
      if(![verification_id,effect_id,operation_id].every(text))throw new TypeError('Invalid intent identifiers');
      return transaction(()=>{
        if(db.prepare('SELECT count(*) AS n FROM mvr_outcomes WHERE state<>?').get('acknowledged').n>=10000)throw new Error('OUTBOX_CAPACITY');
        const at=now();
        // Duplicate effect IDs are rejected even if a fresh verification is presented.
        db.prepare('INSERT INTO mvr_outcomes (verification_id,effect_id,operation_id,intent_sha256,state,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(verification_id,effect_id,operation_id,digest(requested_effect),'unknown',at,at);
        return {verification_id,effect_id,operation_id};
      });
    },
    recordOutcome(verification_id,{outcome,external_ref_sha256}) {
      return transaction(()=>saveOutcome(row(verification_id),{outcome,external_ref_sha256}));
    },
    reconcile(verification_id,input){return reconcile(verification_id,'reconcile',input,saveOutcome);},
    retryReport(verification_id,input){return reconcile(verification_id,'retry_report',input,prior=>{
      if(prior.state!=='needs_review'||!prior.payload)throw new Error('OUTBOX_DEAD_LETTER_REQUIRED');
      db.prepare("UPDATE mvr_outcomes SET state='pending',attempts=0,next_attempt=0,updated_at=? WHERE verification_id=?").run(now(),verification_id);
    });},
    deadLetters(){return db.prepare("SELECT verification_id,effect_id,operation_id,intent_sha256,state,attempts,updated_at FROM mvr_outcomes WHERE state='needs_review' ORDER BY updated_at").all();},
    reconciliations(){return db.prepare('SELECT operation_id,verification_id,action,operator_ref,basis_ref,recorded_at FROM mvr_outcome_reconciliations ORDER BY recorded_at,operation_id').all();},
    unresolved() {return db.prepare("SELECT verification_id,effect_id,operation_id,intent_sha256,state,attempts FROM mvr_outcomes WHERE state IN ('unknown','needs_review') ORDER BY created_at").all();},
    pending() {return db.prepare("SELECT payload FROM mvr_outcomes WHERE state='pending' AND next_attempt<=? ORDER BY created_at LIMIT 100").all(now()).map(r=>JSON.parse(r.payload));},
    acknowledge(verification_id) {transaction(()=>{const prior=row(verification_id);if(!prior?.payload)throw new Error('OUTBOX_OUTCOME_MISSING');db.prepare("UPDATE mvr_outcomes SET state='acknowledged',updated_at=? WHERE verification_id=?").run(now(),verification_id);});},
    failed(verification_id) {transaction(()=>{const prior=row(verification_id);if(!prior?.payload)throw new Error('OUTBOX_OUTCOME_MISSING');if(prior.state==='acknowledged')return;const attempts=prior.attempts+1;db.prepare('UPDATE mvr_outcomes SET attempts=?,state=?,next_attempt=?,updated_at=? WHERE verification_id=?').run(attempts,attempts>=maxAttempts?'needs_review':'pending',now()+Math.min(3600000,1000*2**Math.min(attempts,12)),now(),verification_id);});},
    async flush(recordEffect) {
      if(typeof recordEffect!=='function')throw new TypeError('recordEffect is required');
      const results=[];
      for(const payload of this.pending()){
        try{const reply=await recordEffect(structuredClone(payload));if(reply?.status!=='recorded')throw new Error('NOT_ACKNOWLEDGED');this.acknowledge(payload.verification_id);results.push({verification_id:payload.verification_id,status:'recorded'});}
        catch{this.failed(payload.verification_id);results.push({verification_id:payload.verification_id,status:'retry_or_review'});}
      }
      return results;
    },
    close(){db.close();}
  };
}
