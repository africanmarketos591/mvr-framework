// Records AMOS's output for every frozen case (context for arm B, never a decision). Node.js 24+, no dependencies.
// Usage: node run-amos-arm.mjs <frozen-dir>            isolated evaluation route, no API key
//        AMOS_API_KEY=... node run-amos-arm.mjs <dir>  your licensed workspace (/v1/review-cases)
import fs from 'node:fs';
import path from 'node:path';
import {runAmosArm} from './comparison.mjs';
const dir = process.argv[2], base = 'https://africanmarketos.com';
if (!dir) { console.error('Usage: node run-amos-arm.mjs <frozen-dir>'); process.exit(2); }
const out = path.join(dir, 'amos-arm.json'); if (fs.existsSync(out)) { console.error('amos-arm.json already exists; the AMOS arm runs once per freeze'); process.exit(1); }
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'frozen-manifest.json'), 'utf8')), input = JSON.parse(fs.readFileSync(path.join(dir, 'cases.json'), 'utf8'));
const key = process.env.AMOS_API_KEY || null;
async function post(route, body) {
  const r = await fetch(base + route, {method:'POST', redirect:'error', signal:AbortSignal.timeout(60000), headers:{'Content-Type':'application/json', ...(key ? {'X-API-Key':key} : {})}, body:JSON.stringify(body)});
  return {body:await r.json(), revision:r.headers.get('x-mvr-deployment-revision')};
}
let session = null;
try {
  if (!key) { session = (await post('/v1/review-sandbox', {action:'issue', synthetic_only:true, acknowledge_no_identity_verification:true})).body; if (session.status !== 'issued') throw new Error('evaluation session not issued: ' + (session.code || session.status)); }
  const send = request => key ? post('/v1/review-cases', request) : post('/v1/review-sandbox', {action:'call', session_id:session.session_id, session_token:session.credentials.creator.session_token, target:'case', request});
  const arm = await runAmosArm(manifest, input, send);
  arm.route = key ? 'licensed /v1/review-cases' : 'isolated evaluation /v1/review-sandbox';
  fs.writeFileSync(out, JSON.stringify(arm, null, 1) + '\n', {flag:'wx'});
  console.log(JSON.stringify({recorded:arm.records.length, route:arm.route, amos_revision:arm.amos_revision}));
} catch (error) { console.error(JSON.stringify({refused:true, reason:error.message})); process.exitCode = 1; }
finally { if (session?.session_id) await post('/v1/review-sandbox', {action:'close', session_id:session.session_id, session_token:session.credentials.creator.session_token}).catch(() => null); }
