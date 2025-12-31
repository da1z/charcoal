# Stack Merge Command Specification

## Overview

Create a `gt stack merge` command that merges PRs in a stack sequentially from trunk toward the current branch, waiting for CI checks to pass before merging each PR.

## Command Structure

```
gt stack merge [options]
```

**Aliases:** `sm`

**Example:** If on branch B in stack `main <- A <- B <- C`, running `gt stack merge` will:

1. Merge A into main
2. Restack B to target main, push, wait for checks
3. Merge B into main
4. (C is not touched - it's above current branch)

## Merge Direction

- Merges from **trunk toward the current branch** (downstack)
- Does NOT merge branches above (children of) the current branch
- Always starts from the first branch off trunk in the current stack

## Options

| Flag        | Type    | Default        | Description                                            |
| ----------- | ------- | -------------- | ------------------------------------------------------ |
| `--dry-run` | boolean | false          | List PRs that would be merged without actually merging |
| `--until`   | string  | current branch | Stop merging at this branch name (inclusive)           |
| `--timeout` | number  | 15             | Timeout in minutes per PR for checks to complete       |

## Preconditions (Fail Fast)

Before starting the merge process, the command must validate:

1. **All branches have PRs**: Every branch from trunk to current must have an associated GitHub PR
2. **All PRs are approved**: Every PR must have required approvals (query PR review status)
3. **No frozen branches**: If any branch in the merge range is frozen, stop at that branch
4. **Current branch has PR**: The branch you're on must have a PR

If any precondition fails, display a clear error and abort before any merges.

## Merge Process (Per PR)

For each PR in order from trunk to current/until:

### 1. Check if Already Merged

- If the PR is already merged/closed, skip to next
- This enables "resume" behavior without explicit state management

### 2. Ensure Branch is Up-to-Date

- If branch is behind base, run sync and restack
- Push the updated branch
- Wait for checks to complete

### 3. Wait for Required Checks

- Poll GitHub every **30 seconds** for check status
- Continue when GitHub API indicates PR is mergeable (required checks pass)
- Timeout after configured minutes (default: 15 min per PR)

### 4. Merge the PR

- Use repository's default merge method (squash/merge/rebase)
- Inherit settings from GitHub repo configuration

### 5. Restack Remaining Branches

- After merge, the next branch's parent is gone
- Sync repo
- Restack remaining branches
- Push updated branches/ submit
- Wait for new checks to pass before proceeding

## Failure Handling

### Check Failure or Timeout

When a check fails or times out:

1. Pause execution
2. Display which check failed and for which PR
3. Prompt user: **Retry** or **Abort**
   - Retry: Poll checks again from the beginning
   - Abort: Exit command, already-merged PRs stay merged

### Merge Conflicts

When a restack results in merge conflicts:

1. Pause execution
2. Display conflict information
3. Prompt user: **Retry** or **Abort**
   - User must resolve conflicts manually before retrying
   - Abort: Exit command, user resolves and re-runs

### Network/API Errors

- Transient errors: Retry with backoff
- Persistent errors: Pause and prompt (Retry/Abort)

## Progress Output

Minimal status display per PR:

```
Merging stack (3 PRs)...

PR #101 (feature-a): Waiting for checks (2/5 complete)...
PR #101 (feature-a): ✓ Merged

PR #102 (feature-b): Restacking to main...
PR #102 (feature-b): Waiting for checks (0/5 complete)...
PR #102 (feature-b): ✓ Merged

PR #103 (feature-c): Waiting for checks (4/5 complete)...
PR #103 (feature-c): ✓ Merged

All PRs merged successfully!
Running repo sync to clean up...
✓ Deleted branch feature-a
✓ Deleted branch feature-b
✓ Deleted branch feature-c
```

## Dry Run Mode

`gt stack merge --dry-run` outputs:

```
Would merge the following PRs (in order):
1. PR #101: feature-a -> main
2. PR #102: feature-b -> main (after restack)
3. PR #103: feature-c -> main (after restack)
```

No validation of checks/approvals in dry-run, just lists the merge order.

## Post-Merge Cleanup

After all PRs are successfully merged:

- Automatically run `repo sync --no-pull` to delete merged local branches
- This handles branch cleanup without requiring user intervention

## Frozen Branch Handling

If a frozen branch is encountered in the merge range:

- Merge all branches up to (but not including) the frozen branch
- Display message: "Stopped at frozen branch 'X'. Unfreeze to continue."
- Exit cleanly (not an error, just a stopping point)

## Implementation Notes

### GitHub API Calls Needed

- `GET /repos/{owner}/{repo}/pulls/{pull_number}` - PR status, mergeable state
- `GET /repos/{owner}/{repo}/commits/{ref}/check-runs` - Check status
- `PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge` - Merge PR
- `PATCH /repos/{owner}/{repo}/pulls/{pull_number}` - Update PR base branch

### State Management

- No persistent state file needed
- Already-merged PRs detected via GitHub API
- Interrupted runs can be resumed by re-running command

### Rate Limiting

- 30-second poll interval is rate-limit friendly
- Consider GitHub API rate limits (5000/hour authenticated)
- For large stacks, may approach limits after many restacks

## Edge Cases

1. **Single PR stack**: Works normally, just merges one PR
2. **Already on trunk**: Error - nothing to merge
3. **Detached HEAD**: Error - must be on a tracked branch
4. **PR targets wrong base**: Restack will fix this before merge
5. **Branch deleted on remote**: Error during push, prompt Retry/Abort

## Future Considerations (Not in Initial Scope)

- `--from` flag to start from a specific branch
- `--skip-checks` for repos without required checks
- Parallel check waiting for independent branches
- Integration with GitHub merge queues
- Slack/webhook notifications on completion
