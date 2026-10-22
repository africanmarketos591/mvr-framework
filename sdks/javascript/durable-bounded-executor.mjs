import {createBoundedExecutor} from './bounded-executor.mjs';

// Use with createSqliteOutcomeOutbox or another durable adapter implementing the same contract.
// Delivery retries are separate from execution. Unknown outcomes always require explicit reconciliation.
export function createDurableBoundedExecutor({outbox,verify,recordEffect,effects={},operationId=()=>crypto.randomUUID(),...options}={}){
  for(const method of ['prepare','recordOutcome','acknowledge','failed'])if(typeof outbox?.[method]!=='function')throw new TypeError('Durable outbox is required');
  if(Object.values(effects).some(handler=>typeof handler!=='function'))throw new TypeError('Effect handlers must be functions');
  if(typeof verify!=='function'||typeof recordEffect!=='function')throw new TypeError('Transports are required');
  return {
    async execute(request){
      let answer,prepared=false,preparationFailed=false,persistFailed=false,expiredBeforeEffect=false;
      const wrappedEffects=Object.fromEntries(Object.entries(effects).map(([type,handler])=>[type,async(effect,context)=>{
        try{await outbox.prepare({verification_id:answer.verification_id,effect_id:effect.effect_id,operation_id:operationId(),requested_effect:effect});prepared=true;}
        catch{preparationFailed=true;throw new Error('OUTBOX_INTENT_UNAVAILABLE');}
        if(context.signal.aborted||(options.now||Date.now)()+(options.clockSkewMs??1000)>=Date.parse(context.valid_until)){expiredBeforeEffect=true;throw new Error('VALIDITY_WINDOW_EXPIRED');}
        return handler(effect,context);
      }]));
      const executor=createBoundedExecutor({...options,operationId,effects:wrappedEffects,verify:async input=>(answer=await verify(input)),recordEffect:async payload=>{
        if(!prepared)return null;
        let stable;
        try{stable=await outbox.recordOutcome(payload.verification_id,{...payload,...(expiredBeforeEffect?{outcome:'not_attempted'}:{})});}
        catch{persistFailed=true;return null;}
        try{const response=await recordEffect(stable);if(response?.status!=='recorded')throw new Error('NOT_ACKNOWLEDGED');await outbox.acknowledge(payload.verification_id);return response;}
        catch{await outbox.failed(payload.verification_id);return null;}
      }});
      const result=await executor.execute(request);
      if(preparationFailed)return {...result,executed:false,attempted:false,reason:'EXECUTOR_DURABLE_INTENT_UNAVAILABLE',report_status:'not_attempted'};
      if(expiredBeforeEffect)return {...result,executed:false,attempted:false,reason:'EXECUTOR_VALIDITY_WINDOW_EXPIRED',automatic_effect_retry_allowed:false};
      if(persistFailed)return {...result,report_status:'unknown_requires_reconciliation',automatic_effect_retry_allowed:false};
      return {...result,automatic_effect_retry_allowed:false,...(prepared?{outcome_durable:true}:{})};
    }
  };
}
