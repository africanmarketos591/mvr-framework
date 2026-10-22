import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';

// Persistent report delivery only. This adapter never performs or retries an external effect.
export function createSqliteOutcomeOutbox(filename,{now=Date.now,maxAttempts=12}={}) {
  if(typeof filename!=='string'||!filename||filename===':memory:')throw new TypeError('A persistent database filename is required');
  if(!Number.isSafeInteger(maxAttempts)||maxAttempts<1||maxAttempts>100)throw new TypeError('Invalid retry bound');
  const db=new DatabaseSync(filename);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS mvr_outcomes (verification_id TEXT PRIMARY KEY, effect_id TEXT NOT NULL UNIQUE, operation_id TEXT NOT NULL UNIQUE, intent_sha256 TEXT NOT NULL, state TEXT NOT NULL, payload TEXT, attempts INTEGER NOT NULL DEFAULT 0, next_attempt INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);');
  const row=id=>db.prepare('SELECT * FROM mvr_outcomes WHERE verification_id=?').get(id);
  const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}};
  const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const text=value=>typeof value==='string'&&value.length>0&&value.length<=200;
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
      if(!['succeeded','failed','not_attempted'].includes(outcome)||external_ref_sha256!==undefined&&!/^[a-f0-9]{64}$/.test(external_ref_sha256))throw new TypeError('Invalid outcome');
      return transaction(()=>{
        const prior=row(verification_id);if(!prior)throw new Error('OUTBOX_INTENT_MISSING');
        const payload={verification_id,effect_id:prior.effect_id,operation_id:prior.operation_id,outcome,...(external_ref_sha256?{external_ref_sha256}:{})};
        const encoded=JSON.stringify(payload);
        if(prior.payload&&prior.payload!==encoded)throw new Error('OUTBOX_OUTCOME_CONFLICT');
        if(prior.state==='acknowledged')return payload;
        db.prepare('UPDATE mvr_outcomes SET payload=?,state=?,updated_at=? WHERE verification_id=?').run(encoded,'pending',now(),verification_id);
        return payload;
      });
    },
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
