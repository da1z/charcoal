# Manual Release GitHub Action Specification

## Overview

Create a GitHub Actions workflow that can be triggered manually to build, bump the version, publish to npm, and push the new version commit to the repository. The workflow provides a safe, controlled release process with full test validation before any changes are made.

## Trigger

### Workflow Dispatch

The workflow uses `workflow_dispatch` trigger with manual inputs:

```yaml
on:
  workflow_dispatch:
    inputs:
      bump-type:
        description: 'Version bump type'
        required: true
        type: choice
        options:
          - patch
          - minor
      dry-run:
        description: 'Dry run (skip npm publish and git push)'
        required: false
        type: boolean
        default: false
```

### Inputs

| Input | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `bump-type` | choice | yes | - | Either `patch` or `minor` (no major releases) |
| `dry-run` | boolean | no | `false` | When true, runs everything except npm publish and git push |

## Branch Restrictions

### Main Branch Only

The workflow will only execute when triggered from the `main` branch. If triggered from any other branch, the workflow should fail immediately with a clear error message.

```yaml
jobs:
  release:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
```

Additionally, add an explicit check step that fails with a descriptive error if not on main:

```yaml
- name: Verify main branch
  if: github.ref != 'refs/heads/main'
  run: |
    echo "Error: This workflow can only be run from the main branch"
    echo "Current ref: ${{ github.ref }}"
    exit 1
```

## Workflow Steps

### 1. Checkout

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
    token: ${{ secrets.GITHUB_TOKEN }}
```

Notes:
- `fetch-depth: 0` for full history (needed for version comparison)
- Use `GITHUB_TOKEN` for authentication (won't trigger other workflows, which is acceptable)

### 2. Setup Bun

```yaml
- uses: oven-sh/setup-bun@v2
```

### 3. Install Dependencies

```yaml
- name: Install dependencies
  run: bun install --frozen-lockfile
```

### 4. Run Linter

```yaml
- name: Lint
  run: bun run lint
```

### 5. Build

```yaml
- name: Build
  run: bun run build
```

### 6. Setup Git for Tests

```yaml
- name: Setup git
  run: |
    git config --global user.email "github-actions[bot]@users.noreply.github.com"
    git config --global user.name "github-actions[bot]"
```

### 7. Run Tests

```yaml
- name: Test
  run: bun run test-ci
```

### 8. Bump Version

```yaml
- name: Bump version
  id: bump
  working-directory: apps/cli
  run: |
    # Get current version
    CURRENT_VERSION=$(node -p "require('./package.json').version")
    echo "Current version: $CURRENT_VERSION"

    # Bump version (npm version updates package.json but doesn't create git tag)
    NEW_VERSION=$(npm version ${{ inputs.bump-type }} --no-git-tag-version)
    echo "New version: $NEW_VERSION"

    # Output for subsequent steps
    echo "new_version=$NEW_VERSION" >> $GITHUB_OUTPUT
    echo "new_version_number=${NEW_VERSION#v}" >> $GITHUB_OUTPUT
```

Notes:
- Only updates `apps/cli/package.json` (the published package)
- `--no-git-tag-version` prevents npm from creating a git commit and tag
- Outputs the new version for use in later steps

### 9. Check for Remote Changes

Before committing, verify that main hasn't diverged:

```yaml
- name: Check for remote changes
  run: |
    git fetch origin main
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)
    if [ "$LOCAL" != "$REMOTE" ]; then
      echo "Error: Remote main has new commits. Please re-run the workflow."
      echo "Local:  $LOCAL"
      echo "Remote: $REMOTE"
      exit 1
    fi
```

### 10. Publish to npm

```yaml
- name: Publish to npm
  if: ${{ inputs.dry-run != true }}
  working-directory: apps/cli
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
  run: |
    echo "//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}" > ~/.npmrc
    npm publish --access public
```

Notes:
- Only runs if not a dry run
- Publishes **before** pushing git changes (per user requirement)
- If this step fails, no git changes are pushed, keeping the repo clean
- Uses `NPM_TOKEN` repository secret

### 11. Commit Version Bump

```yaml
- name: Commit version bump
  if: ${{ inputs.dry-run != true }}
  run: |
    git add apps/cli/package.json
    git commit -m "${{ steps.bump.outputs.new_version }}"
