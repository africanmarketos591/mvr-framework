import {createHash} from 'node:crypto';

export const VERSION = 'amos.local-review-workbench/1';
export const boundary = Object.freeze({execution_authorized:false, institutional_authority_verified:false, scoring_eligible:false, classification:'local declared-model analysis; not an AMOS permission receipt'});
export function need(ok, message) { if (!ok) throw new Error(message); }
export const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
export const text = (x, max=500) => typeof x === 'string' && x.trim().length > 0 && x.length <= max;
export function instant(x) { need(typeof x === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(x) && Number.isFinite(Date.parse(x)) && new Date(x).toISOString().replace('.000Z','Z') === x.replace('.000Z','Z'), 'INVALID_UTC_TIMESTAMP'); return Date.parse(x); }
export function canonical(x) {
  if (x === null || typeof x === 'boolean' || typeof x === 'string') return JSON.stringify(x);
  if (typeof x === 'number') { need(Number.isFinite(x), 'NONFINITE_NUMBER'); return JSON.stringify(x); }
  if (Array.isArray(x)) return '['+x.map(canonical).join(',')+']';
  need(object(x) && Object.getPrototypeOf(x) === Object.prototype, 'JSON_OBJECT_REQUIRED');
  return '{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+canonical(x[k])).join(',')+'}';
}
export const digest = x => createHash('sha256').update(VERSION+'\n'+canonical(x)).digest('hex');
export function seal(kind, payload) { return {kind,payload,sha256:digest({kind,payload})}; }
export function verify(record, kind) { need(object(record) && record.kind === kind && /^[a-f0-9]{64}$/.test(record.sha256||'') && record.sha256 === digest({kind,payload:record.payload}), 'RECORD_INTEGRITY_FAILED'); return record.payload; }
export function keys(value, allowed) { need(object(value) && Object.keys(value).every(k=>allowed.includes(k)), 'UNKNOWN_FIELD'); }
