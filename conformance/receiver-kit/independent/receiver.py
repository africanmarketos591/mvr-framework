"""Local R10 staging fixture. The sole effect is an insert into a separate SQLite draft ledger."""
import base64
from contextlib import closing
from datetime import datetime, timezone
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys
import re
from urllib.request import urlopen
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit

statement = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
pin = json.loads((Path(__file__).resolve().parents[3]/"trust/amos-lab-trust-root.json").read_text(encoding="utf-8"))["trust_root"]
session_id = statement["session_id"]
if not re.fullmatch(r"AC-[a-f0-9]{32}", session_id):
    raise ValueError("invalid session id")
database = sys.argv[2]
port = int(sys.argv[3]) if len(sys.argv) > 3 else 0
openssl = shutil.which("openssl") or "C:/Program Files/Git/usr/bin/openssl.exe"
with closing(sqlite3.connect(database)) as db:
    db.executescript("CREATE TABLE IF NOT EXISTS drafts(commit_id TEXT PRIMARY KEY,effect_id TEXT NOT NULL); CREATE TABLE IF NOT EXISTS faults(name TEXT PRIMARY KEY);")

def digest(fields):
    return hashlib.sha256(json.dumps(fields, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode()).hexdigest()

def valid(receipt, effect):
    sig = receipt["signature"]
    checksum = digest({k: v for k,v in receipt.items() if k not in ("sha256","signature")})
    if checksum != receipt["sha256"] or sig["status"] != "signed" or sig["standard"] != "MVR-RECEIPT-SIG-V1" or sig["algorithm"] != "Ed25519":
        return False
    if receipt["kind"] != "effect_commit" or receipt["decision"] != "commit" or receipt["requested_effect_sha256"] != digest(effect) or receipt["effect_id"] != effect["effect_id"]:
        return False
    if effect["effect_type"] != "create_draft_record" or effect["resource"]["system"] != "amos-lab" or effect["amount_minor"] != 0 or effect["external_contact"] is not False:
        return False
    if not re.fullmatch(r"CM-[a-f0-9]{48}",receipt["commit_id"]):return False
    keys = [k for k in registry["keys"] if k["key_id"] == sig["key_id"] and k["status"] == "active"]
    if len(keys) != 1:
        return False
    return verify_bytes(keys[0],sig["signature_b64"],("MVR-RECEIPT-V1\n"+sig["key_id"]+"\n"+checksum).encode())

def verify_bytes(key, signature, message):
    with TemporaryDirectory() as tmp:
        d = Path(tmp)
        (d/"key").write_bytes(base64.b64decode(key["public_key_spki_b64"],validate=True))
        (d/"sig").write_bytes(base64.b64decode(signature,validate=True))
        (d/"msg").write_bytes(message)
        result = subprocess.run([openssl,"pkeyutl","-verify","-pubin","-inkey","key","-keyform","DER","-rawin","-in","msg","-sigfile","sig"],cwd=d,capture_output=True,timeout=4)
    return result.returncode == 0

def verify_statement(doc, key, contract):
    sig=doc["signature"]
    sha=digest({k:v for k,v in doc.items() if k not in ("sha256","signature")})
    if (doc["contract_version"] != contract or sha != doc["sha256"] or sig["key_id"] != key["key_id"]
            or sig["algorithm"] != "Ed25519" or sig["standard"] != "MVR-TRUST-SIG-V1"):
        return False
    return verify_bytes(key,sig["signature_b64"],"\n".join(["MVR-TRUST-V1",contract,key["key_id"],sha]).encode())

if (not verify_statement(statement,pin,"mvr.authority-registry-statement/1")
        or statement["realm"] != "amos-lab" or statement["assurance_level"] != "lab_fixture"
        or statement["production_authority"] is not False or statement["recognized_standing"] != "none"
        or len(statement["keys"]) != 1 or statement["keys"][0]["status"] != "active"):
    raise ValueError("untrusted session registry")
registry={"keys":statement["keys"]}
with closing(sqlite3.connect(database)) as db:
    db.execute("CREATE TABLE IF NOT EXISTS cursor(session TEXT PRIMARY KEY, seq INTEGER, hash TEXT, observed TEXT)")

def permits(receipt,db):
    # This disposable lab has at most 160 calls; its feed retains the last 200 entries.
    # Verify from genesis and the last durable checkpoint before accepting a new draft.
    with urlopen("https://africanmarketos.com/v1/authority-conformance/feed?session_id="+session_id+"&after=0",timeout=5) as response:
        feed=json.loads(response.read(1048576))
    head=feed["head"]
    if not verify_statement(head,registry["keys"][0],"mvr.current-state-feed/1"):
        return False
    now=datetime.now(timezone.utc)
    observed=datetime.fromisoformat(head["observed_at"])
    if (head["session_id"]!=session_id or head["realm"]!="amos-lab" or head["registry_id"]!=statement["registry_id"]
            or head["session_status"]!="active" or now>=datetime.fromisoformat(statement["expires_at"])
            or not -1 <= (now-observed).total_seconds() <= 5):
        return False
    entries=feed["entries"]
    previous=None
    granted=False
    for sequence,entry in enumerate(entries,1):
        sha=digest({k:v for k,v in entry.items() if k!="entry_sha256"})
        if entry["sequence"]!=sequence or entry["prev_entry_sha256"]!=previous or entry["entry_sha256"]!=sha:
            return False
        previous=sha
        if entry["id"]==receipt["capability_id"]:
            if entry["action"]=="register_capability": granted=True
            if entry["action"]=="revoke_capability": granted=False
        if entry["action"]=="close_session":return False
    if head["last_sequence"]!=len(entries) or head["head_sha256"]!=previous:return False
    old=db.execute("SELECT seq,hash,observed FROM cursor WHERE session=?",(session_id,)).fetchone()
    if old and (old[0]>len(entries) or (old[0] and entries[old[0]-1]["entry_sha256"]!=old[1]) or observed<datetime.fromisoformat(old[2])):
        return False
    db.execute("INSERT OR REPLACE INTO cursor VALUES(?,?,?,?)",(session_id,len(entries),previous,head["observed_at"]))
    return granted

def receive(body, db):
    receipt, effect = body["receipt"], body["requested_effect"]
    if not valid(receipt, effect):
        return {"performed":False,"code":"invalid_commit"}
    commit = receipt["commit_id"]
    db.execute("BEGIN IMMEDIATE")
    if db.execute("SELECT 1 FROM drafts WHERE commit_id=?", (commit,)).fetchone():
        return {"performed":False,"already_performed":True}
    if not permits(receipt,db):
        db.commit()
        return {"performed":False,"code":"current_feed_refused"}
    if datetime.fromisoformat(receipt["commit_valid_until"]) <= datetime.now(timezone.utc):
        return {"performed":False,"code":"expired"}
    fault = db.execute("SELECT name FROM faults LIMIT 1").fetchone()
    db.execute("DELETE FROM faults")
    if fault and fault[0]=="fail_before_effect":
        db.commit()
        return {"performed":False,"retryable":True}
    db.execute("INSERT INTO drafts VALUES(?,?)",(commit,effect["effect_id"]))
    db.commit()
    if fault and fault[0]=="crash_after_effect":
        return {"performed":False,"code":"interrupted_after_write"}
    return {"performed":True}

class Receiver(BaseHTTPRequestHandler):
    def log_message(self,*args):
        pass

    def respond(self, value, status=200):
        payload=json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type","application/json")
        self.send_header("Content-Length",str(len(payload)))
        try:
            self.end_headers()
            self.wfile.write(payload)
        except ConnectionError:
            pass

    def do_GET(self):
        route=urlsplit(self.path).path
        with closing(sqlite3.connect(database)) as db:
            if route=="/effects":
                self.respond({"total_effects":db.execute("SELECT count(*) FROM drafts").fetchone()[0]})
            elif route=="/health":
                self.respond({"in_doubt":[],"total_drafts":db.execute("SELECT count(*) FROM drafts").fetchone()[0]})
            else:
                self.respond({},404)

    def do_POST(self):
        try:
            length=int(self.headers.get("Content-Length",0))
            if length<=0 or length>65536:
                return self.respond({},400)
            body=json.loads(self.rfile.read(length))
            with closing(sqlite3.connect(database,timeout=10)) as db:
                if self.path=="/test/faults" and body.get("next") in ("fail_before_effect","crash_after_effect"):
                    db.execute("DELETE FROM faults")
                    db.execute("INSERT INTO faults VALUES(?)",(body["next"],))
                    db.commit()
                    self.respond({"ok":True})
                elif self.path=="/commits":
                    self.respond(receive(body,db))
                else:
                    self.respond({},404)
        except (ValueError,KeyError,TypeError,OSError,subprocess.SubprocessError):
            self.respond({"performed":False,"code":"invalid_input"},400)

server=ThreadingHTTPServer(("127.0.0.1", port),Receiver)
print(server.server_port,flush=True)
server.serve_forever()
