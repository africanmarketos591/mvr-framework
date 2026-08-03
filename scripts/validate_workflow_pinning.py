#!/usr/bin/env python3
"""Reject mutable dependencies in GitHub Actions workflows."""

from __future__ import annotations

import argparse
import pathlib
import re
import sys


ACTION_REF = re.compile(r"\buses:\s*([^\s#]+)")
FULL_COMMIT = re.compile(r"^[^@\s]+@[0-9a-f]{40}$")
LOOSE_NODE = re.compile(r"node-version:\s*[\"']?(?:20|22|24)[\"']?\s*$", re.MULTILINE)
LOOSE_PYTHON = re.compile(r"python-version:\s*[\"']?3\.(?:11|12)[\"']?\s*$", re.MULTILINE)
UNPINNED_NPX = re.compile(r"\bnpx\s+--yes\s+([^@\s]+)(?:\s|$)")
MCP_PUBLISHER_SHA256 = "1370446bbe74d562608e8005a6ccce02d146a661fbd78674e11cc70b9618d6cf"
MCP_PUBLISHER_URL = "https://github.com/modelcontextprotocol/registry/releases/download/v1.8.0/mcp-publisher_linux_amd64.tar.gz"
APPROVED_ACTION_COMMITS = {
    "actions/checkout": "08c6903cd8c0fde910a37f88322edcfb5dd907a8",  # v5.0.0
    "actions/setup-node": "a0853c24544627f65ddf259abe73b1d18a591444",  # v5.0.0
    "actions/setup-python": "a26af69be951a213d495a4c3e4e4022e16d87065",  # v5.6.0
    "pypa/gh-action-pypi-publish": "a892a5a61159132606e93a2fa6f4358831b04d26",  # v1.14.2
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=pathlib.Path, default=pathlib.Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    workflow_root = root / ".github" / "workflows"
    errors: list[str] = []

    for path in sorted(workflow_root.glob("*.yml")) + sorted(workflow_root.glob("*.yaml")):
        body = path.read_text(encoding="utf-8")
        lines = body.splitlines()
        relative = path.relative_to(root).as_posix()
        for match in ACTION_REF.finditer(body):
            action = match.group(1)
            if not FULL_COMMIT.fullmatch(action):
                errors.append(f"{relative}:floating_action:{action}")
                continue
            action_name, commit = action.rsplit("@", 1)
            expected_commit = APPROVED_ACTION_COMMITS.get(action_name)
            if expected_commit is None:
                errors.append(f"{relative}:unreviewed_action:{action_name}")
            elif commit != expected_commit:
                errors.append(f"{relative}:unexpected_action_commit:{action_name}@{commit}")
        if "ubuntu-latest" in body:
            errors.append(f"{relative}:floating_runner:ubuntu-latest")
        if LOOSE_NODE.search(body):
            errors.append(f"{relative}:loose_node_runtime")
        if LOOSE_PYTHON.search(body):
            errors.append(f"{relative}:loose_python_runtime")
        if "releases/latest" in body or "npm@latest" in body:
            errors.append(f"{relative}:latest_dependency")
        for match in UNPINNED_NPX.finditer(body):
            errors.append(f"{relative}:unpinned_npx:{match.group(1)}")
        if "mcp-publisher" in body and "curl" in body:
            if MCP_PUBLISHER_URL not in body or MCP_PUBLISHER_SHA256 not in body:
                errors.append(f"{relative}:mcp_publisher_checksum_contract")

        top_permissions_index = next((index for index, line in enumerate(lines) if line == "permissions:"), None)
        top_permissions: list[str] = []
        if top_permissions_index is not None:
            for line in lines[top_permissions_index + 1 :]:
                if line and not line.startswith(" "):
                    break
                top_permissions.append(line)
            if not any(re.fullmatch(r"\s{2}contents:\s*read", line) for line in top_permissions):
                errors.append(f"{relative}:top_permissions_without_contents_read")
            if any(re.fullmatch(r"\s{2}id-token:\s*write", line) for line in top_permissions):
                errors.append(f"{relative}:workflow_wide_oidc_write")

        jobs_index = next((index for index, line in enumerate(lines) if line == "jobs:"), None)
        job_starts: list[tuple[str, int]] = []
        if jobs_index is not None:
            for index in range(jobs_index + 1, len(lines)):
                match = re.fullmatch(r"\s{2}([A-Za-z0-9_-]+):\s*", lines[index])
                if match:
                    job_starts.append((match.group(1), index))
        for position, (job_name, start) in enumerate(job_starts):
            end = job_starts[position + 1][1] if position + 1 < len(job_starts) else len(lines)
            job_lines = lines[start:end]
            has_job_permissions = any(line == "    permissions:" for line in job_lines)
            if top_permissions_index is None and not has_job_permissions:
                errors.append(f"{relative}:job_without_explicit_permissions:{job_name}")
            has_oidc_write = any(re.fullmatch(r"\s{6}id-token:\s*write", line) for line in job_lines)
            if has_oidc_write:
                if not has_job_permissions or not any(re.fullmatch(r"\s{6}contents:\s*read", line) for line in job_lines):
                    errors.append(f"{relative}:oidc_job_without_contents_read:{job_name}")
                if re.search(r"(?:validate|test|verify)", job_name, re.IGNORECASE):
                    errors.append(f"{relative}:validation_job_has_oidc_write:{job_name}")

    if errors:
        print("workflow pinning validation failed", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"workflow pinning validation passed ({len(list(workflow_root.glob('*.yml'))) + len(list(workflow_root.glob('*.yaml')))} workflows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
