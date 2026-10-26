#!/usr/bin/env python3
"""Separate implementation of AMOS issuer state version 2, written from SPEC.md.

Python 3.9+ standard library only. It shares no code with AMOS and implements its own canonical JSON,
SHA-256 use, Ed25519 (RFC 8032), base64, instants, validation, registration, evaluation and the allow/deny
contribution. It replays vectors.json and must reproduce every canonical form, digest, public key, signature,
registration outcome, evaluation and verification decision. Exit status 0 only when everything matches.

    python check.py [path/to/vectors.json]

Proprietary lab fixtures: the published keys sign nothing outside these vectors.
"""
import base64
import copy
import hashlib
import json
import re
import sys
from decimal import Decimal
from pathlib import Path

V1, V2 = 'mvr.issuer-state/1', 'mvr.issuer-state/2'
REVIEW_TYPE, RESOLUTION_TYPE = 'mvr.issuer-state-review/1', 'mvr.condition-resolution/1'
DOMAIN = 'MVR-AUTHORITY-V1'
DAY = 86400000
# SPEC 9, step 7: legacy names and the versioned identifier each is an alias of.
LEGACY_ACTION_ALIASES = {'create_draft_record': 'amos.document.draft.create@1', 'send_evidence_request': 'amos.communication.evidence.request@1', 'schedule_meeting': 'amos.calendar.meeting.create@1',
                         'contact_counterparty': 'amos.communication.counterparty.contact@1', 'publish_document': 'amos.document.publish@1', 'commit_spend': 'amos.finance.spend.commit@1'}
NO_AUTHORITY = {'issued_by_amos': False, 'amos_authorization': False, 'authority_source': 'institution_signature_only', 'real_world_identity_verified_by_amos': False}
NAN = float('nan')


class Fault(Exception):
    def __init__(self, code, status=422, detail=None):
        super().__init__(code)
        self.code, self.status, self.detail = code, status, detail


def need(ok, code, status=422):
    if not ok:
        raise Fault(code, status)


def first_utf16_units(text, n):
    """The first n UTF-16 code units of text (a split surrogate pair keeps its first half, as in JavaScript)."""
    units = text.encode('utf-16-le')[:2 * n]
    return units.decode('utf-16-le', errors='surrogatepass')


# ---------------------------------------------------------------- 1.1 canonical JSON
def utf16(text):
    """Return text as UTF-16 code units (astral characters become surrogate pairs)."""
    out = []
    for ch in text:
        o = ord(ch)
        if o > 0xFFFF:
            o -= 0x10000
            out.append(chr(0xD800 + (o >> 10)))
            out.append(chr(0xDC00 + (o & 0x3FF)))
        else:
            out.append(ch)
    return ''.join(out)


def js_len(text):
    return len(utf16(text))


ESCAPES = {'"': '\\"', '\\': '\\\\', '\b': '\\b', '\f': '\\f', '\n': '\\n', '\r': '\\r', '\t': '\\t'}


def js_string(text):
    out = ['"']
    for ch in text:
        o = ord(ch)
        if ch in ESCAPES:
            out.append(ESCAPES[ch])
        elif o < 0x20 or 0xD800 <= o <= 0xDFFF:
            out.append('\\u%04x' % o)
        else:
            out.append(ch)
    out.append('"')
    return ''.join(out)


def js_number(x):
    if isinstance(x, int) and abs(x) < 2 ** 53:
        return str(x)
    x = float(x)
    if x != x or x in (float('inf'), float('-inf')):
        raise ValueError('non-finite number')
    if x == 0:
        return '0'
    if x < 0:
        return '-' + js_number(-x)
    sign, digits, exponent = Decimal(repr(x)).as_tuple()
    digits = list(digits)
    while len(digits) > 1 and digits[-1] == 0:
        digits.pop()
        exponent += 1
    s = ''.join(map(str, digits))
    k, n = len(s), exponent + len(s)
    if k <= n <= 21:
        return s + '0' * (n - k)
    if 0 < n <= 21:
        return s[:n] + '.' + s[n:]
    if -6 < n <= 0:
        return '0.' + '0' * (-n) + s
    e = n - 1
    mantissa = s if k == 1 else s[0] + '.' + s[1:]
    return mantissa + 'e' + ('+' if e >= 0 else '-') + str(abs(e))


def canon(value):
    if value is None:
        return 'null'
    if value is True:
        return 'true'
    if value is False:
        return 'false'
    if isinstance(value, str):
        return js_string(value)
    if isinstance(value, (int, float)):
        return js_number(value)
    if isinstance(value, list):
        return '[' + ','.join(canon(v) for v in value) + ']'
    if isinstance(value, dict):
        return '{' + ','.join(js_string(k) + ':' + canon(value[k]) for k in sorted(value, key=utf16)) + '}'
    raise ValueError('unsupported JSON value')


def digest(value):
    return hashlib.sha256(canon(value).encode('utf-8')).hexdigest()


def payload(doc_type, document):
    return (DOMAIN + '\n' + str(doc_type) + '\n' + canon(document)).encode('utf-8')


