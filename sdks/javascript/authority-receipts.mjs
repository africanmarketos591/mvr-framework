// Offline authority receipt verification. The caller supplies a trusted key registry; no network fetch occurs.
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export function canonicalJson(value){
  const check=(v,depth=0)=>{if(depth>40)throw new TypeError('JSON nesting limit');if(v===null||typeof v==='string'||typeof v==='boolean')return;if(typeof v==='number'&&Number.isFinite(v))return;if(Array.isArray(v)){v.forEach(x=>check(x,depth+1));return;}if(object(v)&&Object.getPrototypeOf(v)===Object.prototype){for(const x of Object.values(v))check(x,depth+1);return;}throw new TypeError('Only finite JSON values are supported');};
  check(value);return JSON.stringify(value,(_,v)=>object(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
}
const bytes=value=>new TextEncoder().encode(value);
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(value))),x=>x.toString(16).padStart(2,'0')).join('');
function base64(value,length){if(typeof value!=='string'||value.length>4096||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw new TypeError('Invalid base64');const data=Uint8Array.from(atob(value),c=>c.charCodeAt(0));if(data.length!==length)throw new TypeError('Invalid key or signature size');return data;}
export async function verifyAuthorityReceipt(receipt,{registry,previousHead=null,allowLabKeys=false}={}){
  const result={valid:false,hash_valid:false,signature_verified:false,chain_link_verified:false,chronology_verified:false,production_authority:false,execution_authorized:false,reason:null};
  try{
    if(!object(receipt)||!hex(receipt.sha256)||!hex(receipt.prev_sha256)||!Number.isSafeInteger(receipt.sequence)||receipt.sequence<1)return {...result,reason:'malformed_receipt'};
    const {sha256,signature,...body}=receipt;
    if(await hash(canonicalJson(body))!==sha256)return {...result,reason:'hash_mismatch'};
    result.hash_valid=true;
    if(previousHead!==null){if(!object(previousHead)||!hex(previousHead.sha256)||!Number.isSafeInteger(previousHead.sequence)||receipt.sequence!==previousHead.sequence+1||receipt.prev_sha256!==previousHead.sha256)return {...result,reason:'chain_link_mismatch'};result.chain_link_verified=true;}
    if(!signature||signature.status==='unsigned')return {...result,reason:'unsigned_receipt'};
    if(signature.status!=='signed'||signature.standard!=='MVR-RECEIPT-SIG-V1'||signature.algorithm!=='Ed25519'||typeof signature.key_id!=='string'||signature.key_id.length>128)return {...result,reason:'malformed_signature'};
    if(!object(registry)||!Array.isArray(registry.keys))return {...result,reason:'trusted_registry_required'};
    const matching=registry.keys.filter(k=>k?.key_id===signature.key_id);
    if(matching.length!==1)return {...result,reason:'unknown_or_ambiguous_key'};
    const key=matching[0];if(!['active','retired'].includes(key.status))return {...result,reason:key.status==='revoked'?'key_revoked':'key_status_invalid'};
    const lab=key.lab_fixture===true||registry.lab_fixture===true;
    if(lab&&!allowLabKeys)return {...result,reason:'lab_key_not_allowed'};
    const publicKey=await crypto.subtle.importKey('spki',base64(key.public_key_spki_b64,44),{name:'Ed25519'},false,['verify']);
    const verified=await crypto.subtle.verify({name:'Ed25519'},publicKey,base64(signature.signature_b64,64),bytes(`MVR-RECEIPT-V1\n${signature.key_id}\n${sha256}`));
    if(!verified)return {...result,reason:'signature_mismatch'};
    return {...result,valid:true,signature_verified:true,key_id:key.key_id,key_status:key.status,lab_fixture:lab,reason:'verified',boundary:'Signature and supplied hash-chain linkage only. No independent signing time, real-world authority, source authenticity or permission to execute is established.'};
  }catch{return {...result,reason:'malformed_verification_input'};}
}
