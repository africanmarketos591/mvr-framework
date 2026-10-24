import {open} from 'node:fs/promises';
import {planReviews,recordObservation} from './review.mjs';
import {appendHoldEvent,summarizeHolds} from './holds.mjs';
import {captureProposal,compareDecision} from './counterfactual.mjs';
import {need} from './core.mjs';

try {
  const [command,path,...extra]=process.argv.slice(2);need(path&&extra.length===0,'Usage: node cli.mjs plan|observe|hold-append|holds|capture|compare input.json');
  const handle=await open(path,'r');let raw;try{const info=await handle.stat();need(info.isFile()&&info.size<=262144,'INPUT_LIMIT_256_KIB_REGULAR_FILE');const buffer=Buffer.alloc(262145);const {bytesRead}=await handle.read(buffer,0,buffer.length,0);need(bytesRead<=262144,'INPUT_LIMIT_256_KIB');raw=buffer.subarray(0,bytesRead);}finally{await handle.close();}const x=JSON.parse(raw.toString('utf8'));let result;
  switch(command){
    case 'plan':result=planReviews(x.model,x.observations,x.options);break;
    case 'observe':result=recordObservation(x.model,x.observation);break;
    case 'hold-append':result=appendHoldEvent(x.journal,x.event);break;
    case 'holds':result=summarizeHolds(x.journal,x.options);break;
    case 'capture':result=captureProposal(x);break;
    case 'compare':result=compareDecision(x.proposal,x.decision,x.options);break;
    default:throw Error('UNKNOWN_COMMAND');
  }
  console.log(JSON.stringify(result,null,2));
} catch(error){console.error(JSON.stringify({status:'invalid_input',error:error.message,execution_authorized:false}));process.exitCode=1;}