# ---------------------------------------------------------------- 1.2 Ed25519 (RFC 8032) and base64
P = 2 ** 255 - 19
L = 2 ** 252 + 27742317777372353535851937790883648493
D_CONST = -121665 * pow(121666, P - 2, P) % P
SQRT_M1 = pow(2, (P - 1) // 4, P)


def _recover_x(y, sign):
    if y >= P:
        return None
    x2 = (y * y - 1) * pow(D_CONST * y * y + 1, P - 2, P) % P
    if x2 == 0:
        return None if sign else 0
    x = pow(x2, (P + 3) // 8, P)
    if (x * x - x2) % P:
        x = x * SQRT_M1 % P
    if (x * x - x2) % P:
        return None
    if (x & 1) != sign:
        x = P - x
    return x


_GY = 4 * pow(5, P - 2, P) % P
_GX = _recover_x(_GY, 0)
BASE = (_GX, _GY, 1, _GX * _GY % P)
IDENTITY = (0, 1, 1, 0)


def _add(a, b):
    A = (a[1] - a[0]) * (b[1] - b[0]) % P
    B = (a[1] + a[0]) * (b[1] + b[0]) % P
    C = 2 * a[3] * b[3] * D_CONST % P
    Dd = 2 * a[2] * b[2] % P
    E, F, G, H = B - A, Dd - C, Dd + C, B + A
    return (E * F % P, G * H % P, F * G % P, E * H % P)


def _mul(scalar, point):
    result = IDENTITY
    while scalar:
        if scalar & 1:
            result = _add(result, point)
        point = _add(point, point)
        scalar >>= 1
    return result


def _encode(point):
    zinv = pow(point[2], P - 2, P)
    x, y = point[0] * zinv % P, point[1] * zinv % P
    return (y | ((x & 1) << 255)).to_bytes(32, 'little')


def _decode(data):
    if len(data) != 32:
        return None
    y = int.from_bytes(data, 'little')
    sign, y = y >> 255, y & ((1 << 255) - 1)
    x = _recover_x(y, sign)
    return None if x is None else (x, y, 1, x * y % P)


def _h(data):
    return int.from_bytes(hashlib.sha512(data).digest(), 'little')


def _expand(seed):
    h = hashlib.sha512(seed).digest()
    a = int.from_bytes(h[:32], 'little')
    a &= (1 << 254) - 8
    a |= 1 << 254
    return a, h[32:]


def ed25519_public(seed):
    return _encode(_mul(_expand(seed)[0], BASE))


def ed25519_sign(seed, message):
    a, prefix = _expand(seed)
    public = _encode(_mul(a, BASE))
    r = _h(prefix + message) % L
    R = _encode(_mul(r, BASE))
    s = (r + _h(R + public + message) % L * a) % L
    return R + s.to_bytes(32, 'little')


_verified = {}


def ed25519_verify(public, message, signature):
    key = (public, message, signature)
    if key in _verified:
        return _verified[key]
    ok = False
    if len(public) == 32 and len(signature) == 64:
        A = _decode(public)
        s = int.from_bytes(signature[32:], 'little')
        if A is not None and s < L:
            k = _h(signature[:32] + public + message) % L
            minus_a = ((P - A[0]) % P, A[1], A[2], (P - A[3]) % P)
            ok = _encode(_add(_mul(s, BASE), _mul(k, minus_a))) == signature[:32]
    _verified[key] = ok
    return ok


B64 = re.compile(r'[A-Za-z0-9+/]*')


def atob(text):
    if not isinstance(text, str):
        raise ValueError('not a string')
    text = re.sub(r'[\t\n\f\r ]', '', text)
    if len(text) % 4 == 0:
        text = text[:-2] if text.endswith('==') else text[:-1] if text.endswith('=') else text
    if len(text) % 4 == 1 or not B64.fullmatch(text):
        raise ValueError('invalid base64')
    return base64.b64decode(text + '=' * (-len(text) % 4))


SPKI_PREFIX = bytes.fromhex('302a300506032b6570032100')


def spki_raw(spki_b64):
    data = atob(spki_b64)
    if len(data) != 44 or not data.startswith(SPKI_PREFIX):
        raise ValueError('not an Ed25519 SPKI')
    return data[12:]


def verify_b64(spki_b64, message, signature_b64):
    try:
        return ed25519_verify(spki_raw(spki_b64), message, atob(signature_b64))
    except Exception:
        return False


# ---------------------------------------------------------------- 1.3 instants
INSTANT = re.compile(r'([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{3}))?Z')


def _days_from_civil(y, m, d):
    y -= m <= 2
    era = y // 400
    yoe = y - era * 400
    doy = (153 * (m + (-3 if m > 2 else 9)) + 2) // 5 + d - 1
    doe = yoe * 365 + yoe // 4 - yoe // 100 + doy
    return era * 146097 + doe - 719468


def _civil_from_days(z):
    z += 719468
    era = z // 146097
    doe = z - era * 146097
    yoe = (doe - doe // 1460 + doe // 36524 - doe // 146096) // 365
    doy = doe - (365 * yoe + yoe // 4 - yoe // 100)
    mp = (5 * doy + 2) // 153
    d = doy - (153 * mp + 2) // 5 + 1
    m = mp + (3 if mp < 10 else -9)
    return yoe + era * 400 + (m <= 2), m, d


def ms(value):
    if not isinstance(value, str):
        return NAN
    match = INSTANT.fullmatch(value)
    if not match:
        return NAN
    year, month, day, hour, minute, second = (int(match.group(i)) for i in range(1, 7))
    milli = int(match.group(7) or 0)
    if not (1 <= month <= 12 and 1 <= day <= 31 and minute <= 59 and second <= 59):
        return NAN
    if hour > 24 or (hour == 24 and (minute or second or milli)):
        return NAN
    days = _days_from_civil(year, month, 1) + day - 1
    return ((days * 24 + hour) * 60 + minute) * 60000 + second * 1000 + milli


def is_instant(value):
    return ms(value) == ms(value)


def iso(milliseconds):
    days, rest = divmod(int(milliseconds), DAY)
    y, m, d = _civil_from_days(days)
    return '%04d-%02d-%02dT%02d:%02d:%02d.%03dZ' % (y, m, d, rest // 3600000, rest // 60000 % 60, rest // 1000 % 60, rest % 1000)


# ---------------------------------------------------------------- 1.4 predicates
JS_WHITESPACE = set('\t\n\x0b\x0c\r       　﻿') | {chr(c) for c in range(0x2000, 0x200B)}
ID = re.compile(r'[A-Za-z0-9][A-Za-z0-9._:-]{2,119}')
HEX = re.compile(r'[a-f0-9]{64}')
COUNTRY, CURRENCY, CASE = re.compile(r'[A-Z]{2}'), re.compile(r'[A-Z]{3}'), re.compile(r'RC-[a-f0-9]{64}')


def text(value, limit=200):
    return isinstance(value, str) and any(ch not in JS_WHITESPACE for ch in value) and js_len(value) <= limit


def matches(pattern, value):
    return isinstance(value, str) and pattern.fullmatch(value) is not None


def is_id(value):
    return matches(ID, value)


def is_hex(value):
    return matches(HEX, value)


def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def safe(value):
    return is_number(value) and abs(value) <= 2 ** 53 - 1 and float(value).is_integer()


def exact(value, keys):
    return isinstance(value, dict) and set(value) == set(keys)


def truthy(value):
    """JavaScript truthiness for JSON values."""
    if value is None or value is False:
        return False
    if is_number(value):
        return value != 0
    if isinstance(value, str):
        return value != ''
    return True


def first_truthy(*values):
    for value in values:
        if truthy(value):
            return value
    return values[-1]


def get(value, *path):
    for key in path:
        value = value.get(key) if isinstance(value, dict) else None
    return value


# ---------------------------------------------------------------- 8. declared relationship text rule
_S = '[\t\n\x0b\x0c\r    -     　﻿]'
FLAGS = re.IGNORECASE | re.ASCII
RESTRICTIVE = re.compile((r'\b(?:must\s+not|may\s+not|shall\s+not|not\s+(?:authori[sz]ed|permitted|allowed)|does\s+not\s+authori[sz]e|'
                          r'cease\s+(?:distribution|operations|selling|trading)|stop\s+(?:distribution|selling|trading)|prohibited|revoked|'
                          r'suspended|subject\s+to|approval\s+in\s+principle|unless)\b').replace(r'\s', _S), FLAGS)
POSITIVE = re.compile((r'\b(?:may|can|permits?|permitted|allows?|allowed|authori[sz](?:ed|es)|permission|clearance|approved|grants?|granted|'
                       r'launch|operate|operating|distribute|distribution|enrol|enroll|collect|sell|proceed|implement)\b'), FLAGS)
NEGATED = re.compile((r'\b(?:not|never|no longer)(?:\s+been)?\s*\Z').replace(r'\s', _S), FLAGS)
NEGATABLE = re.compile(r'(?:revoked|suspended|prohibited)', FLAGS)
FIXED_CLAIM = 'The subject may perform the requested action.'


def restriction(units):
    for match in RESTRICTIVE.finditer(units):
        if NEGATABLE.fullmatch(match.group(0)) and NEGATED.search(units[max(0, match.start() - 30):match.start()]):
            continue
        return match
    return None


def text_conflict(clause, relationship):
    claim = utf16(FIXED_CLAIM)
    if relationship != 'direct_support' or not POSITIVE.search(claim) or restriction(claim):
        return False
    units = utf16(clause)
    scanned = units[:8192]
    return restriction(scanned) is not None or len(units) > len(scanned)


# ---------------------------------------------------------------- the store and dependency state (sections 3 and 4)
class Store:
    def __init__(self, initial):
        self.anchors = copy.deepcopy(initial['anchors'])
        self.credentials = copy.deepcopy(initial['credentials'])
        self.sources = copy.deepcopy(initial['source_records'])
        self.closures = copy.deepcopy(initial['closures'])
        self.cases = copy.deepcopy(initial['cases'])
        self.case_by_id = {c['case_id']: c for c in self.cases.values()}
        self.rows = {}
        self.heads = {c['case_id']: {} for c in self.cases.values()}

    def anchor_state(self, anchor_id, role, now):
        if not is_id(anchor_id):
            return False, ['AUTHORITY_ANCHOR_ID_INVALID'], None
        anchor = self.anchors.get(anchor_id)
        if not (isinstance(anchor, dict) and anchor.get('contract_version') == 'mvr.authority-chain/1' and anchor.get('anchor_id') == anchor_id and anchor.get('document_sha256') == digest(anchor.get('document'))):
            return False, ['AUTHORITY_ANCHOR_NOT_FOUND'], None
        doc, reasons = anchor['document'], []
        if anchor.get('status') != 'active':
            reasons.append('ANCHOR_' + str(anchor.get('status') or 'invalid').upper())
        if ms(doc.get('not_before')) > now:
            reasons.append('ANCHOR_NOT_YET_VALID')
        if ms(doc.get('not_after')) <= now:
            reasons.append('ANCHOR_EXPIRED')
        if role and doc.get('anchor_role') != role:
            reasons.append('ANCHOR_ROLE_MISMATCH')
        return not reasons, reasons, anchor

    def credential_state(self, credential_id, now, depth=0):
        row = self.credentials.get(credential_id) if is_id(credential_id) else None
        if not (isinstance(row, dict) and get(row, 'document', 'credential_id') == credential_id and row.get('document_sha256') == digest(row.get('document'))):
            return {'usable': False, 'reasons': ['CREDENTIAL_NOT_FOUND']}
        doc, reasons = row['document'], []
        usable, anchor_reasons, anchor = self.anchor_state(doc.get('issuer_anchor_id'), 'standing_issuer', now)
        if not usable:
            reasons += ['ISSUER_' + r for r in anchor_reasons]
        elif not verify_b64(anchor['document']['public_key_spki_b64'], payload(doc.get('type'), doc), row.get('signature_b64')):
            reasons.append('CREDENTIAL_SIGNATURE_INVALID')
        if row.get('status') != 'active':
            reasons.append('CREDENTIAL_' + str(row.get('status')).upper())
        if ms(doc.get('not_before')) > now:
            reasons.append('CREDENTIAL_NOT_YET_VALID')
        if ms(doc.get('not_after')) <= now:
            reasons.append('CREDENTIAL_EXPIRED')
        delegation = doc.get('delegation') or {}
        if delegation.get('mode') == 'delegated':
            if depth > 0:
                reasons.append('DELEGATION_DEPTH_EXCEEDED')
            else:
                parent = self.credential_state(delegation.get('delegated_from_credential_id'), now, 1)
                if not parent['usable']:
                    reasons.append('DELEGATING_CREDENTIAL_UNUSABLE')
                else:
                    pd = parent['document']
                    if not (get(pd, 'delegation', 'max_further_delegation') or 0) >= 1 or pd.get('issuer_anchor_id') != doc.get('issuer_anchor_id'):
                        reasons.append('DELEGATION_NOT_AUTHORIZED')
                    elif any(c not in pd['competence']['jurisdictions'] for c in doc['competence']['jurisdictions']) or any(c not in pd['competence']['residual_codes'] for c in doc['competence']['residual_codes']) or ms(doc['not_after']) > ms(pd['not_after']):
                        reasons.append('DELEGATION_SCOPE_EXPANDED')
        return {'usable': not reasons, 'reasons': reasons, 'document': doc, 'row': row}

    def source_state(self, record_id, now):
        row = self.sources.get(record_id) if is_id(record_id) else None
        if not (isinstance(row, dict) and get(row, 'document', 'record_id') == record_id and row.get('document_sha256') == digest(row.get('document'))):
            return {'usable': False, 'reasons': ['SOURCE_RECORD_NOT_FOUND']}
        doc, reasons = row['document'], []
        usable, anchor_reasons, anchor = self.anchor_state(doc.get('issuer_anchor_id'), 'source_issuer', now)
        if not usable:
            reasons += ['ISSUER_' + r for r in anchor_reasons]
        elif not verify_b64(anchor['document']['public_key_spki_b64'], payload(doc.get('type'), doc), row.get('signature_b64')):
            reasons.append('SOURCE_RECORD_SIGNATURE_INVALID')
        if row.get('status') != 'active':
            reasons.append('SOURCE_RECORD_' + str(row.get('status')).upper())
        if ms(doc.get('valid_from')) > now:
            reasons.append('SOURCE_RECORD_NOT_YET_VALID')
        if ms(doc.get('valid_until')) <= now:
            reasons.append('SOURCE_RECORD_EXPIRED')
        return {'usable': not reasons, 'reasons': reasons, 'document': doc}

    def closure_state(self, closure_id, now):
        row = self.closures.get(closure_id) if is_id(closure_id) else None
        if not (isinstance(row, dict) and row.get('closure_id') == closure_id and row.get('content_sha256') == digest(row.get('content'))):
            return {'usable': False}
        content = row['content']
        usable = row.get('status') == 'active' and ms(content.get('expires_at')) > now and self.credential_state(content.get('credential_id'), now)['usable']
        usable = usable and all(self.source_state(r, now)['usable'] for r in content.get('source_record_ids') or [])
        return {'usable': bool(usable), 'case_id': content.get('case_id'), 'row': row}


# ---------------------------------------------------------------- 5. validation
V1_FIELDS = ['type', 'record_id', 'issuer_anchor_id', 'case_id', 'subject', 'action', 'geography', 'state', 'valid_from', 'valid_until', 'conditions', 'supersedes', 'statement']
V2_FIELDS = V1_FIELDS + ['original_document_sha256', 'source_review', 'ceiling', 'condition_receipts']
STATES = ['permitted', 'prohibited', 'conditional', 'revoked']


def validate_condition(c):
    refs = c.get('required_references') if isinstance(c, dict) else None
    need(exact(c, ['condition_id', 'predicate', 'required_references', 'resolver_credential_id', 'waiver_allowed']) and is_id(c['condition_id']) and is_id(c['resolver_credential_id']) and isinstance(c['waiver_allowed'], bool) and isinstance(refs, list) and 1 <= len(refs) <= 10, 'CONDITION_INVALID')
    need(all(exact(r, ['kind', 'id', 'sha256']) and r['kind'] in ('source_record', 'closure') and is_id(r['id']) and is_hex(r['sha256']) for r in refs) and len({r['kind'] + ':' + r['id'] for r in refs}) == len(refs), 'CONDITION_REFERENCE_INVALID')
    p = c['predicate']
    need(isinstance(p, dict), 'CONDITION_PREDICATE_INVALID')
    kind = p.get('type')
    if kind == 'all_references_current':
        ok = exact(p, ['type'])
    elif kind == 'amount_at_most':
        ok = exact(p, ['type', 'amount_minor', 'currency']) and safe(p['amount_minor']) and p['amount_minor'] >= 0 and matches(CURRENCY, p['currency'])
    elif kind == 'within_time_window':
        ok = exact(p, ['type', 'not_before', 'not_after']) and is_instant(p['not_before']) and is_instant(p['not_after']) and ms(p['not_before']) < ms(p['not_after'])
    else:
        ok = False
    need(ok, 'CONDITION_PREDICATE_INVALID')


def validate(doc, action_ids):
    reviewed = isinstance(doc, dict) and doc.get('type') == V2
    need(exact(doc, V2_FIELDS if reviewed else V1_FIELDS) and (doc['type'] == V1 or reviewed) and is_id(doc['record_id']) and is_id(doc['issuer_anchor_id']) and matches(CASE, doc['case_id']), 'ISSUER_STATE_DOCUMENT_INVALID')
    g = doc['geography']
    need(text(doc['subject']) and isinstance(doc['action'], str) and doc['action'] in action_ids and exact(g, ['country', 'region']) and matches(COUNTRY, g['country']) and (g['region'] is None or text(g['region'])), 'ISSUER_STATE_SCOPE_INVALID')
    conditions = doc['conditions']
    need(isinstance(doc['state'], str) and doc['state'] in STATES and isinstance(conditions, list) and len(conditions) <= 20 and (reviewed or all(text(c) for c in conditions)) and (doc['supersedes'] is None or is_id(doc['supersedes'])) and text(doc['statement'], 1000), 'ISSUER_STATE_DOCUMENT_INVALID')
    if reviewed:
        ceiling = doc['ceiling']
        need(is_hex(doc['original_document_sha256']) and exact(ceiling, ['amount_minor', 'currency']) and safe(ceiling['amount_minor']) and ceiling['amount_minor'] >= 0 and matches(CURRENCY, ceiling['currency']) and isinstance(doc['condition_receipts'], list) and len(doc['condition_receipts']) <= 20, 'ISSUER_STATE_REVIEWED_SCOPE_INVALID')
        for condition in conditions:
            validate_condition(condition)
        need(len({c['condition_id'] for c in conditions}) == len(conditions) and (doc['state'] != 'conditional' or len(conditions) > 0), 'ISSUER_STATE_CONDITIONS_INVALID')
    start, end = ms(doc['valid_from']), ms(doc['valid_until'])
    need(is_instant(doc['valid_from']) and is_instant(doc['valid_until']) and start < end and end - start <= 366 * DAY, 'ISSUER_STATE_WINDOW_INVALID')


# ---------------------------------------------------------------- 6, 7, 11: issuer, review and conditions
REVIEW_FIELDS = ['type', 'assertion_sha256', 'original_document_sha256', 'clause_text', 'clause_locator', 'target_claim', 'relationship', 'reviewer_credential_id', 'standing_sha256', 'reviewed_at', 'valid_until', 'extractor_name', 'extractor_version', 'model_version', 'runtime_model_version']
RECEIPT_FIELDS = ['type', 'receipt_id', 'condition_sha256', 'scope_sha256', 'resolver_credential_id', 'disposition', 'reason', 'issued_at', 'expires_at']


def assertion_of(doc):
    return {k: v for k, v in doc.items() if k not in ('source_review', 'condition_receipts')}


def scope_of(doc):
    return dict(doc, condition_receipts=[])


class Engine:
    def __init__(self, vectors):
        self.store = Store(vectors['initial_store'])
        self.action_ids = vectors['constants']['action_ids']
        self.engine_version = vectors['constants']['issuer_review_engine_version']

    def check_issuer(self, doc, signature, now):
        anchor = self.store.anchors.get(doc['issuer_anchor_id'])
        need(isinstance(anchor, dict) and anchor.get('contract_version') == 'mvr.authority-chain/1' and anchor.get('anchor_id') == doc['issuer_anchor_id'] and anchor.get('document_sha256') == digest(anchor.get('document')), 'ISSUER_STATE_ANCHOR_INTEGRITY_FAILED', 503)
        a = anchor['document']
        need(anchor.get('trust_tier') == 'lab_fixture' and a.get('anchor_role') == 'source_issuer', 'ISSUER_STATE_LAB_ISSUER_REQUIRED', 403)
        need(anchor.get('status') == 'active' and ms(a['not_before']) <= now and ms(a['not_after']) > now and doc['geography']['country'] in a['jurisdictions'], 'ISSUER_STATE_ISSUER_INACTIVE', 409)
        need(ms(doc['valid_until']) <= ms(a['not_after']), 'ISSUER_STATE_WINDOW_INVALID')
        need(verify_b64(a['public_key_spki_b64'], payload(doc['type'], doc), signature), 'ISSUER_STATE_SIGNATURE_INVALID', 403)

    def check_review(self, doc, now):
        review = doc['source_review']
        b = review.get('document') if isinstance(review, dict) else None
        limits = {'clause_text': 8000, 'target_claim': 1000}
        need(isinstance(review, dict) and all(k in ('document', 'signature_b64') for k in review) and isinstance(review.get('signature_b64'), str) and js_len(review['signature_b64']) == 88
             and isinstance(b, dict) and len(b) == len(REVIEW_FIELDS) and all(text(b.get(k), limits.get(k, 500)) for k in REVIEW_FIELDS) and b['type'] == REVIEW_TYPE, 'ISSUER_REVIEW_REQUIRED')
        need(b['assertion_sha256'] == digest(assertion_of(doc)) and b['original_document_sha256'] == doc['original_document_sha256'] and b['relationship'] in ('direct_support', 'qualifies', 'contradicts') and b['runtime_model_version'] == self.engine_version, 'ISSUER_REVIEW_BINDING_CHANGED')
        need(not (doc['state'] == 'permitted' and b['relationship'] != 'direct_support'), 'ISSUER_REVIEW_PERMISSION_RELATIONSHIP_INVALID')
        start, end = ms(b['reviewed_at']), ms(b['valid_until'])
        need(is_instant(b['reviewed_at']) and is_instant(b['valid_until']) and start <= now and end > now and end - start <= 7 * DAY and ms(doc['valid_until']) <= end, 'ISSUER_REVIEW_VALIDITY_INVALID')
        standing = self.store.credential_state(b['reviewer_credential_id'], now)
        sd = standing.get('document') or {}
        need(standing['usable'] and truthy(sd.get('reviewer_public_key_spki_b64')) and standing['row'].get('document_sha256') == b['standing_sha256']
             and doc['geography']['country'] in sd['competence']['jurisdictions'] and 'PERMISSION_STATUS_UNASSESSED' in sd['competence']['residual_codes']
             and ms(sd['not_before']) <= start and ms(sd['not_after']) >= end, 'ISSUER_REVIEW_STANDING_INVALID')
        need(verify_b64(sd['reviewer_public_key_spki_b64'], payload(b['type'], b), review['signature_b64']), 'ISSUER_REVIEW_SIGNATURE_INVALID')
        need(not (doc['state'] in ('permitted', 'conditional') and text_conflict(b['clause_text'], b['relationship'])), 'DECLARED_RELATIONSHIP_TEXT_CONFLICT')
        return {'reviewer_credential_id': b['reviewer_credential_id'], 'reviewer_principal_sha256': sd['subject_principal_sha256'], 'standing_sha256': b['standing_sha256'],
                'review_valid_until': b['valid_until'], 'assertion_sha256': b['assertion_sha256'], 'legal_truth_asserted': False, 'source_authenticity_verified': False}

    def condition(self, doc, condition, scope, receipt, now):
        blocked = lambda reason: {'condition_id': condition['condition_id'], 'satisfied': False, 'reason': reason}
        if not (is_hex(scope['scope_sha256']) and safe(scope['amount_minor']) and scope['amount_minor'] >= 0 and matches(CURRENCY, scope['currency'])):
            return blocked('CONDITION_SCOPE_REQUIRED')
        if not (exact(receipt, ['document', 'signature_b64']) and isinstance(receipt['signature_b64'], str) and js_len(receipt['signature_b64']) == 88):
            return blocked('CONDITION_SIGNED_RECEIPT_REQUIRED')
        d = receipt['document']
        if not (exact(d, RECEIPT_FIELDS) and d['type'] == RESOLUTION_TYPE and is_id(d['receipt_id']) and d['condition_sha256'] == digest(condition) and d['scope_sha256'] == scope['scope_sha256']
                and d['resolver_credential_id'] == condition['resolver_credential_id'] and d['disposition'] in ('satisfied', 'waived') and text(d['reason'], 1000)
                and is_instant(d['issued_at']) and is_instant(d['expires_at']) and ms(d['issued_at']) <= now and ms(d['expires_at']) > now and ms(d['expires_at']) - ms(d['issued_at']) <= DAY):
            return blocked('CONDITION_RECEIPT_INVALID')
        if d['disposition'] == 'waived' and not condition['waiver_allowed']:
            return blocked('CONDITION_WAIVER_NOT_AUTHORIZED')
        try:
            standing = self.store.credential_state(condition['resolver_credential_id'], now)
            sd = standing.get('document') or {}
            key = sd.get('reviewer_public_key_spki_b64')
            if not (standing['usable'] and truthy(key) and ms(sd['not_before']) <= ms(d['issued_at']) and doc['geography']['country'] in sd['competence']['jurisdictions'] and 'PERMISSION_STATUS_UNASSESSED' in sd['competence']['residual_codes']):
                return blocked('CONDITION_RESOLVER_INVALID')
            # An undecodable key or signature is a dependency failure, not a verdict on the resolver.
            public, signature = spki_raw(key), atob(receipt['signature_b64'])
            if not (ed25519_verify(public, payload(d['type'], d), signature) and is_hex(sd.get('subject_principal_sha256')) and is_instant(sd.get('not_after')) and ms(sd['not_after']) >= ms(d['expires_at'])):
                return blocked('CONDITION_RESOLVER_INVALID')
            for ref in condition['required_references']:
                if ref['kind'] == 'source_record':
                    state = self.store.source_state(ref['id'], now)
                    current = state['usable'] and get(state, 'document', 'jurisdiction') == doc['geography']['country']
                    sha = digest(state['document']) if state.get('document') is not None else None
                else:
                    state = self.store.closure_state(ref['id'], now)
                    current = state['usable'] and state.get('case_id') == doc['case_id']
                    sha = (self.store.closures.get(ref['id']) or {}).get('content_sha256')
                if not current or sha != ref['sha256']:
                    return blocked('CONDITION_DEPENDENCY_INACTIVE')
            p = condition['predicate']
            holds = (p['type'] == 'all_references_current'
                     or p['type'] == 'amount_at_most' and scope['currency'] == p['currency'] and scope['amount_minor'] <= p['amount_minor']
                     or p['type'] == 'within_time_window' and ms(p['not_before']) <= now and ms(p['not_after']) > now)
            if not holds and d['disposition'] != 'waived':
                return blocked('CONDITION_PREDICATE_FALSE')
            window_end = ms(p['not_after']) if p['type'] == 'within_time_window' and d['disposition'] != 'waived' else float('inf')
            return {'condition_id': condition['condition_id'], 'satisfied': True, 'disposition': d['disposition'], 'receipt_id': d['receipt_id'],
                    'resolver_principal_sha256': sd['subject_principal_sha256'], 'valid_until': iso(min(ms(d['expires_at']), window_end)), 'source_truth_asserted': False}
        except Exception:
            return blocked('CONDITION_DEPENDENCY_UNAVAILABLE')

    def conditions(self, doc, now):
        scope = {'scope_sha256': digest(scope_of(doc)), 'amount_minor': doc['ceiling']['amount_minor'], 'currency': doc['ceiling']['currency']}
        results = []
        for condition in doc['conditions']:
            condition_sha = digest(condition)
            found = [r for r in doc['condition_receipts'] if get(r, 'document', 'condition_sha256') == condition_sha and get(r, 'document', 'resolver_credential_id') == condition['resolver_credential_id']]
            if len(found) != 1:
                results.append({'condition_id': condition['condition_id'], 'satisfied': False, 'reason': 'CONDITION_UNIQUE_RECEIPT_REQUIRED'})
                continue
            results.append(self.condition(doc, condition, scope, found[0], now))
        return {'satisfied': all(r['satisfied'] for r in results), 'conditions': results, 'scope_sha256': scope['scope_sha256']}

    # ------------------------------------------------------------ 9. registration
    def register(self, doc, signature, now):
        try:
            validate(doc, self.action_ids)
            need(ms(doc['valid_until']) > now, 'ISSUER_STATE_EXPIRED', 409)
            self.check_issuer(doc, signature, now)
            if doc['type'] == V2:
                self.check_review(doc, now)
            case = self.store.case_by_id[doc['case_id']]
            context = case.get('preflight_context')
            need(case.get('status') == 'active' and truthy(context), 'ISSUER_STATE_CASE_UNAVAILABLE', 409)
            subject = first_truthy(get(context, 'subject', 'entity_name'), get(context, 'subject', 'entity_id'), context.get('entity_name'), context.get('entity'))
            market = context.get('market_scope') or {}
            region = market.get('region') if truthy(market.get('region')) else None
            need(doc['subject'] == subject and doc['geography']['country'] == market.get('country') and doc['geography']['region'] == region, 'ISSUER_STATE_CASE_SCOPE_MISMATCH', 409)
            if doc['type'] == V2:
                intended = context.get('intended_action')
                if intended != doc['action']:
                    def canonical(value):
                        return LEGACY_ACTION_ALIASES.get(value, value) if isinstance(value, str) else None
                    raise Fault('ISSUER_STATE_CASE_ACTION_MISMATCH', 409, {
                        'case_intended_action': first_utf16_units(intended, 120) if isinstance(intended, str) else None,
                        'issuer_state_action': doc['action'],
                        'same_action_by_alias': isinstance(intended, str) and canonical(intended) == canonical(doc['action']),
                        'fix': 'Use the identical action identifier in the case intended_action and the signed issuer state.'})
            heads = self.store.heads[doc['case_id']]
            slot = doc['issuer_anchor_id'] + ':' + doc['action']
            prior = heads.get(slot) or None
            existing = self.store.rows.get(doc['record_id'])
            sha = digest(doc)
            if existing:
                need(existing['document_sha256'] == sha and existing['signature_b64'] == signature, 'ISSUER_STATE_RECORD_CONFLICT', 409)
                return dict({'status': 'registered', 'issuer_state': {'record_id': doc['record_id'], 'state': doc['state'], 'lab_fixture': True}, 'idempotent_record': True}, **NO_AUTHORITY)
            need(doc['supersedes'] == prior, 'ISSUER_STATE_SUPERSESSION_REQUIRED', 409)
            need(len(heads) < 40 or prior is not None, 'ISSUER_STATE_CASE_LIMIT', 409)
            self.store.rows[doc['record_id']] = {'document': copy.deepcopy(doc), 'document_sha256': sha, 'signature_b64': signature, 'case_context_sha256': case['context_sha256']}
            heads[slot] = doc['record_id']
            return dict({'status': 'registered', 'issuer_state': {'record_id': doc['record_id'], 'state': doc['state'], 'supersedes': doc['supersedes'], 'lab_fixture': True, 'production_authority': False}, 'dependents_rechecked_on_next_read': True}, **NO_AUTHORITY)
        except Fault as fault:
            status = 'system_unavailable' if fault.status >= 500 else {403: 'forbidden', 404: 'not_found', 409: 'conflict'}.get(fault.status, 'invalid_input')
            return dict({'status': status, 'http_status': fault.status, 'code': fault.code}, **({'detail': fault.detail} if fault.detail is not None else {}), **NO_AUTHORITY)

    # ------------------------------------------------------------ 10. evaluation
    def evaluate(self, case, now):
        heads = self.store.heads[case['case_id']]
        need(len(heads) <= 40, 'ISSUER_STATE_INDEX_INVALID', 503)
        states = []
        for slot, record_id in heads.items():
            saved = self.store.rows.get(record_id)
            doc = saved.get('document') if saved else None
            reason = review = resolution = None
            try:
                need(saved and isinstance(doc, dict) and doc.get('record_id') == record_id and doc.get('case_id') == case['case_id'] and slot == str(doc.get('issuer_anchor_id')) + ':' + str(doc.get('action'))
                     and saved.get('case_context_sha256') == case['context_sha256'] and saved.get('document_sha256') == digest(doc), 'ISSUER_STATE_INTEGRITY_FAILED', 503)
                validate(doc, self.action_ids)
                self.check_issuer(doc, saved['signature_b64'], now)
                if doc['type'] == V2:
                    review = self.check_review(doc, now)
                if ms(doc['valid_from']) > now:
                    reason = 'ISSUER_STATE_NOT_YET_VALID'
                elif ms(doc['valid_until']) <= now:
                    reason = 'ISSUER_STATE_EXPIRED'
                elif doc['state'] in ('prohibited', 'revoked'):
                    reason = 'ISSUER_STATE_' + doc['state'].upper()
                elif doc['type'] == V2:
                    resolution = self.conditions(doc, now)
                    if not resolution['satisfied']:
                        reason = 'ISSUER_STATE_CONDITIONS_UNRESOLVED'
                elif doc['state'] != 'permitted' or doc['conditions']:
                    reason = 'ISSUER_STATE_CONDITIONAL' if doc['state'] == 'conditional' else 'ISSUER_STATE_CONDITIONS_UNRESOLVED'
            except Fault as fault:
                reason = fault.code
            except Exception:
                reason = 'ISSUER_STATE_UNAVAILABLE'
            d = doc if isinstance(doc, dict) else {}
            row = {'record_id': record_id, 'issuer_anchor_id': d.get('issuer_anchor_id') or None, 'action': d.get('action') or None, 'state': d.get('state') or 'unavailable',
                   'blocking': reason is not None, 'reason': reason, 'valid_until': d.get('valid_until') or None, 'conditions': d.get('conditions') or [],
                   'supersedes': d.get('supersedes') or None, 'document_sha256': (saved or {}).get('document_sha256') or None, 'lab_fixture': True}
            if d.get('type') == V2:
                row.update(review=review, condition_resolution=resolution)
                if 'ceiling' in d:
                    row['ceiling'] = d['ceiling']
            states.append(row)
        return {'contract': V1, 'states': states, 'blocking': any(s['blocking'] for s in states), 'caller_labels_override': False, 'prose_is_supporting_material': True, 'production_authority': False}

    # ------------------------------------------------------------ 12. capability verification contribution
    def effect(self, case, requested, now):
        evaluation = self.evaluate(case, now)
        capability = case['capability']
        effect_type = capability['effect_type']
        issuer = [s['reason'] for s in evaluation['states'] if s['blocking'] and (not s['action'] or s['action'] == effect_type)]
        issuer += ['ISSUER_STATE_CEILING_EXCEEDED' for s in evaluation['states'] if s['action'] == effect_type and s.get('ceiling')
                   and (requested['currency'] != s['ceiling']['currency'] or requested['amount_minor'] > s['ceiling']['amount_minor'])]
        contradiction = []
        if evaluation['blocking']:
            contradiction.append('CASE_ACTIVE_CONTRADICTION')
            if 'REVIEW_CONTRADICTION' not in capability['accepted_open_residuals']:
                contradiction.append('UNACCEPTED_OPEN_RESIDUAL:REVIEW_CONTRADICTION')
        return issuer, contradiction

    def revoke(self, kind, target):
        table = {'anchor': self.store.anchors, 'credential': self.store.credentials, 'source_record': self.store.sources, 'closure': self.store.closures}[kind]
        table[target]['status'] = 'revoked'


# ---------------------------------------------------------------- constructors (section 2)
CONSTRUCTORS = {
    'issuer_state_document': lambda doc: canon(doc),
    'issuer_state_signing_payload': lambda doc: payload(doc['type'], doc).decode('utf-8'),
    'assertion': lambda doc: canon(assertion_of(doc)),
    'review_signing_payload': lambda doc: payload(REVIEW_TYPE, doc['source_review']['document']).decode('utf-8'),
    'condition': lambda doc: canon(doc['conditions'][0]),
    'condition_scope': lambda doc: canon(scope_of(doc)),
    'condition_resolution_signing_payload': lambda doc: payload(RESOLUTION_TYPE, doc['condition_receipts'][0]['document']).decode('utf-8'),
    'standing_reference': lambda row: canon(row['document']),
    'source_record_reference': lambda row: canon(row['document']),
    'closure_reference': lambda row: canon(row['content']),
    'anchor_document': lambda row: canon(row['document']),
}


def run(vectors):
    failures, counts = [], {}

    def check(kind, label, got, want):
        counts[kind] = counts.get(kind, 0) + 1
        if got != want:
            failures.append({'check': kind, 'at': label, 'got': got, 'want': want})

    for i, vector in enumerate(vectors['canonicalization']):
        text_form = canon(vector['value'])
        check('canonical_json', i, text_form, vector['canonical'])
        check('canonical_json', i, hashlib.sha256(text_form.encode('utf-8')).hexdigest(), vector['sha256'])
    seeds = {}
    for name, key in vectors['keys'].items():
        seeds[name] = bytes.fromhex(key['seed_hex'])
        check('public_keys', name, base64.b64encode(SPKI_PREFIX + ed25519_public(seeds[name])).decode(), key['public_key_spki_b64'])
    for example in vectors['preimages']:
        target = vectors
        for part in example['input_path']:
            target = target[part]
        preimage = CONSTRUCTORS[example['constructor']](target)
        check('preimages', example['constructor'], preimage, example['preimage'])
        check('preimages', example['constructor'], hashlib.sha256(preimage.encode('utf-8')).hexdigest(), example['sha256'])

    engine = Engine(vectors)
    signature_of = lambda name, message: base64.b64encode(ed25519_sign(seeds[name], message)).decode()
    for step in vectors['steps']:
        now, label = ms(step['at']), '%d %s' % (step['step'], step['name'])
        if step['op'] == 'register':
            doc, signature = step['input']['document'], step['input']['signature_b64']
            expected_digests = step['digests']
            if 'unavailable' not in expected_digests:
                got = {'document_sha256': digest(doc), 'signing_payload_sha256': hashlib.sha256(payload(doc['type'], doc)).hexdigest()}
                if doc.get('type') == V2:
                    got['assertion_sha256'] = digest(assertion_of(doc))
                    got['scope_sha256'] = digest(scope_of(doc))
                    got['condition_sha256'] = [digest(c) for c in doc['conditions']]
                    if get(doc, 'source_review', 'document'):
                        got['review_signing_payload_sha256'] = hashlib.sha256(payload(REVIEW_TYPE, doc['source_review']['document'])).hexdigest()
                    got['receipt_signing_payload_sha256'] = [hashlib.sha256(payload(RESOLUTION_TYPE, r['document'])).hexdigest() for r in doc['condition_receipts']]
                check('digests', label, got, expected_digests)
            signers = step['signers']
            if signers['document']:
                check('signatures', label + ' document', signature_of(signers['document'], payload(doc['type'], doc)), signature)
            if signers['review']:
                review = doc['source_review']['document']
                check('signatures', label + ' review', signature_of(signers['review'], payload(review['type'], review)), doc['source_review']['signature_b64'])
            for index, name in enumerate(signers['receipts']):
                if name:
                    receipt = doc['condition_receipts'][index]
                    check('signatures', label + ' receipt %d' % index, signature_of(name, payload(receipt['document']['type'], receipt['document'])), receipt['signature_b64'])
            check('registrations', label, engine.register(copy.deepcopy(doc), signature, now), step['expected'])
        elif step['op'] == 'evaluate':
            check('evaluations', label, engine.evaluate(engine.store.cases[step['case']], now), step['expected'])
        elif step['op'] == 'effect':
            want = step['expected']
            issuer, contradiction = engine.effect(engine.store.cases[step['case']], step['input']['requested_effect'], now)
            check('verification_reasons', label, [issuer, contradiction], [want['issuer_state_reasons'], want['case_contradiction_reasons']])
            reasons = issuer + contradiction + want['other_reasons']
            check('verification_decisions', label, 'allow' if not reasons else 'deny', want['decision'])
            check('verification_decisions', label + ' reason set', sorted(reasons), sorted(want['deny_reasons']))
        elif step['op'] == 'revoke':
            engine.revoke(step['target']['kind'], step['target']['id'])
            counts['revocations'] = counts.get('revocations', 0) + 1
        else:
            failures.append({'check': 'step', 'at': label, 'got': step['op'], 'want': 'known operation'})
    return failures, counts


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).with_name('vectors.json')
    vectors = json.loads(path.read_text(encoding='utf-8'))
    failures, counts = run(vectors)
    report = {'passed': not failures, 'implementation': 'Python standard library, written from SPEC.md; no AMOS code',
              'vectors': vectors.get('format'), 'steps': len(vectors['steps']), 'checks': counts, 'failures': failures[:20]}
    print(json.dumps(report, ensure_ascii=False, indent=1))
    sys.exit(0 if not failures else 1)


if __name__ == '__main__':
    main()
