# AI Commit Message Generation Specification

## Overview

Add support for automatically generating commit messages using AI when the user runs `pk commit` without providing a message via the `-m` flag. The feature uses Vercel AI SDK with the Anthropic provider (claude-haiku-4-5 model) to analyze staged changes and generate a commit message. Behavior is globally configurable to allow automatic AI generation, manual message entry, or disabling the feature entirely.

## Command Behavior

### Current Behavior
```bash
pk commit              # Opens editor for message entry
pk commit -m "msg"     # Commits with provided message
pk commit -a           # Stages all, opens editor
pk commit -a -m "msg"  # Stages all, commits with message
```

### New Behavior with AI Enabled
```bash
pk commit              # If no staged changes, normal git error
                       # If staged changes exist, AI generates message and commits
pk commit -m "msg"     # Still uses provided message (AI never triggers)
pk commit -a           # Stages all, AI analyzes all changes, commits
pk commit -a -m "msg"  # Still uses provided message (AI never triggers)
```

## Configuration

### Config Schema

Add to user config schema (follows existing pattern in [user_config_spf.ts](../apps/cli/src/lib/spiffy/user_config_spf.ts)):

```typescript
commitMessage: t.optional(
  t.shape({
    autoGenerate: t.shape({
      enabled: t.boolean,
      provider: t.string,
      envVar: t.string,
    }),
  })
)
```

### Config Example

```json
{
  "commitMessage": {
    "autoGenerate": {
      "enabled": true,
      "provider": "anthropic",
      "envVar": "ANTHROPIC_API_KEY"
    }
  }
}
```

### Config Values

- **enabled**: `true` | `false` - Whether AI generation is enabled
- **provider**: String identifier for AI provider (initially only `"anthropic"` supported)
- **envVar**: Name of environment variable to read API key from (e.g., `"ANTHROPIC_API_KEY"`)

### Default Behavior

If `commitMessage.autoGenerate` is not present in config:
- Feature is disabled
- Standard behavior (open editor when no `-m` flag)

### Config Validation

Follow existing config validation patterns in the codebase:
- Missing config = feature disabled
- Empty `envVar` value = treat as missing/disabled, fail with clear error
- Unknown `provider` value = warn and disable feature
- No explicit validation on config load (lazy validation at usage time)

## Implementation

### Code Location

Add AI generation logic directly in [commit_create.ts](../apps/cli/src/actions/commit_create.ts).

### Dependencies

```bash
bun add ai @ai-sdk/anthropic
```

### High-Level Flow

```typescript
export function commitCreateAction(
  opts: {
    addAll: boolean;
    patch: boolean;
    message?: string;
  },
  context: TContext
): void {
  if (context.engine.rebaseInProgress()) {
    throw new BlockedDuringRebaseError();
  }

  if (opts.addAll) {
    context.engine.addAll();
  }

  // If no staged changes, git will error naturally before we try AI
  ensureSomeStagedChangesPrecondition(context);

  // Determine if we should use AI
  let message = opts.message;
  if (!message && shouldUseAI(context)) {
    message = await generateCommitMessage(context);
  }

  context.engine.commit({
    message: message, // undefined = editor, string = use message
    patch: !opts.addAll && opts.patch,
  });

  restackBranches(
    context.engine.getRelativeStack(
      context.engine.currentBranchPrecondition,
      SCOPE.UPSTACK_EXCLUSIVE
    ),
    context
  );
}
```

### AI Generation Function

```typescript
async function generateCommitMessage(context: TContext): Promise<string> {
  const config = context.userConfig.data.commitMessage?.autoGenerate;

  // Get API key from environment
  const apiKey = process.env[config.envVar];
  if (!apiKey || apiKey.trim() === '') {
    throw new Error(`API key not found in environment variable ${config.envVar}`);
  }

  // Get staged diff
  const diff = context.engine.getDiff({ staged: true });

  // Truncate if too large
  const truncatedDiff = truncateDiff(diff, 50000);

  // Show loading indicator
  context.splog.info('Generating commit message...');

  // Call AI
  const { generateText } = await import('ai');
  const { anthropic } = await import('@ai-sdk/anthropic');

  const result = await generateText({
    model: anthropic('claude-haiku-4-5'),
    prompt: truncatedDiff,
  });

  return result.text;
}

function truncateDiff(diff: string, maxChars: number): string {
  if (diff.length <= maxChars) {
    return diff;
  }
  return diff.substring(0, maxChars) + '\n\n[Diff truncated at 50000 characters]';
}

function shouldUseAI(context: TContext): boolean {
  const config = context.userConfig.data.commitMessage?.autoGenerate;
  return config?.enabled === true && config.provider === 'anthropic';
}
```

