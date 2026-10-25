// Adversarial authority conformance. Two isolated lab sessions attack each other and themselves through the real
// AMOS handlers: cross-session isolation, confused deputy, replay, altered receipts, races and secret exposure.
// Every attack must be refused or contained. Proprietary lab fixtures only; the effect is a harmless lab draft.
import assert from 'node:assert/strict';
import {webcrypto, createHash, randomBytes} from 'node:crypto';
import {canonicalJson, verifyAuthorityReceipt} from '../../sdks/javascript/authority-receipts.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
// Key material itself: a PEM private key, the base64 start of an Ed25519 PKCS#8 key, or a private JWK component.
const PRIVATE_MARKERS = ['PRIVATE KEY-----', 'MC4CAQAw', '"d":"'];

// transport(body) posts to /v1/authority-conformance. verifyReceipt(body) posts to /v1/authority-receipts/verify.
// getPublic(path) reads a public GET route. Both are optional; without them those checks are reported as skipped.
export async function runAdversarialConformance(transport, {verifyReceipt = null, getPublic = null} = {}) {
  const attacks = [], skipped = [], responses = [], secrets = new Set(), sessions = [];
  let requests = 0, n = 0;
  const op = label => 'adv-' + label + '-' + (++n);
  const send = async body => { requests++; const value = await transport(body); if (body.action !== 'issue') responses.push(JSON.stringify(value)); return value; };
  const attack = async (category, name, run) => { await run(); attacks.push({category, name}); };
  const refused = (r, label, status) => { assert((r.http_status || 200) >= 400, label + ' must be refused: ' + JSON.stringify(r).slice(0, 300)); if (status) assert.equal(r.http_status, status, label + ': ' + (r.code || r.status)); return r; };
  const good = (r, label) => { assert((r.http_status || 200) < 400, label + ': ' + (r.code || r.status) + ' ' + JSON.stringify(r).slice(0, 300)); return r; };

  async function openLab(label) {
    const session = good(await send({action:'issue', synthetic_only:true, acknowledge_no_identity_verification:true}), 'issue session ' + label);
    sessions.push(session);
    for (const c of Object.values(session.credentials)) secrets.add(c.session_token);
    const call = (role, target, request) => send({action:'call', session_id:session.session_id, session_token:session.credentials[role].session_token, target, request});
    const chain = (role, request) => call(role, 'authority', {operation_id:op(request.action), ...request});
    const keys = {};
    for (const role of ['institution', 'standing', 'source']) {
      const pair = await webcrypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
      secrets.add(Buffer.from(await webcrypto.subtle.exportKey('pkcs8', pair.privateKey)).toString('base64'));
      keys[role] = {spki:Buffer.from(await webcrypto.subtle.exportKey('spki', pair.publicKey)).toString('base64'), sign:async (type, doc) => Buffer.from(await webcrypto.subtle.sign('Ed25519', pair.privateKey, new TextEncoder().encode(`MVR-AUTHORITY-V1\n${type}\n${canonicalJson(doc)}`))).toString('base64')};
    }
    const until = new Date(Date.parse(session.expires_at) - 10000).toISOString(), from = new Date(Date.now() - 1000).toISOString();
    const scope = {tenant_id:session.tenant_id, workspace_id:session.workspace_id};
    const subject = 'AMOS Lab Adversarial Venture ' + label.toUpperCase();
    const context = {subject:{entity_name:subject}, market_scope:{country:'UG', decision_scope_level:'country'}, decision_question:'Create one harmless internal lab draft after checking a proprietary lab source hash.', evidence_pack:[{id:'LAB-E1', source_doc_id:'LAB-DOC-1', source_hash:sha('proprietary lab record'), claim:'Proprietary lab fixture record.', relationship:'supports'}]};
    const caseSecret = randomBytes(32).toString('hex'); secrets.add(caseSecret);
    const created = good(await call('institution', 'case', {action:'create', operation_id:op('case'), preflight_context:context, notes:[{text:'Proprietary lab fixture.'}], reference_secret:caseSecret, share_redacted_with_reference_holders:true, redacted_no_personal_data:true}), 'create case ' + label);
    const lab = {label, session, call, chain, keys, scope, until, from, subject, caseId:created.case_id, registry:session.receipt_registry};
    for (const [id, role, org, key, principal] of [['lab-institution', 'institution_authority', 'lab-institution', keys.institution, 'institution'], ['lab-standing', 'standing_issuer', 'lab-professional-body', keys.standing, 'institution'], ['lab-source', 'source_issuer', 'lab-source-custodian', keys.source, 'source_issuer']]) {
      const operation_id = op('anchor');
      const anchor = {type:'mvr.authority-anchor/1', anchor_id:id, anchor_role:role, organization_ref:org, organization_name_declared:'AMOS Lab ' + org, public_key_spki_b64:key.spki, jurisdictions:['UG'], provenance:'lab_fixture', not_before:from, not_after:until};
      good(await call(principal, 'authority', {action:'register_anchor', operation_id, anchor, possession_signature_b64:await key.sign('mvr.anchor-possession/1', {type:'mvr.anchor-possession/1', anchor_id:id, ...scope, public_key_spki_b64:key.spki, operation_id})}), 'anchor ' + id + ' ' + label);
    }
    lab.credential = async (credential_id, subjectSha) => {
      const doc = {type:'mvr.reviewer-standing/1', credential_id, issuer_anchor_id:'lab-standing', subject_principal_sha256:subjectSha, reviewer_display_name:'AMOS Lab reviewer', organization_ref:'lab-independent-reviewer', role_title:'Proprietary lab reviewer', competence:{residual_codes:['SOURCE_AUTHENTICITY_UNVERIFIED'], jurisdictions:['UG']}, independence:{relationship_to_subject:'none', conflicts_declared:[], declared_at:from}, delegation:{mode:'issuer_direct', max_further_delegation:0}, not_before:from, not_after:until};
      return {doc, result:await chain('institution', {action:'register_credential', document:doc, signature_b64:await keys.standing.sign(doc.type, doc)})};
    };
    lab.source = async record_id => {
      const doc = {type:'mvr.source-authentication/1', record_id, issuer_anchor_id:'lab-source', record_kind:'source_authenticity', source_doc_id:'LAB-DOC-1', source_sha256:sha('proprietary lab record'), jurisdiction:'UG', statement:'Proprietary lab source hash only', valid_from:from, valid_until:until};
      return {doc, result:await chain('source_issuer', {action:'register_source_record', document:doc, signature_b64:await keys.source.sign(doc.type, doc)})};
    };
    lab.close = async (credential_id, source_id) => good(await chain('reviewer', {action:'close_residual', case_id:lab.caseId, residual_code:'SOURCE_AUTHENTICITY_UNVERIFIED', scope_ref:'source:LAB-DOC-1', credential_id, source_record_ids:[source_id], statement:'AMOS lab hash match only', expires_at:until}), 'close residual ' + label).closure.closure_id;
    lab.effect = (extra = {}) => ({effect_id:op('effect'), effect_type:'create_draft_record', resource:{system:'amos-lab', resource_type:'draft', resource_id:'LAB-EXACT'}, amount_minor:0, currency:'UGX', external_contact:false, counterparty_ref:'lab-only', ...extra});
    lab.capabilityDoc = async (capability_id, closure_id, extra = {}) => {
      const current = good(await call('institution', 'case', {action:'get', case_id:lab.caseId}), 'read residuals ' + label);
      const residuals = [...new Set([...current.review_progress.residual_risks.map(r => r.code).filter(c => c !== 'SOURCE_AUTHENTICITY_UNVERIFIED'), 'PERMISSION_STATUS_UNASSESSED'])];
      return {type:'mvr.action-capability/1', capability_id, issuer_anchor_id:'lab-institution', ...scope, case_id:lab.caseId, basis:{required_closures:[{residual_code:'SOURCE_AUTHENTICITY_UNVERIFIED', closure_id}], accepted_open_residuals:residuals, minimum_closure_assurance:'lab_fixture'}, actor:{executor_principal_sha256:session.credentials.executor.principal_sha256}, action:{effect_type:'create_draft_record', resource_scope:{system:'amos-lab', resource_type:'draft', resource_id:'LAB-EXACT'}, amount_minor:0, max_amount_minor:0, currency:'UGX', max_uses:20, external_contact_allowed:false, counterparty_ref:'lab-only'}, human_authorization:{approver_ref_sha256:session.credentials.institution.principal_sha256, approved_at:from, method:'institution_signature'}, not_before:from, not_after:until, ...extra};
    };
    lab.capability = async (capability_id, closure_id, extra = {}, signer = keys.institution) => { const doc = await lab.capabilityDoc(capability_id, closure_id, extra); return {doc, result:await chain('institution', {action:'register_capability', document:doc, signature_b64:await signer.sign(doc.type, doc)})}; };
    lab.verify = (capability_id, effect = lab.effect()) => chain('executor', {action:'verify_capability', capability_id, requested_effect:effect}).then(r => ({...r, requested_effect:effect}));
    lab.commit = (verification, effect = verification.requested_effect) => chain('executor', {action:'commit_effect', verification_id:verification.verification_id, effect_id:effect.effect_id, requested_effect:effect});
    // A complete usable chain: standing, source, one closure and a capability.
    good((await lab.credential('lab-credential-main', session.credentials.reviewer.principal_sha256)).result, 'credential ' + label);
    good((await lab.source('lab-record-main')).result, 'source ' + label);
    lab.closureId = await lab.close('lab-credential-main', 'lab-record-main');
    good((await lab.capability('lab-capability-main', lab.closureId)).result, 'capability ' + label);
    const first = good(await lab.verify('lab-capability-main'), 'first verification ' + label);
    assert.equal(first.decision, 'allow', JSON.stringify(first.deny_reasons));
    return lab;
  }
  const contains = (value, needle) => JSON.stringify(value).includes(needle);

  try {
    const A = await openLab('a'), B = await openLab('b');
    const allowInA = async label => { const r = good(await A.verify('lab-capability-main'), label); assert.equal(r.decision, 'allow', label + ': ' + JSON.stringify(r.deny_reasons)); return r; };

    // ------------------------------------------------------------ cross-session isolation
    await attack('cross_tenant', 'another session cannot read the case', async () => {
      const r = refused(await B.call('institution', 'case', {action:'get', case_id:A.caseId}), 'foreign case read');
      assert(!contains(r, A.subject) && !contains(r, A.closureId), 'no foreign case content');
    });
    await attack('cross_tenant', 'another session cannot verify the capability', async () => {
      const r = await B.verify('lab-capability-main');
      if ((r.http_status || 200) < 400) { assert.equal(r.decision, 'allow', 'B has its own capability of the same id'); assert.equal(r.case?.case_id, B.caseId, 'the same id resolves to B\'s own capability only'); }
      const foreign = await B.chain('executor', {action:'commit_effect', verification_id:(await allowInA('A verification for B')).verification_id, effect_id:'x-foreign', requested_effect:B.effect({effect_id:'x-foreign'})});
      refused(foreign, 'foreign verification commit', 404);
    });
    await attack('cross_tenant', 'another session cannot record an outcome on a foreign verification', async () => {
      const v = await allowInA('A verification for record');
      refused(await B.chain('executor', {action:'record_effect', verification_id:v.verification_id, effect_id:v.requested_effect.effect_id, outcome:'succeeded'}), 'foreign record_effect', 404);
    });
    good((await A.source('lab-record-a-only')).result, 'A-only source');
    good((await A.capability('lab-capability-a-only', A.closureId)).result, 'A-only capability');
    await attack('cross_tenant', 'another session cannot revoke the source, capability or closure', async () => {
      refused(await B.chain('source_issuer', {action:'revoke_source_record', id:'lab-record-a-only', reason:'cross-session attempt'}), 'foreign source revoke', 404);
      refused(await B.chain('institution', {action:'revoke_capability', capability_id:'lab-capability-a-only', reason:'cross-session attempt'}), 'foreign capability revoke', 404);
      refused(await B.chain('reviewer', {action:'revoke_closure', closure_id:A.closureId, reason:'cross-session attempt'}), 'foreign closure revoke', 404);
      const still = good(await A.verify('lab-capability-a-only'), 'A-only capability after B attempts'); assert.equal(still.decision, 'allow');
      assert.equal(good(await A.chain('institution', {action:'get', kind:'source_record', id:'lab-record-a-only'}), 'A source state').source_record.usable, true);
    });
    await attack('cross_tenant', 'another session cannot read permission position, trace or state', async () => {
      refused(await B.chain('institution', {action:'check_permission', case_id:A.caseId, requested_effect:B.effect()}), 'foreign check_permission', 404);
      refused(await B.chain('institution', {action:'trace', capability_id:'lab-capability-a-only'}), 'foreign trace', 404);
      refused(await B.chain('institution', {action:'get', kind:'capability_status', id:'lab-capability-a-only'}), 'foreign capability status', 404);
      const source = good(await B.chain('institution', {action:'get', kind:'source_record', id:'lab-record-a-only'}), 'foreign source state');
      assert.equal(source.source_record.usable, false); assert.deepEqual(source.source_record.reasons, ['SOURCE_RECORD_NOT_FOUND']);
    });
    await attack('cross_tenant', 'another session cannot register issuer state on the case', async () => {
      const doc = {type:'mvr.issuer-state/1', record_id:'adv-foreign-state', issuer_anchor_id:'lab-source', case_id:A.caseId, subject:A.subject, action:'create_draft_record', geography:{country:'UG', region:null}, state:'prohibited', valid_from:B.from, valid_until:B.until, conditions:[], supersedes:null, statement:'Proprietary lab cross-session attempt.'};
      refused(await B.chain('source_issuer', {action:'register_issuer_state', document:doc, signature_b64:await B.keys.source.sign(doc.type, doc)}), 'foreign issuer state');
      await allowInA('A still allowed after foreign issuer state');
    });
    await attack('cross_tenant', 'a session token never opens another session', async () => {
      refused(await send({action:'call', session_id:B.session.session_id, session_token:A.session.credentials.institution.session_token, target:'case', request:{action:'get', case_id:B.caseId}}), 'token from another session', 401);
    });
    await attack('cross_tenant', 'identical anchor ids in two sessions resolve to the key of their own session', async () => {
      const doc = await A.capabilityDoc('lab-capability-signed-by-b', A.closureId);
      const r = await A.chain('institution', {action:'register_capability', document:doc, signature_b64:await B.keys.institution.sign(doc.type, doc)});
      refused(r, 'capability signed with the same-named anchor key of the other session', 403); assert.equal(r.code, 'AUTHORITY_SIGNATURE_INVALID');
    });
    await attack('cross_tenant', 'a receipt from one session never verifies against another session registry', async () => {
      const r = await allowInA('A receipt for key separation');
      assert.equal((await verifyAuthorityReceipt(r.receipt, {registry:A.registry, allowLabKeys:true})).valid, true);
      assert.equal((await verifyAuthorityReceipt(r.receipt, {registry:B.registry, allowLabKeys:true})).valid, false);
    });

    // ------------------------------------------------------------ confused deputy
    await attack('confused_deputy', 'an executor cannot use a capability bound to another principal', async () => {
      good((await A.capability('lab-capability-other-executor', A.closureId, {actor:{executor_principal_sha256:A.session.credentials.institution.principal_sha256}})).result, 'capability for another executor');
      const r = good(await A.verify('lab-capability-other-executor'), 'verify other executor');
      assert.equal(r.decision, 'deny'); assert(r.deny_reasons.includes('EXECUTOR_NOT_BOUND'));
    });
    await attack('confused_deputy', 'a reviewer cannot close with a credential bound to someone else', async () => {
      good((await A.credential('lab-credential-not-reviewer', A.session.credentials.institution.principal_sha256)).result, 'credential bound to institution');
      const r = await A.chain('reviewer', {action:'close_residual', case_id:A.caseId, residual_code:'SOURCE_AUTHENTICITY_UNVERIFIED', scope_ref:'source:LAB-DOC-1', credential_id:'lab-credential-not-reviewer', source_record_ids:['lab-record-main'], statement:'confused deputy attempt', expires_at:A.until});
      refused(r, 'unbound credential closure', 403); assert.equal(r.code, 'AUTHORITY_CREDENTIAL_NOT_BOUND_TO_ACCOUNT');
    });
    await attack('confused_deputy', 'a standing issuer key cannot sign a capability', async () => {
      const r = (await A.capability('lab-capability-standing-signed', A.closureId, {issuer_anchor_id:'lab-standing'}, A.keys.standing)).result;
      refused(r, 'capability under standing anchor'); assert.equal(r.code, 'AUTHORITY_ISSUER_ROLE_INVALID');
    });
    await attack('confused_deputy', 'a capability naming another workspace is refused', async () => {
      const r = (await A.capability('lab-capability-foreign-scope', A.closureId, {workspace_id:B.scope.workspace_id})).result;
      refused(r, 'foreign-scope capability', 403); assert.equal(r.code, 'AUTHORITY_CAPABILITY_SCOPE_MISMATCH');
    });
    await attack('confused_deputy', 'a source issuer key cannot sign a standing credential', async () => {
      const doc = {...(await A.credential('lab-credential-probe', A.session.credentials.reviewer.principal_sha256)).doc, credential_id:'lab-credential-wrong-issuer', issuer_anchor_id:'lab-source'};
      const r = await A.chain('institution', {action:'register_credential', document:doc, signature_b64:await A.keys.source.sign(doc.type, doc)});
      refused(r, 'credential under source anchor'); assert.equal(r.code, 'AUTHORITY_ISSUER_ROLE_INVALID');
    });
    await attack('confused_deputy', 'roles are enforced: an executor cannot register a capability, a reviewer cannot verify', async () => {
      const doc = await A.capabilityDoc('lab-capability-by-executor', A.closureId);
      refused(await A.chain('executor', {action:'register_capability', document:doc, signature_b64:await A.keys.institution.sign(doc.type, doc)}), 'executor registers capability', 403);
      refused(await A.chain('reviewer', {action:'verify_capability', capability_id:'lab-capability-main', requested_effect:A.effect()}), 'reviewer verifies', 403);
      const probe = await A.source('lab-record-probe');
      const injected = await A.chain('source_issuer', {action:'register_source_record', document:{...probe.doc, record_id:'lab-record-injected'}, signature_b64:await A.keys.source.sign(probe.doc.type, {...probe.doc, record_id:'lab-record-injected'}), target_tenant_id:B.scope.tenant_id, target_workspace_id:B.scope.workspace_id});
      refused(injected, 'scope injection', 403);
      assert.equal(good(await B.chain('institution', {action:'get', kind:'source_record', id:'lab-record-injected'}), 'B after injection').source_record.usable, false);
    });
    await attack('confused_deputy', 'a commit cannot broaden or swap the verified effect', async () => {
      const v = await allowInA('verification to broaden');
      const broadened = await A.chain('executor', {action:'commit_effect', verification_id:v.verification_id, effect_id:v.requested_effect.effect_id, requested_effect:{...v.requested_effect, resource:{...v.requested_effect.resource, resource_id:'LAB-OTHER'}}});
      refused(broadened, 'broadened commit', 409); assert.equal(broadened.code, 'AUTHORITY_COMMIT_EFFECT_MISMATCH');
      const swapped = await A.chain('executor', {action:'commit_effect', verification_id:v.verification_id, effect_id:'adv-other-effect', requested_effect:{...v.requested_effect, effect_id:'adv-other-effect'}});
      refused(swapped, 'swapped effect id');
    });

    // ------------------------------------------------------------ replay
    await attack('replay', 'an operation id replayed with a different body is refused', async () => {
      const operation_id = op('replay');
      const one = await A.source('lab-record-replay-one'), two = await A.source('lab-record-replay-two');
      good(await A.call('source_issuer', 'authority', {action:'register_source_record', operation_id, document:one.doc, signature_b64:await A.keys.source.sign(one.doc.type, one.doc)}), 'first use of operation id');
      const again = await A.call('source_issuer', 'authority', {action:'register_source_record', operation_id, document:one.doc, signature_b64:await A.keys.source.sign(one.doc.type, one.doc)});
      good(again, 'identical replay'); assert.equal(again.idempotent_replay, true);
      const conflict = await A.call('source_issuer', 'authority', {action:'register_source_record', operation_id, document:two.doc, signature_b64:await A.keys.source.sign(two.doc.type, two.doc)});
      refused(conflict, 'changed body under the same operation id', 409); assert.equal(conflict.code, 'AUTHORITY_OPERATION_CONFLICT');
    });
    await attack('replay', 'a second commit of one verification never yields a second commit id', async () => {
      const v = await allowInA('verification to commit twice');
      const first = good(await A.commit(v), 'first commit'); assert.equal(first.decision, 'commit');
      const second = good(await A.commit(v), 'second commit'); assert.equal(second.decision, 'already_committed'); assert.equal(second.commit_id, first.commit_id);
      good(await A.chain('executor', {action:'record_effect', verification_id:v.verification_id, effect_id:v.requested_effect.effect_id, outcome:'not_attempted'}), 'record once');
      const twice = await A.chain('executor', {action:'record_effect', verification_id:v.verification_id, effect_id:v.requested_effect.effect_id, outcome:'succeeded'});
      refused(twice, 'second outcome', 409); assert.equal(twice.code, 'AUTHORITY_EFFECT_ALREADY_RECORDED');
    });
    await attack('replay', 'replaying a revoked document does not restore it', async () => {
      const cred = await A.credential('lab-credential-revoked-replay', A.session.credentials.reviewer.principal_sha256); good(cred.result, 'credential to revoke');
      good(await A.chain('institution', {action:'revoke_credential', id:'lab-credential-revoked-replay', reason:'Proprietary lab revocation'}), 'revoke credential');
      const replay = good(await A.chain('institution', {action:'register_credential', document:cred.doc, signature_b64:await A.keys.standing.sign(cred.doc.type, cred.doc)}), 'replay revoked credential');
      assert.equal(replay.credential.usable, false); assert(replay.credential.reasons.includes('CREDENTIAL_REVOKED'));
      const src = await A.source('lab-record-revoked-replay'); good(src.result, 'source to revoke');
      good(await A.chain('source_issuer', {action:'revoke_source_record', id:'lab-record-revoked-replay', reason:'Proprietary lab revocation'}), 'revoke source');
      good(await A.chain('source_issuer', {action:'register_source_record', document:src.doc, signature_b64:await A.keys.source.sign(src.doc.type, src.doc)}), 'replay revoked source');
      const r = await A.chain('reviewer', {action:'close_residual', case_id:A.caseId, residual_code:'SOURCE_AUTHENTICITY_UNVERIFIED', scope_ref:'source:LAB-DOC-1', credential_id:'lab-credential-main', source_record_ids:['lab-record-revoked-replay'], statement:'replayed source', expires_at:A.until});
      refused(r, 'closure on a replayed revoked source', 409); assert.equal(r.code, 'AUTHORITY_SOURCE_RECORD_UNUSABLE');
    });
    await attack('replay', 'a verification issued before a revocation cannot be committed after it', async () => {
      good((await A.source('lab-record-late')).result, 'late source'); const closure = await A.close('lab-credential-main', 'lab-record-late');
      good((await A.capability('lab-capability-late', closure)).result, 'late capability');
      const v = good(await A.verify('lab-capability-late'), 'verify before revocation'); assert.equal(v.decision, 'allow');
      good(await A.chain('source_issuer', {action:'revoke_source_record', id:'lab-record-late', reason:'Proprietary lab revocation'}), 'revoke underlying source');
      const c = good(await A.commit(v), 'commit after revocation'); assert.equal(c.decision, 'deny'); assert.equal(c.commit_id, null);
    });

    // ------------------------------------------------------------ altered receipts
    await attack('altered_receipt', 'every altered field of a signed commit receipt fails verification', async () => {
      const v = await allowInA('verification for receipt'), c = good(await A.commit(v), 'commit for receipt');
      const receipt = c.receipt; assert.equal((await verifyAuthorityReceipt(receipt, {registry:A.registry, allowLabKeys:true})).valid, true, 'original verifies');
      const rehash = async r => { const {sha256, signature, ...body} = r; return {...r, sha256:sha(canonicalJson(body))}; };
      const edits = [['decision', r => { r.decision = 'deny'; }], ['commit_id', r => { r.commit_id = 'CM-' + '0'.repeat(48); }], ['effect_id', r => { r.effect_id = 'other'; }], ['requested_effect_sha256', r => { r.requested_effect_sha256 = '0'.repeat(64); }], ['commit_valid_until', r => { r.commit_valid_until = new Date(Date.parse(r.commit_valid_until) + 3600000).toISOString(); }], ['sequence', r => { r.sequence += 1; }], ['prev_sha256', r => { r.prev_sha256 = 'f'.repeat(64); }], ['executor_principal_sha256', r => { r.executor_principal_sha256 = 'e'.repeat(64); }]];
      for (const [field, edit] of edits) {
        const raw = structuredClone(receipt); edit(raw);
        assert.equal((await verifyAuthorityReceipt(raw, {registry:A.registry, allowLabKeys:true})).valid, false, field + ' edited');
        assert.equal((await verifyAuthorityReceipt(await rehash(raw), {registry:A.registry, allowLabKeys:true})).valid, false, field + ' edited with a recomputed hash');
      }
      for (const [field, edit] of [['signature', r => { const s = r.signature.signature_b64; r.signature.signature_b64 = (s[0] === 'A' ? 'B' : 'A') + s.slice(1); }], ['key_id', r => { r.signature.key_id = 'unknown-key'; }], ['unsigned', r => { r.signature = {status:'unsigned'}; }]]) {
        const raw = structuredClone(receipt); edit(raw);
        assert.equal((await verifyAuthorityReceipt(raw, {registry:A.registry, allowLabKeys:true})).valid, false, field + ' edited');
      }
      assert.equal((await verifyAuthorityReceipt(receipt, {registry:A.registry, allowLabKeys:false})).valid, false, 'lab key refused without opt-in');
      if (verifyReceipt) {
        assert.equal((await verifyReceipt({receipt, lab_session_id:A.session.session_id, allow_lab_keys:true})).valid, true, 'public route accepts the original');
        const tampered = await rehash({...structuredClone(receipt), decision:'deny'});
        assert.equal((await verifyReceipt({receipt:tampered, lab_session_id:A.session.session_id, allow_lab_keys:true})).valid, false, 'public route rejects a rehashed alteration');
        assert.equal((await verifyReceipt({receipt, lab_session_id:B.session.session_id, allow_lab_keys:true})).valid, false, 'public route rejects the receipt under another session');
      } else skipped.push('public receipt route (no verifyReceipt supplied)');
    });

    // ------------------------------------------------------------ races
    await attack('race', 'concurrent commits of one verification produce at most one commit id', async () => {
      const v = await allowInA('verification for concurrent commits');
      const results = await Promise.all(Array.from({length:4}, () => A.commit(v)));
      const ids = new Set(results.filter(r => (r.http_status || 200) < 400 && r.commit_id).map(r => r.commit_id));
      assert.equal(ids.size, 1, 'exactly one commit id: ' + JSON.stringify(results.map(r => r.decision || r.code)));
      assert.equal(results.filter(r => r.decision === 'commit').length, 1, 'exactly one fresh commit');
    });
    await attack('race', 'concurrent verifications never exceed max_uses', async () => {
      good((await A.capability('lab-capability-two-uses', A.closureId, {action:{...(await A.capabilityDoc('x', A.closureId)).action, max_uses:2}})).result, 'two-use capability');
      const results = await Promise.all(Array.from({length:4}, () => A.verify('lab-capability-two-uses')));
      const allowed = results.filter(r => r.decision === 'allow').length;
      assert(allowed >= 1 && allowed <= 2, 'allowed ' + allowed + ' of 4: ' + JSON.stringify(results.map(r => r.decision || r.code)));
      const after = good(await A.verify('lab-capability-two-uses'), 'verification after the race');
      if (allowed === 2) { assert.equal(after.decision, 'deny'); assert(after.deny_reasons.includes('MAX_USES_EXHAUSTED')); }
    });
    await attack('race', 'no allow is ordered after a concurrent revocation', async () => {
      good((await A.capability('lab-capability-revoke-race', A.closureId)).result, 'capability for revocation race');
      const work = [...Array.from({length:3}, () => A.verify('lab-capability-revoke-race')), A.chain('institution', {action:'revoke_capability', capability_id:'lab-capability-revoke-race', reason:'Proprietary lab revocation race'})];
      const settled = await Promise.all(work), revocation = settled[3];
      const retry = revocation.http_status >= 400 ? good(await A.chain('institution', {action:'revoke_capability', capability_id:'lab-capability-revoke-race', reason:'Proprietary lab revocation race'}), 'revoke after contention') : revocation;
      const revokedAt = retry.receipt?.sequence;
      for (const r of settled.slice(0, 3)) if (r.decision === 'allow' && Number.isSafeInteger(revokedAt) && retry === revocation) assert(r.receipt.sequence < revokedAt, 'an allow was ordered after the revocation');
      const after = good(await A.verify('lab-capability-revoke-race'), 'verification after revocation'); assert.equal(after.decision, 'deny'); assert(after.deny_reasons.includes('CAPABILITY_REVOKED'));
    });
    await attack('race', 'competing issuer-state supersessions serialize to one winner', async () => {
      const base = {type:'mvr.issuer-state/1', record_id:'adv-state-head', issuer_anchor_id:'lab-source', case_id:A.caseId, subject:A.subject, action:'amos.document.draft.create@1', geography:{country:'UG', region:null}, state:'permitted', valid_from:A.from, valid_until:A.until, conditions:[], supersedes:null, statement:'Proprietary lab race head.'};
      good(await A.chain('source_issuer', {action:'register_issuer_state', document:base, signature_b64:await A.keys.source.sign(base.type, base)}), 'race head');
      const contenders = ['one', 'two', 'three'].map(s => ({...base, record_id:'adv-state-' + s, supersedes:base.record_id, statement:'Proprietary lab race contender ' + s + '.'}));
      const results = await Promise.all(contenders.map(async d => A.chain('source_issuer', {action:'register_issuer_state', document:d, signature_b64:await A.keys.source.sign(d.type, d)})));
      assert.equal(results.filter(r => r.status === 'registered').length, 1, 'exactly one supersession: ' + JSON.stringify(results.map(r => r.status + ':' + (r.code || ''))));
    });

    // ------------------------------------------------------------ secret exposure
    await attack('secret_export', 'refusals never echo a submitted secret', async () => {
      const canary = 'sk_live_' + randomBytes(16).toString('hex'); secrets.add(canary);
      const r = await A.call('institution', 'authority', {action:'get', kind:'anchor', id:'lab-institution', api_key:canary});
      assert(!contains(r, canary), 'canary echoed');
      // The session layer redacts values sent under secret field names, so also send one under an ordinary name:
      // the engine itself must not echo request content in a refusal.
      const plain = 'sk_live_' + randomBytes(16).toString('hex'); secrets.add(plain);
      const r1 = await A.call('institution', 'authority', {action:'get', kind:'anchor', id:'lab-institution', note:plain});
      refused(r1, 'unsupported field'); assert(!contains(r1, plain), 'engine echoed request content');
      const r2 = await send({action:'call', session_id:A.session.session_id, session_token:canary.padEnd(68, '0').slice(0, 68), target:'case', request:{action:'get', case_id:A.caseId}});
      refused(r2, 'forged token'); assert(!contains(r2, canary.slice(8)), 'forged token echoed');
    });
    await attack('secret_export', 'the receipt registry publishes public keys only', async () => {
      for (const lab of [A, B]) {
        assert(Array.isArray(lab.registry.keys) && lab.registry.keys.length >= 1);
        for (const key of lab.registry.keys) { assert.match(key.public_key_spki_b64, /^MCowBQYDK2VwAyEA/); assert(!PRIVATE_MARKERS.some(m => JSON.stringify(key).includes(m)), 'private material in registry'); }
      }
    });
    if (getPublic) {
      await attack('secret_export', 'public key-ceremony and registry routes carry no private material', async () => {
        for (const path of ['/v1/key-ceremony/status', '/v1/key-ceremony/contract', '/.well-known/mvr-signing-keys.json', '/v1/authority-conformance/contract']) {
          const body = JSON.stringify(await getPublic(path));
          assert(!PRIVATE_MARKERS.some(m => body.includes(m)), path + ' carries private material');
        }
      });
    } else skipped.push('public key-ceremony routes (no getPublic supplied)');
  } finally {
    for (const session of sessions) {
      const closed = await send({action:'close', session_id:session.session_id, session_token:session.credentials.institution.session_token});
      assert.equal(closed.status, 'closed', 'session cleanup failed');
      const denied = await send({action:'call', session_id:session.session_id, session_token:session.credentials.executor.session_token, target:'authority', request:{action:'get', kind:'anchor', id:'lab-institution'}});
      assert.equal(denied.http_status, 401, 'closed session remained usable');
    }
  }
  // Nothing returned after issuance may contain a token, a private key, the case secrets or the canary.
  const leaks = [...secrets].filter(secret => responses.some(text => text.includes(secret))).length + PRIVATE_MARKERS.filter(m => responses.some(text => text.includes(m))).length;
  assert.equal(leaks, 0, 'secret material appeared in a response');
  attacks.push({category:'secret_export', name:'no token, private key, case secret or canary in any of ' + responses.length + ' responses'});
  const categories = {};
  for (const a of attacks) categories[a.category] = (categories[a.category] || 0) + 1;
  return {passed:true, sessions:sessions.length, requests, categories, attacks, skipped, classification:'AMOS lab verification; proprietary lab fixtures; harmless lab drafts only; not independent review'};
}
