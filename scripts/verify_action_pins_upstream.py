#!/usr/bin/env python3
"""Check every approved action pin against its upstream repository.

validate_workflow_pinning.py checks that workflows use the approved 40-character pins. This script checks that each
approved pin is a real commit (not the SHA of an annotated tag object) and that the tag named in its comment points at
that commit. A tag-object SHA can still be fetched by GitHub, but actions that run a container named after their ref
then find no image: that broke the 2026-10-26 PyPI publish of mvr-agent-sdk.
"""

from __future__ import annotations

import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "scripts" / "validate_workflow_pinning.py").read_text(encoding="utf-8")
PIN = re.compile(r'^\s*"([\w.-]+/[\w.-]+)":\s*"([0-9a-f]{40})",\s*#\s*(\S+)\s*$', re.MULTILINE)


def get(path: str):
    request = urllib.request.Request("https://api.github.com" + path, headers={"Accept": "application/vnd.github+json", "User-Agent": "amos-action-pin-check"})
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        request.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as error:
        return error.code, None


def main() -> int:
    pins = PIN.findall(SOURCE)
    if not pins:
        print("no approved action pins found", file=sys.stderr)
        return 1
    errors: list[str] = []
    for action, sha, tag in pins:
        status, _ = get(f"/repos/{action}/git/commits/{sha}")
        if status != 200:
            errors.append(f"{action}@{sha}: not a commit upstream (HTTP {status}); an annotated tag object's SHA is not a commit")
            continue
        status, ref = get(f"/repos/{action}/git/ref/tags/{tag}")
        if status != 200 or not ref:
            errors.append(f"{action}: tag {tag} not found upstream (HTTP {status})")
            continue
        target = ref["object"]
        if target["type"] == "tag":
            status, tag_object = get(f"/repos/{action}/git/tags/{target['sha']}")
            target = tag_object["object"] if status == 200 and tag_object else {"sha": None}
        if target["sha"] != sha:
            errors.append(f"{action}: tag {tag} points at {target['sha']}, but the approved pin is {sha}")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"action pins verified upstream: {len(pins)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