### Git Diff Command

Use `git diff --staged` to get the diff:

```typescript
// In engine or git wrapper
getDiff(opts: { staged: boolean }): string {
  const args = ['diff'];
  if (opts.staged) {
    args.push('--staged');
  }
  return execSync(`git ${args.join(' ')}`, { encoding: 'utf-8' });
}
```

## User Experience

### Loading Indicator

Show a single line indicator during AI generation:

```
Generating commit message...
```

Check existing codebase for animation patterns. If spinners or progress indicators are used elsewhere (e.g., in restack operations or sync), use the same pattern. Otherwise, use static text.

### Success Flow

```bash
$ pk commit
Generating commit message...
[feature-branch abc1234] Add user authentication middleware
 3 files changed, 45 insertions(+), 2 deletions(-)
```

The commit completes silently after generation. No preview, no confirmation, no marking in commit message.

### Error Handling

#### API Key Missing

```bash
$ pk commit
Error: API key not found in environment variable ANTHROPIC_API_KEY
Set the environment variable or provide a commit message with -m flag.
```

#### API Call Failure

Show the error from the AI SDK directly:

```bash
$ pk commit
Generating commit message...
Error: Failed to generate commit message: [SDK error message]
```

Exit with non-zero status code. Do not fall back to editor.

#### Network Issues

Let the AI SDK error propagate naturally:

```bash
$ pk commit
Generating commit message...
Error: Failed to generate commit message: Network request failed
```

#### Rate Limiting

AI SDK will throw rate limit errors. Show them directly:

```bash
$ pk commit
Generating commit message...
Error: Failed to generate commit message: Rate limit exceeded. Retry after 60 seconds.
```

## Edge Cases

### No Staged Changes

Standard git behavior takes precedence. If no staged changes, `ensureSomeStagedChangesPrecondition` will error before AI is attempted:

```bash
$ pk commit
Error: No staged changes to commit
```

AI generation is never invoked.

### Empty Staged Changes

Same as above - precondition check handles this.

### Message Provided via -m

AI never triggers if `-m` flag is present:

```bash
$ pk commit -m "my message"  # Uses "my message", AI skipped
```

### Stage All (-a) Flag

If `-a` flag is used, all changes are staged first, then AI analyzes the full diff:

```bash
$ pk commit -a
Generating commit message...
[feature-branch abc1234] Update API endpoints and add tests
```

### Patch Mode (-p)

Patch mode is incompatible with message generation. If `-p` is used without `-m`, editor opens (standard behavior). AI is not involved:

```bash
$ pk commit -p        # Opens editor after patch selection
$ pk commit -a -p     # -a overrides -p, AI can trigger
```

### Feature Disabled

If `commitMessage.autoGenerate.enabled` is `false` or config is missing:

```bash
$ pk commit
# Opens editor (standard behavior)
```

### Unsupported Provider

If `provider` is not `"anthropic"`:

```bash
$ pk commit
Warning: Unsupported AI provider 'openai'. AI commit generation disabled.
# Opens editor (standard behavior)
```

### Large Diffs

Diffs are truncated at 50,000 characters. A note is appended to the truncated diff:

```
[Diff truncated at 50000 characters]
```

The AI generates a message based on the partial diff. No error, no warning to user.

### Git Hooks

AI-generated message is passed to `git commit` the same way as user-provided messages. Git hooks (e.g., `commit-msg`, `prepare-commit-msg`) will process the message normally. If hooks modify or reject the message, standard git behavior applies.

### Rebase in Progress

AI is never invoked during rebase. The `BlockedDuringRebaseError` precondition check happens before AI logic:

```bash
$ pk commit
Error: Cannot create commit during rebase
```

## Testing

### Unit Tests

Follow existing test patterns in `test/commands/` directory:

1. **Config tests**: Verify config loading and validation
2. **shouldUseAI tests**: Test enablement logic
3. **truncateDiff tests**: Verify truncation at 50K chars
4. **Error handling tests**: Mock AI SDK failures

### Mock AI Calls

Mock the `generateText` function to return fixed responses:

```typescript
import { generateText } from 'ai';
jest.mock('ai', () => ({
  generateText: jest.fn().mockResolvedValue({ text: 'Test commit message' }),
}));
```

### Manual Testing

No live API integration tests. Manual testing checklist:

