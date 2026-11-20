// Offline reconstruction of one receiver-isolation run (mvr.observer-packet/1), from the packet and a pinned root alone. It does not
// read the operator's database or call any service. It proves the chain inside the conformance realm, not institutional standing.
//   node conformance/receiver-kit/observer-verify.mjs receiver-isolation/observer-packet.json [--pinned trust/amos-conformance-trust-root.json]
import fs from 'node:fs';
import {createHash, createPublicKey, verify as verifyBytes} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {createFeedSubscriber} from './feed-subscriber.mjs';
import {canonicalJson, verifyAuthorityReceipt} from '../../sdks/javascript/authority-receipts.mjs';
import {verifyStatement, publicKeyOf} from '../../sdks/javascript/trust-chain-verifier.mjs';
const sha = v => createHash('sha256').update(typeof v === 'string' ? v : canonicalJson(v)).digest('hex');
const REGISTRY = 'mvr.authority-registry-statement/1', CURRENT = 'mvr.current-state-proof/1';
const EXPECT = {valid: ['performed', 1], revoked: ['BUYER_CAPABILITY_REVOKED_IN_FEED', 0], expired: ['BUYER_COMMIT_EXPIRED', 0], lease_recovered: ['BUYER_FEED_NOT_FRESH', 1], rotated: ['performed', 1]};