```

Notes:
- Simple commit message format: just `v0.2.5`
- Only commits `apps/cli/package.json` (not root or other packages)
- Only runs if not a dry run

### 12. Push to Remote

```yaml
- name: Push changes
  if: ${{ inputs.dry-run != true }}
  run: |
    git push origin main
```

Notes:
- No tags are created or pushed
- Only runs if not a dry run

### 13. Create Job Summary

```yaml
- name: Create summary
  run: |
    if [ "${{ inputs.dry-run }}" == "true" ]; then
      echo "## Dry Run Complete" >> $GITHUB_STEP_SUMMARY
      echo "" >> $GITHUB_STEP_SUMMARY
      echo "Would have released version **${{ steps.bump.outputs.new_version }}**" >> $GITHUB_STEP_SUMMARY
      echo "" >> $GITHUB_STEP_SUMMARY
      echo "No changes were published or pushed." >> $GITHUB_STEP_SUMMARY
    else
      echo "## Release Complete" >> $GITHUB_STEP_SUMMARY
      echo "" >> $GITHUB_STEP_SUMMARY
      echo "Successfully released version **${{ steps.bump.outputs.new_version }}**" >> $GITHUB_STEP_SUMMARY
      echo "" >> $GITHUB_STEP_SUMMARY
      echo "- npm: https://www.npmjs.com/package/@da1z/pancake/v/${{ steps.bump.outputs.new_version_number }}" >> $GITHUB_STEP_SUMMARY
    fi
```

## Complete Workflow File

```yaml
name: Manual Release

on:
  workflow_dispatch:
    inputs:
      bump-type:
        description: 'Version bump type'
        required: true
        type: choice
        options:
          - patch
          - minor
      dry-run:
        description: 'Dry run (skip npm publish and git push)'
        required: false
        type: boolean
        default: false

jobs:
  release:
    name: Release to npm
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: write
    steps:
      - name: Verify main branch
        if: github.ref != 'refs/heads/main'
        run: |
          echo "Error: This workflow can only be run from the main branch"
          echo "Current ref: ${{ github.ref }}"
          exit 1

      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Lint
        run: bun run lint

      - name: Build
        run: bun run build

      - name: Setup git
        run: |
          git config --global user.email "github-actions[bot]@users.noreply.github.com"
          git config --global user.name "github-actions[bot]"

      - name: Test
        run: bun run test-ci

      - name: Bump version
        id: bump
        working-directory: apps/cli
        run: |
          CURRENT_VERSION=$(node -p "require('./package.json').version")
          echo "Current version: $CURRENT_VERSION"

          NEW_VERSION=$(npm version ${{ inputs.bump-type }} --no-git-tag-version)
          echo "New version: $NEW_VERSION"

          echo "new_version=$NEW_VERSION" >> $GITHUB_OUTPUT
          echo "new_version_number=${NEW_VERSION#v}" >> $GITHUB_OUTPUT

      - name: Check for remote changes
        run: |
          git fetch origin main
          LOCAL=$(git rev-parse HEAD)
          REMOTE=$(git rev-parse origin/main)
          if [ "$LOCAL" != "$REMOTE" ]; then
            echo "Error: Remote main has new commits. Please re-run the workflow."
            echo "Local:  $LOCAL"
            echo "Remote: $REMOTE"
            exit 1
          fi

      - name: Publish to npm
        if: inputs.dry-run != true
        working-directory: apps/cli
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: |
          echo "//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}" > ~/.npmrc
          npm publish --access public

      - name: Commit version bump
        if: inputs.dry-run != true
        run: |
          git add apps/cli/package.json
          git commit -m "${{ steps.bump.outputs.new_version }}"

      - name: Push changes
        if: inputs.dry-run != true
        run: git push origin main

      - name: Create summary
        run: |
          if [ "${{ inputs.dry-run }}" == "true" ]; then
            echo "## Dry Run Complete" >> $GITHUB_STEP_SUMMARY
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "Would have released version **${{ steps.bump.outputs.new_version }}**" >> $GITHUB_STEP_SUMMARY
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "No changes were published or pushed." >> $GITHUB_STEP_SUMMARY
          else
            echo "## Release Complete" >> $GITHUB_STEP_SUMMARY
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "Successfully released version **${{ steps.bump.outputs.new_version }}**" >> $GITHUB_STEP_SUMMARY
            echo "" >> $GITHUB_STEP_SUMMARY
            echo "- npm: https://www.npmjs.com/package/@da1z/pancake/v/${{ steps.bump.outputs.new_version_number }}" >> $GITHUB_STEP_SUMMARY
          fi
