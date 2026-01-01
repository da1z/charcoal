# Stack Merge Command Specification (v2)

## Overview

The `gt stack merge` command merges PRs in a stack sequentially from trunk toward the current branch, waiting for each PR to become mergeable before merging, then using existing `repo sync` and `stack submit` commands to maintain stack integrity.

## Command Structure

```
gt stack merge [options]
```

**Aliases:** `m`

**Example:** If on branch B in stack `main <- A <- B <- C`, running `gt stack merge` will:

1. Merge A into main (when mergeable)
2. Run `repo sync` + `stack submit`
3. Merge B into main (when mergeable)
4. Run `repo sync` + `stack submit`
5. (C is not touched - it's above current branch)

## Merge Direction

- Merges from **trunk toward the current branch** (downstack only)
- Does NOT merge branches above (children of) the current branch
- Always starts from the first branch off trunk in the current stack
- Current branch must be part of the stack (not trunk)

## Options

| Flag        | Type    | Default        | Description                                      |
| ----------- | ------- | -------------- | ------------------------------------------------ |
| `--dry-run` | boolean | false          | List PRs that would be merged (no validation)    |
| `--until`   | string  | current branch | Stop merging at this branch name (inclusive)     |
| `--timeout` | number  | 15             | Timeout in minutes per PR for becoming mergeable |
| `--method`  | string  | repo default   | Override merge method (squash/merge/rebase)      |

## Preconditions (Fail Fast)

Before starting the merge loop:

1. **No uncommitted changes**: Warn and exit if working directory has uncommitted tracked changes
2. **Not on trunk**: Must be on a branch in the stack
3. **All branches have PRs**: Every branch from trunk to current must have an associated GitHub PR
4. **Auto-sync first**: Run `repo sync` to clean up any already-merged PRs and ensure clean state
5. **Frozen branch check**: If any branch in range is frozen, will merge up to (not including) that branch

If preconditions fail, display clear error and exit before any merges.

## Merge Loop (Per PR)

For each PR in order from trunk toward current/until:

### 1. Wait Until Mergeable

- Poll GitHub every **30 seconds** for PR status
- PR is mergeable when GitHub's `mergeStateStatus === 'CLEAN'`
  - This respects all branch protection rules (required checks, approvals, etc.)
  - No need to explicitly check approval status separately
- **Timeout**: Default 15 minutes per PR (configurable)

### 2. On Check Failure

If checks fail (not timeout, actual failure):
- **Interactive**: Prompt user to **Retry** or **Abort**
- **Non-interactive**: Auto-abort with error code

### 3. Merge the PR

- Use repository's default merge method (query from GitHub)
- Can override with `--method` flag
- If merge fails due to branch protection (e.g., approvals invalidated after rebase):
  - Prompt user about the issue
  - Wait for them to fix it
  - Retry when ready

### 4. Post-Merge: Sync and Submit

After successful merge, run existing commands:

```
repo sync    # Pulls trunk, prunes merged/closed branches, handles checkout
stack submit # Full submit - pushes branches, updates PR bases/titles/descriptions
```

These commands handle:
- Deleting merged local branches
- Rebasing remaining branches onto new trunk
- Updating PR base branches to trunk
- Pushing rebased branches

### 5. Continue Loop

Repeat steps 1-4 for the next PR in the stack.

## Error Handling

| Error Type                | Interactive Mode      | Non-Interactive Mode |
| ------------------------- | --------------------- | -------------------- |
| Check failure             | Prompt retry/abort    | Auto-abort           |
| Check timeout             | Prompt retry/abort    | Auto-abort           |
| Merge failure (API)       | Prompt retry/abort    | Auto-abort           |
| Merge blocked (protection)| Prompt, wait for fix  | Auto-abort           |
| Submit failure            | Prompt retry/abort    | Auto-abort           |
| Network/API errors        | Prompt retry/abort    | Auto-abort           |

## Progress Output

Detailed progress display:

```
Running initial sync...
✓ Repository synced

Merging stack (3 PRs)...

PR #101 (feature-a): Waiting for checks (2/5 complete)...
PR #101 (feature-a): Waiting for checks (5/5 complete)...
PR #101 (feature-a): ✓ Merged

Running sync...
✓ Deleted branch feature-a

Running stack submit...
✓ Pushed feature-b
✓ Pushed feature-c
✓ Updated PR #102 base to main
✓ Updated PR #103 base to main

PR #102 (feature-b): Waiting for checks (0/5 complete)...
PR #102 (feature-b): Waiting for checks (5/5 complete)...
PR #102 (feature-b): ✓ Merged

Running sync...
✓ Deleted branch feature-b

Running stack submit...
✓ Pushed feature-c

PR #103 (feature-c): Waiting for checks (5/5 complete)...
PR #103 (feature-c): ✓ Merged

Running final sync...
✓ Deleted branch feature-c

All PRs merged successfully!
```

## Dry Run Mode

`gt stack merge --dry-run` outputs (no validation, just lists):

```
Would merge the following PRs (in order):
1. PR #101: feature-a -> main
2. PR #102: feature-b -> main (after sync/submit)
3. PR #103: feature-c -> main (after sync/submit)
```

## Frozen Branch Handling

If a frozen branch is encountered in the merge range:

1. Merge all PRs up to (but not including) the frozen branch
2. Display message: "Stopped at frozen branch 'X'. Unfreeze to continue."
3. Exit cleanly (not an error, partial success)

## Implementation Notes

### Reusing Existing Commands

The key simplification is reusing existing commands:

```typescript
// After each successful merge:
await syncAction({ pull: true, force: true, delete: true, restack: true }, context);
await submitAction({ /* appropriate options */ }, context);
```

This ensures:
- Consistent behavior with manual workflow
- PR bases updated correctly via submit
- Branch cleanup handled by sync
- No duplicate logic to maintain

### Merge Method Discovery

Query repository's default merge method:

```bash
gh api repos/{owner}/{repo} --jq '.allow_squash_merge, .allow_merge_commit, .allow_rebase_merge'
```

Or use `gh pr merge` without specifying method (uses repo default).

### Mergeable State Check

```typescript
function isMergeable(prNumber: number): boolean {
  const pr = getPRInfo(prNumber);
  return pr.mergeStateStatus === 'CLEAN';
}
```

GitHub's `mergeStateStatus` values:
- `CLEAN`: Ready to merge
- `BLOCKED`: Branch protection rules not satisfied
- `BEHIND`: Base branch is ahead (needs rebase/merge)
- `DIRTY`: Merge conflicts exist
- `UNKNOWN`: Status being computed
- `UNSTABLE`: Checks failing but merge allowed

## Edge Cases

1. **Single PR stack**: Works normally, merges one PR
2. **Already on trunk**: Error - "Cannot merge stack from trunk"
3. **PR already merged**: Auto-sync at start handles this
4. **PR closed (not merged)**: Will fail at merge time with clear error
5. **All PRs already merged**: "All PRs in the stack are already merged"
6. **Detached HEAD**: Error - must be on a tracked branch
7. **--until branch not in stack**: Error with message

## Future Considerations (Not in Initial Scope)

- `--from` flag to start from a specific branch
- `--skip-checks` for repos without required checks
- Parallel waiting for independent branches
- Integration with GitHub merge queues
- `--upstack` flag to merge children too
