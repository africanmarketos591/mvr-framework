#!/usr/bin/env python3
"""Synchronize MCP publication mirrors from the canonical version contract."""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import sys


ROOT = pathlib.Path(__file__).resolve().parents[1]
CANONICAL_PATH = ROOT / ".well-known" / "mvr-version.json"
VERSION_KEYS = (
    "core_api_version",
    "mcp_protocol_version",
    "mcp_contract_version",
    "tool_profile_version",
    "sdk_version",
    "policy_version",
    "calibration_version",
    "deployment_revision",
    "host_recipe_version",
)
JSON_CONTRACT_TARGETS = (
    "mcp/manifest.json",
    "mcp/xai-grok.json",
    "mcp/aws-agentcore.json",
)
SERVER_KEYS = {
    "core_api_version": "coreApiVersion",
    "mcp_protocol_version": "mcpProtocolVersion",
    "mcp_contract_version": "mcpContractVersion",
    "tool_profile_version": "toolProfileVersion",
    "sdk_version": "sdkVersion",
    "policy_version": "policyVersion",
    "calibration_version": "calibrationVersion",
    "deployment_revision": "deploymentRevision",
    "host_recipe_version": "hostRecipeVersion",
}


def load_json(path: pathlib.Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def serialized(data: dict) -> str:
    return json.dumps(data, indent=2, ensure_ascii=True) + "\n"


def update_json_contract(path: pathlib.Path, expected: dict[str, str]) -> bool:
    document = load_json(path)
    contract = document.get("version_contract")
    if not isinstance(contract, dict):
        raise ValueError(f"{path.relative_to(ROOT)} has no version_contract object")
    changed = False
    for key, value in expected.items():
        if contract.get(key) != value:
            contract[key] = value
            changed = True
    if changed:
        path.write_text(serialized(document), encoding="utf-8")
    return changed


def update_server(path: pathlib.Path, expected: dict[str, str]) -> bool:
    document = load_json(path)
    publisher = document["_meta"]["io.modelcontextprotocol.registry/publisher-provided"]
    changed = False
    for key, value in expected.items():
        server_key = SERVER_KEYS[key]
        if publisher.get(server_key) != value:
            publisher[server_key] = value
            changed = True
    if changed:
        path.write_text(serialized(document), encoding="utf-8")
    return changed


def update_version_map(path: pathlib.Path, expected: dict[str, str]) -> bool:
    text = path.read_text(encoding="utf-8")
    updated = text
    for key, value in expected.items():
        if key == "mcp_protocol_version":
            if value not in updated:
                raise ValueError("docs/version-map.md is missing the preferred MCP protocol version")
            continue
        pattern = re.compile(rf"(\| `{re.escape(key)}` \| `)[^`]+(` \|)")
        updated, count = pattern.subn(rf"\g<1>{value}\g<2>", updated)
        if count != 1:
            raise ValueError(f"docs/version-map.md must contain exactly one row for {key}")
    if updated != text:
        path.write_text(updated, encoding="utf-8")
        return True
    return False


def synchronize(check_only: bool) -> list[str]:
    canonical = load_json(CANONICAL_PATH)
    expected = {key: canonical[key] for key in VERSION_KEYS}
    changed: list[str] = []

    operations = [
        (ROOT / path, lambda target, values: update_json_contract(target, values))
        for path in JSON_CONTRACT_TARGETS
    ]
    operations.extend(
        [
            (ROOT / "server.json", update_server),
            (ROOT / "docs" / "version-map.md", update_version_map),
        ]
    )

    if check_only:
        snapshots = {path: path.read_text(encoding="utf-8") for path, _ in operations}
        try:
            for path, operation in operations:
                if operation(path, expected):
                    changed.append(str(path.relative_to(ROOT)))
        finally:
            for path, original in snapshots.items():
                if path.read_text(encoding="utf-8") != original:
                    path.write_text(original, encoding="utf-8")
        return changed

    for path, operation in operations:
        if operation(path, expected):
            changed.append(str(path.relative_to(ROOT)))
    return changed


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail if a tracked publication mirror differs from the canonical contract.",
    )
    args = parser.parse_args()
    changed = synchronize(args.check)
    if args.check and changed:
        print("MCP version contract: FAIL: out-of-sync mirrors: " + ", ".join(changed), file=sys.stderr)
        return 1
    if changed:
        print("MCP version contract: synchronized " + ", ".join(changed))
    else:
        print("MCP version contract: PASS")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (KeyError, OSError, ValueError, json.JSONDecodeError) as error:
        print(f"MCP version contract: FAIL: {error}", file=sys.stderr)
        raise SystemExit(1)