```

## Secrets Required

| Secret | Description | Setup |
|--------|-------------|-------|
| `NPM_TOKEN` | npm access token with publish permissions | Repository Settings > Secrets and variables > Actions > New repository secret |

### Creating NPM_TOKEN

1. Go to npmjs.com > Account Settings > Access Tokens
2. Generate new token with type "Automation" (for CI/CD)
3. Copy the token
4. In GitHub repo: Settings > Secrets and variables > Actions
5. Click "New repository secret"
6. Name: `NPM_TOKEN`, Value: paste the token

## Usage

### Running the Workflow

1. Go to the repository on GitHub
2. Click "Actions" tab
3. Select "Manual Release" workflow from the left sidebar
4. Click "Run workflow" dropdown
5. Select branch: `main`
6. Choose bump type: `patch` or `minor`
7. Optionally check "Dry run" to test without publishing
8. Click "Run workflow"

### Dry Run Mode

When dry-run is enabled:
- Full build and test suite runs
- Version is bumped locally in the runner
- No npm publish happens
- No git commit or push happens
- Summary shows what would have been released

Use dry-run to:
- Verify the workflow works before first real release
- Test after modifying the workflow
- Check what version number would be next

## Error Scenarios

### Not on Main Branch

```
Error: This workflow can only be run from the main branch
Current ref: refs/heads/feature-branch
```

Solution: Switch to main branch in the workflow dispatch UI.

### Remote Has New Commits

```
Error: Remote main has new commits. Please re-run the workflow.
Local:  abc123
Remote: def456
```

Solution: Someone pushed to main while the workflow was running. Re-trigger the workflow.

### npm Publish Fails

If npm publish fails (auth error, network issue, package already exists):
- The workflow fails
- No git commit is made
- No push happens
- Repository remains clean
- Fix the issue (e.g., update NPM_TOKEN) and re-run

### Tests Fail

If any test fails:
- The workflow fails before any version changes
- Repository remains clean
- Fix the tests and re-run

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Trigger** | `workflow_dispatch` only | Manual control over releases |
| **Bump types** | patch/minor only | Major versions excluded for safety |
| **Branch restriction** | main only | Prevent accidental releases from feature branches |
| **Order of operations** | publish before push | If npm fails, repo stays clean |
| **Git tags** | None | User preference, simplifies workflow |
| **Git auth** | GITHUB_TOKEN | Built-in, simple, sufficient |
| **Binaries** | Not included | npm-only release per user preference |
| **Provenance** | Disabled | Simplicity over supply chain attestations |
| **Test suite** | Full test-ci | Safety before release |
| **Race condition** | Fail fast | User must re-trigger if main diverged |

## Cleanup

### Deprecating push.yml

The existing `push.yml` workflow is deprecated. Options:

1. **Delete it**: Remove `.github/workflows/push.yml` entirely
2. **Disable it**: Comment out the `on:` triggers
3. **Keep for CI only**: Remove the release job, keep only lint_and_fast_tests

Recommended: Keep `push.yml` for CI on main (lint + tests) but remove the release-related jobs (`create-binaries`, `release`).

## Future Enhancements (Out of Scope)

- [ ] Major version bump option
- [ ] Changelog generation
- [ ] Slack/Discord notifications
- [ ] Binary artifact creation
- [ ] GitHub Release creation
- [ ] Provenance attestations
- [ ] Auto-merge dependabot PRs before release
- [ ] Release notes from conventional commits