- [ ] AI generates message when config enabled and no -m flag
- [ ] Message provided via -m skips AI
- [ ] Missing API key shows clear error
- [ ] Invalid API key shows SDK error
- [ ] Large diffs are truncated
- [ ] Empty staged changes error before AI
- [ ] Feature disabled when config missing
- [ ] Commit with -a stages all and uses AI

## Documentation

### CLI Help Text

Update `pk commit --help`:

```
USAGE
  pk commit [options]

OPTIONS
  -m, --message <message>  Commit message
  -a, --all                Stage all modified files before commit
  -p, --patch              Interactively select hunks to commit

AI COMMIT MESSAGES
  If no message is provided via -m, Pancake can automatically generate commit
  messages using AI. Enable this feature in your user config:

  {
    "commitMessage": {
      "autoGenerate": {
        "enabled": true,
        "provider": "anthropic",
        "envVar": "ANTHROPIC_API_KEY"
      }
    }
  }

  Set the environment variable specified in envVar (e.g., ANTHROPIC_API_KEY)
  to your API key.
```

### Config Help

Update `pk config --help` or relevant config documentation to mention the new `commitMessage.autoGenerate` option.

## Security Considerations

### API Key Storage

- API keys are **never** stored in config files
- Keys are read from environment variables only
- Users responsible for managing env vars securely
- Empty string treated as missing (fail with error)

### Diff Content

- No filtering or redaction of sensitive content in diffs
- Trust user to not stage secrets
- Staged content is sent to Anthropic API as-is (subject to truncation)
- Users should be aware that diff content is sent to external API

### No Special Handling

- No `.gitignore` pattern filtering
- No secret detection or warnings
- No content inspection beyond size truncation

## Model Configuration

### Hardcoded Model

Use `claude-haiku-4-5` for all requests. No config option for model selection.

```typescript
model: anthropic('claude-haiku-4-5')
```

### Rationale

- Haiku optimized for speed and cost-effectiveness
- Sufficient for commit message generation
- Simplifies initial implementation
- Can add model config in future if needed

## Future Enhancements (Out of Scope)

The following are explicitly **not** included in this initial implementation:

- [ ] Multiple provider support (OpenAI, Gemini, etc.)
- [ ] Configurable model selection
- [ ] Custom prompt templates
- [ ] Message preview before commit
- [ ] Dry-run mode (`--dry-run`)
- [ ] Override flags (`--ai`, `--no-ai`)
- [ ] Commit message marking/tagging
- [ ] Caching or rate limiting
- [ ] Conventional commit format enforcement
- [ ] Message length validation
- [ ] Editor fallback on AI failure
- [ ] Integration with git-absorb or similar tools
- [ ] Per-repo configuration

## Implementation Checklist

- [ ] Add `commitMessage.autoGenerate` to user config schema
- [ ] Install `ai` and `@ai-sdk/anthropic` packages
- [ ] Implement `generateCommitMessage()` function
- [ ] Implement `shouldUseAI()` helper
- [ ] Implement `truncateDiff()` helper
- [ ] Add git diff command to engine/git wrapper
- [ ] Integrate AI generation into `commitCreateAction`
- [ ] Add loading indicator during generation
- [ ] Add error handling for API failures
- [ ] Update `pk commit --help` documentation
- [ ] Write unit tests for config and helpers
- [ ] Manual testing with real API key

## Technical Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **AI SDK** | Vercel AI SDK (`ai/core`) with `generateText()` | Simple, direct, well-maintained |
| **Provider** | Anthropic only | Simplest initial implementation, already used in project |
| **Model** | claude-haiku-4-5 (hardcoded) | Fast, cheap, sufficient quality |
| **Prompt** | Minimal (just diff) | Simplest approach, let model infer task |
| **Truncation** | 50,000 characters | Balances context size with API costs |
| **API Key** | Environment variable (configurable name) | Secure, flexible, standard practice |
| **Config Timing** | Lazy load at usage time | Matches existing patterns in codebase |
| **Error Handling** | Fail commit, show SDK error | Clear feedback, no silent failures |
| **User Control** | Silent commit (no preview/confirmation) | Fast workflow, matches user preference |
| **Git Hooks** | Standard git commit flow | Let git handle hooks naturally |
| **Code Location** | `actions/commit_create.ts` | Co-located with commit logic, per user preference |
| **Testing** | Mocked AI, no live API tests | Faster tests, no API dependency in CI |
| **Documentation** | CLI help text only | Sufficient for initial release |
