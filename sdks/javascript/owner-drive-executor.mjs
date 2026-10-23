import {createHash,randomUUID} from 'node:crypto';
const CONTENT='AMOS owner-controlled execution test. No personal, financial, client or confidential information.\n';
const sha=value=>createHash('sha256').update(value).digest('hex');
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{10,200}$/.test(value);
const boundary={atomic_remote_revocation:false,provider:'google_drive',independent_institutional_authority:false};
export function createOwnerDriveExecutor({folderId,fileId,requestId,approvalRef,manifestSha256,getAccessToken,authorize,readback,journal,fetchImpl=fetch,enabled=false}){
 if(!validId(folderId)||!validId(fileId)||!validId(requestId)||typeof approvalRef!=='string'||!approvalRef||!/^[a-f0-9]{64}$/.test(manifestSha256||'')||![getAccessToken,authorize,readback,journal?.begin,journal?.record].every(fn=>typeof fn==='function'))throw Error('OWNER_DRIVE_CONFIGURATION_INVALID');
 const intent={request_id:requestId,approval_ref:approvalRef,manifest_sha256:manifestSha256,folder_id:folderId,file_id:fileId,name:'AMOS-OWNER-EXECUTION-TEST.txt',content_sha256:sha(CONTENT)};
 const observe=async()=>{
  // Readback must be performed by the separately configured receiver, which
  // receives the exact file ID but neither the executor token nor broad queries.
  const result=await readback({file_id:fileId,folder_id:folderId,request_id:requestId});
  if(!result)return null;
  const m=result.metadata;
  if(m?.id!==fileId||m.name!==intent.name||m.mimeType!=='text/plain'||m.trashed===true||m.parents?.length!==1||m.parents[0]!==folderId||m.appProperties?.amos_request_id!==requestId||m.appProperties?.amos_manifest_sha256!==manifestSha256||!(result.bytes instanceof Uint8Array)||sha(result.bytes)!==intent.content_sha256)throw Error('OWNER_DRIVE_READBACK_MISMATCH');
  return {execution_result:'created_and_read_back',...intent,observed_at:new Date().toISOString(),...boundary};
 };
 return Object.freeze({intent:Object.freeze({...intent}),async execute(){
  if(enabled!==true)throw Error('OWNER_DRIVE_NOT_ACTIVATED');
  const previous=await journal.begin(requestId,{...intent});
  // The journal's begin MUST atomically create or compare the immutable intent.
  // Any prior attempt is reconciliation-only, even if acknowledgement was lost.
  if(previous?.existing){const receipt=await observe();if(receipt){await journal.record(requestId,{state:'confirmed',receipt});return {...receipt,reconciled:true,new_write_dispatched:false};}return {execution_result:'unknown',...intent,...boundary,new_write_dispatched:false};}
  if(previous?.created!==true)throw Error('OWNER_DRIVE_DURABLE_INTENT_REQUIRED');
  const token=await getAccessToken();
  const scopes=typeof token?.scope==='string'?token.scope.split(/\s+/).filter(Boolean):[];
  const allowed=['https://www.googleapis.com/auth/drive.file','openid','email','https://www.googleapis.com/auth/userinfo.email'];
  if(!scopes.includes(allowed[0])||scopes.some(scope=>!allowed.includes(scope))||typeof token.access_token!=='string'||!token.access_token||/[\r\n]/.test(token.access_token))throw Error('OWNER_DRIVE_NARROW_TOKEN_REQUIRED');
  const headers={Authorization:'Bearer '+token.access_token};
  const folderResponse=await fetchImpl('https://www.googleapis.com/drive/v3/files/'+folderId+'?fields=id,mimeType,trashed,capabilities(canAddChildren)',{headers,redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!folderResponse.ok)throw Error('OWNER_DRIVE_FOLDER_UNAVAILABLE');
  const folder=await folderResponse.json();
  if(folder.id!==folderId||folder.mimeType!=='application/vnd.google-apps.folder'||folder.trashed===true||folder.capabilities?.canAddChildren!==true)throw Error('OWNER_DRIVE_FOLDER_SCOPE_INVALID');
  const current=await authorize({...intent});
  if(current?.allow!==true||current.approval_ref!==approvalRef||current.manifest_sha256!==manifestSha256||!Number.isFinite(Date.parse(current.expires_at))||Date.parse(current.expires_at)<=Date.now())throw Error('OWNER_DRIVE_CURRENT_APPROVAL_REQUIRED');
  const delimiter='amos_'+randomUUID().replaceAll('-','');
  const metadata={id:fileId,name:intent.name,mimeType:'text/plain',parents:[folderId],appProperties:{amos_request_id:requestId,amos_manifest_sha256:manifestSha256}};
  const body='--'+delimiter+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+'\r\n--'+delimiter+'\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n'+CONTENT+'\r\n--'+delimiter+'--\r\n';
  // Persist the dispatch marker before crossing the provider boundary. A crash
  // from here on requires readback, never a new file ID or a blind second write.
  await journal.record(requestId,{state:'dispatching',approval_ref:approvalRef,at:new Date().toISOString()});
  try{
   const response=await fetchImpl('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{...headers,'Content-Type':'multipart/related; boundary='+delimiter},body,redirect:'error',signal:AbortSignal.timeout(15000)});
   if(!response.ok){await journal.record(requestId,{state:'reconciliation_required',provider_status:response.status});return {execution_result:'unknown',...intent,...boundary,new_write_dispatched:true};}
   const result=await response.json();if(result.id!==fileId)throw Error('OWNER_DRIVE_PROVIDER_ID_MISMATCH');
   const receipt=await observe();if(!receipt)throw Error('OWNER_DRIVE_READBACK_UNAVAILABLE');
   await journal.record(requestId,{state:'confirmed',receipt});return {...receipt,new_write_dispatched:true};
  }catch{
   await journal.record(requestId,{state:'reconciliation_required'});
   return {execution_result:'unknown',...intent,...boundary,new_write_dispatched:true};
  }
 }});
}
