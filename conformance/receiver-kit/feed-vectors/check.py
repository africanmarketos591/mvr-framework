"""Independent verifier for the fixed feed wire example. Requires Python 3 and OpenSSL 3."""
import base64
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

vectors = json.loads(Path(__file__).with_name("vectors.json").read_text(encoding="utf-8"))
def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")

def digest(data):
    return hashlib.sha256(data).hexdigest()

def require(condition, message):
    if not condition:
        raise ValueError(message)

cursor = None
for sequence, entry in enumerate(vectors["batch"]["entries"], 1):
    body = {k: v for k, v in entry.items() if k != "entry_sha256"}
    encoded = canonical(body)
    require(sequence == body["sequence"] and body["prev_entry_sha256"] == cursor, "invalid chain")
    require(encoded.decode() == vectors["entry_canonical"][sequence - 1], "entry encoding")
    cursor = digest(encoded)
    require(cursor == entry["entry_sha256"], "entry digest")

head = vectors["batch"]["head"]
key = vectors["registry_key"]
body = {k: v for k, v in head.items() if k not in ("sha256", "signature")}
require(body["session_id"] == vectors["session_id"] and body["last_sequence"] == sequence and body["head_sha256"] == cursor, "head binding")
require(canonical(body).decode() == vectors["head_canonical"] and digest(canonical(body)) == head["sha256"], "head digest")
signature = head["signature"]
require((signature["key_id"], signature["standard"], signature["algorithm"]) == (key["key_id"], "MVR-TRUST-SIG-V1", "Ed25519"), "signature metadata")
payload = "\n".join(["MVR-TRUST-V1", body["contract_version"], key["key_id"], head["sha256"]]).encode()
require(payload.hex() == vectors["signing_input_hex"], "signed bytes")
with tempfile.TemporaryDirectory() as tmp:
    root = Path(tmp)
    (root / "key.der").write_bytes(base64.b64decode(key["public_key_spki_b64"], validate=True))
    (root / "sig").write_bytes(base64.b64decode(signature["signature_b64"], validate=True))
    (root / "payload").write_bytes(payload)
    openssl = shutil.which("openssl") or "C:/Program Files/Git/usr/bin/openssl.exe"
    subprocess.run([openssl, "pkeyutl", "-verify", "-pubin", "-inkey", "key.der", "-keyform", "DER", "-rawin", "-in", "payload", "-sigfile", "sig"], cwd=root, check=True)
print("Verified both entries, head digest and Ed25519 signature")
