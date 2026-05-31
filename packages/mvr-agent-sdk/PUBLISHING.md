# Publishing MVR Agent SDK

The package source is public-safe. It is a thin client wrapper only and does not contain the MVR scoring engine, calibration weights, private labels, private evidence, Worker source, or benchmark answer keys.

## Current package names

- npm: `mvr-agent-sdk`
- PyPI: `mvr-agent-sdk`

## GitHub workflow

Workflow file:

```text
.github/workflows/publish-agent-sdk.yml
```

Manual run:

1. Open GitHub Actions.
2. Select `Publish MVR Agent SDK`.
3. Run workflow with `target: all`, `npm`, or `pypi`.

Tag-triggered run:

```bash
git tag -a mvr-agent-sdk-v0.1.0 -m "Publish MVR Agent SDK v0.1.0"
git push origin mvr-agent-sdk-v0.1.0
```

## Registry authorization

The workflow supports both trusted publishing and token fallback.

### npm trusted publishing

Configure npm trusted publishing for:

```text
Package: mvr-agent-sdk
Repository: africanmarketos591/mvr-framework
Workflow: publish-agent-sdk.yml
```

If trusted publishing is not configured, add a repository secret named:

```text
NPM_TOKEN
```

### PyPI trusted publishing

Configure a PyPI pending publisher for:

```text
Project name: mvr-agent-sdk
Owner: africanmarketos591
Repository: mvr-framework
Workflow name: publish-agent-sdk.yml
Environment: leave blank unless the workflow adds one
```

If trusted publishing is not configured, add a repository secret named:

```text
PYPI_API_TOKEN
```

## Validation

From the repository root:

```bash
cd packages/mvr-agent-sdk/npm
npm pack --dry-run

cd ../python
python -m build
python -m twine check dist/*
```

Do not publish generated `dist/`, `build/`, `egg-info/`, or `__pycache__/` directories to GitHub.