// Acceptance levels: "journal_attested" needs the receiver journal, every entry signed by the run key, and each signed outcome, reason, commit
// and count matching exactly one scenario row. Without a journal the same checks give "unsigned_reconstruction", a distinct outcome a
// signed-attestation gate must not accept. requireJournal makes a missing journal a failure.
export async function verifyObserverPacket(p, {pinnedRoot = p?.pinned_root, requireJournal = false} = {}) {
  // Each check says what kind of evidence it rests on: a signature from the conformance chain, the receiver's own run signature, or an
  // unsigned export that is only internally consistent.
  // An assertion that reads run fields (codes, counts, timing, freshness) rests on the unsigned export, even when the event it concerns is
  // signed; the signed part is its own assertion. Labels are explicit where the name alone would overstate what is signed.
  const checks = [], SIGNED = /registry|receipt and current-state|feed|revocation/i, RUN = /receiver journal/i;
  const check = (name, passed, detail, evidence) => { checks.push({name, passed: !!passed, evidence: evidence ?? (SIGNED.test(name) ? 'signed_conformance_chain' : RUN.test(name) ? 'receiver_run_signature' : 'unsigned_export'), ...(detail === undefined ? {} : {detail})}); return !!passed; };
  const root = {key_id: pinnedRoot?.key_id, public_key_spki_b64: pinnedRoot?.public_key_spki_b64};
  check('the packet states its contract and claims no production authority', p?.contract_version === 'mvr.observer-packet/1' && p.production_authority === false);
  const statements = new Map(); let chained = true;
  for (const s of p.registry_statements ?? []) { const ok = await verifyStatement(s, {...root, contract: REGISTRY}); chained &&= ok.valid && s.session_id === p.session_id && s.realm === pinnedRoot.realm; statements.set(s.registry_version + ':' + s.keys?.[0]?.key_id, s); }
  check('every registry statement is signed by the pinned root for this session', chained && statements.size >= 2);
  const rotation = (p.feed_log ?? []).find(e => e.rotate)?.rotate;
  check('the successor registry names its predecessor digest and a new key', !!rotation && rotation.next.supersedes?.sha256 === rotation.previous.sha256 && rotation.next.registry_version === rotation.previous.registry_version + 1 && rotation.next.keys[0].key_id !== rotation.previous.keys[0].key_id);
  const basis = p.evidence_basis, recordsOk = !!basis && sha(basis.claim) === basis.claim_sha256 && basis.records?.length > 0 && basis.records.every(r => sha(r.record) === r.record_sha256 && sha(r.record.claim) === basis.source_sha256);
  check('the evidence basis matches its commitments', recordsOk);
  const d = p.disposition, e = p.effect, applied = e?.applied_dispositions?.some(a => a.disposition_id === d?.disposition_id);
  check('the disposition has an id and digest and was applied to the decision', /^IDP-[a-f0-9]{32}$/.test(d?.disposition_id ?? '') && /^[a-f0-9]{64}$/.test(d?.disposition_sha256 ?? '') && d.receipt?.disposition_id === d.disposition_id && (applied || e?.disposition_ids?.includes(d.disposition_id)));
  const line = e?.verification_ledger?.authority_bindings?.[0];
  check('the decision binds the exact effect to the capability check', sha(e?.requested_effect ?? '') === e?.requested_effect_sha256 && e?.execution_authorization_status === 'authorized' && line?.binding_sha256 === e.authority_binding_sha256 && line?.outer_effect_sha256 === e.effect_sha256 && line?.normative_sha256 === e.normative_sha256);
  const statementFor = version => (p.registry_statements ?? []).filter(s => s.registry_version === version).at(-1);
  const verifications = new Map((p.operations ?? []).filter(o => o.action === 'verify_capability').map(o => [o.effect_id, o]));
  for (const [name, [want, drafts]] of Object.entries(EXPECT)) {
    const s = p.scenarios?.[name], reg = s && statementFor(s.registry_version), registry = reg && {keys: reg.keys.map(publicKeyOf)};
    const receipt = s?.receipt, signed = receipt && registry ? await verifyAuthorityReceipt(receipt, {registry, allowLabKeys: true}) : {valid: false};
    const proof = s?.current_state ? await verifyStatement(s.current_state, {key_id: reg?.keys?.[0]?.key_id, public_key_spki_b64: reg?.keys?.[0]?.public_key_spki_b64, contract: CURRENT}) : {valid: false};
    check(name + ': receipt and current-state proof verify under the registry in force', signed.valid !== false && proof.valid, {receipt: signed.reason ?? null, proof: proof.reason ?? null});
    check(name + ': the commit is for the exact delivered effect, after a recorded verification', !!receipt && receipt.kind === 'effect_commit' && receipt.effect_id === s.requested_effect?.effect_id && receipt.requested_effect_sha256 === sha(s.requested_effect) && verifications.get(receipt.effect_id)?.decision === 'allow');
    const rows = (p.store_rows ?? []).filter(r => r.scenario === name);
    check(name + ': the receiver outcome is the one this rule produces', want === 'performed' ? s?.performed === true && !s.observed_code : s?.observed_code === want, s?.observed_code ?? 'performed');
    check(name + ': the store holds the expected rows for this commit only', rows.length === drafts && rows.every(r => r.commit_id === receipt?.commit_id && r.effect_id === receipt?.effect_id));
  }
  const lease = p.scenarios?.lease_recovered?.at_refusal;
  check('the lease refusal is attributable to the lease alone', lease?.commit_open === true && lease.capability_permitted === true && lease.no_feed_advance === true && lease.feed_reason === 'FEED_OLDER_THAN_OFFLINE_POLICY' && lease.draft_count === 0 && p.scenarios.lease_recovered.replay_already_performed === true);
  const late = p.scenarios?.expired, gone = p.scenarios?.revoked;
  check('the expired refusal is attributable to the commit window alone', late?.feed_fresh === true && late.capability_permitted === true);
  check('revoked: the commit was still open and the receiver state current at refusal (run fields; the signed revocation is checked in the replay)', gone?.commit_still_open === true && gone.feed_fresh === true, undefined, 'unsigned_export');
  check('superseded registry: the receiver refused the new-key commit and wrote no draft (run fields; the successor statement is checked above)', p.scenarios?.rotated?.old_registry_code === 'BUYER_CHAIN_INVALID' && p.scenarios.rotated.old_registry_draft_count === 0, undefined, 'unsigned_export');
  // Replays the longest connected feed history through the reference subscriber, including the key succession.
  let replayed = false, revokedSeen = false, detail = null;
  try {
    const log = p.feed_log ?? [], opening = p.registry_statements[0], lastAt = Math.max(...log.filter(e => e.batch).map(e => Date.parse(e.batch.head.observed_at))); let at = Date.parse(log.find(e => e.batch).batch.head.observed_at);
    const sub = createFeedSubscriber({sessionId: p.session_id, registryId: opening.registry_id, registryKey: publicKeyOf(opening.keys[0]), pinnedRoot, fetchImpl: () => { throw new Error('offline'); }, now: () => at + 1});
    for (const entry of log) {
      if (entry.rotate) { at = Math.max(at, Date.parse(entry.rotate.next.issued_at)); await sub.rotateRegistry(entry.rotate.previous, entry.rotate.next); continue; }
      const head = entry.batch.head, time = Date.parse(head.observed_at); if (time < sub.state.head_observed_at || head.last_sequence < sub.state.last_sequence) continue;
      const fresh = entry.batch.entries.filter(x => x.sequence > sub.state.last_sequence); if (fresh.length && fresh[0].sequence !== sub.state.last_sequence + 1) continue;
      at = time; await sub.apply({head, entries: fresh});
    }
    replayed = at === lastAt || sub.state.session_closed; revokedSeen = sub.state.revoked_capabilities.has(p.scenarios.revoked.current_state.capability_id);
    check('the feed replays to the closed session', sub.state.session_closed === true, {last_sequence: sub.state.last_sequence});
  } catch (error) { detail = error.code || error.message; check('the feed replays to the closed session', false, detail); }
  check('the replayed feed contains the signed revocation', replayed && revokedSeen, detail);
  const journal = p.receiver_journal;
  if (journal) {
    let key = null; try { key = createPublicKey({key: Buffer.from(journal.public_key_spki_b64, 'base64'), format: 'der', type: 'spki'}); } catch {}
    const signed = !!key && journal.entries.length >= 5 && journal.entries.every(({signature_b64, ...body}) => verifyBytes(null, Buffer.from(canonicalJson(body)), key, Buffer.from(signature_b64, 'base64')));
    check('every receiver journal entry is signed by the run key', signed);
    // Each signed entry must match exactly one scenario row on every field it signs: outcome, reason, commit and count.
    const names = journal.entries.map(e => e.scenario), scenarioNames = Object.keys(p.scenarios ?? {});
    check('the receiver journal names each scenario exactly once', names.length === scenarioNames.length && new Set(names).size === names.length && scenarioNames.every(n => names.includes(n)));
    check('every signed journal outcome, reason, commit and count matches its scenario row and the store', journal.entries.every(e => { const s = p.scenarios?.[e.scenario]; return s && (s.performed === true) === e.performed && (s.observed_code ?? null) === e.observed_code && e.commit_id === (s.receipt?.commit_id ?? null) && e.draft_count === s.draft_count && e.draft_count === (p.store_rows ?? []).filter(r => r.scenario === e.scenario).length; }), undefined, 'receiver_run_signature');
  } else if (requireJournal) check('the receiver journal is present', false, 'a journal-attested verdict needs the signed receiver journal');
  const group = kind => ({passed: checks.filter(c => c.evidence === kind && c.passed).length, total: checks.filter(c => c.evidence === kind).length});
  const allPassed = checks.every(c => c.passed);
  return {contract_version: 'mvr.observer-verification/1', passed: allPassed, acceptance_level: !allPassed ? 'rejected' : journal ? 'journal_attested' : 'unsigned_reconstruction',
    acceptance_note: journal ? 'Signed conformance chain plus a receiver journal whose signed entries match each scenario row.' : 'No receiver journal: the records reconstruct consistently but no run signature attests them. A signed-attestation gate must not accept this level.', evidence_summary: {signed_conformance_chain: group('signed_conformance_chain'), receiver_run_signature: group('receiver_run_signature'), unsigned_export: group('unsigned_export')}, checks, boundary: 'Offline reconstruction inside the Enterprise conformance realm. It does not establish source truth, institutional standing, buyer operation or production authority.'};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--pinned'), packet = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), pinnedRoot = i > 0 ? JSON.parse(fs.readFileSync(process.argv[i + 1], 'utf8')).trust_root : undefined;
  const requireJournal = process.argv.includes('--require-journal');
  const verdict = await verifyObserverPacket(packet, {...(pinnedRoot ? {pinnedRoot} : {}), requireJournal}); console.log(JSON.stringify(verdict, null, 1)); process.exitCode = verdict.passed ? 0 : 1;
}
