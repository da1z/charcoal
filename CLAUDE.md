# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pancake is a CLI for managing stacked pull requests. It's a fork of Charcoal (itself a fork of Graphite CLI) with additional features like stack merge, branch freeze, and auto-restacking on sync.

The CLI binary is `pk` (alternative: `pancake`).

## Build Commands

```bash
# Install dependencies
bun install

# Build the project
bun run build

# Run CLI from source
bun run cli <command>

# Link pk globally for development
bun run dev
```

## Testing

```bash
# Run all tests (excluding large_repo.test.ts)
bun run test

# Run a specific test file
bun run test-one test/commands/branch/branch_create.test.ts

# Run tests matching a pattern
bun run test-grep "pattern"
```

Tests use `bun:test`. Test files are in `apps/cli/test/`. The `PK_TEST_DIR` environment variable controls where test git repos are created (defaults to `.test-tmp`).

## Lint and Type Check

```bash
bun run lint   # ESLint
bun run check  # TypeScript type checking
```

## Architecture

This is a Bun-based monorepo with the main CLI in `apps/cli/`.

### Key Source Directories (`apps/cli/src/`)

- **`commands/`** - Yargs command definitions organized by domain (branch, commit, stack, repo, etc.)
- **`actions/`** - Business logic implementations called by commands
- **`lib/engine/`** - Core engine managing branch metadata, parent-child relationships, and stack operations
- **`lib/git/`** - Git operations wrapper (commits, rebases, diffs, etc.)
- **`lib/spiffy/`** - Configuration file handlers (repo config, user config, continuation state)

### Core Concepts

**Engine (`lib/engine/engine.ts`)**: Central orchestrator that:
- Maintains an in-memory cache of branch metadata (parent relationships, PR info, frozen state)
- Validates and persists branch metadata via git refs
- Handles all stack operations (restack, track, untrack, freeze)
- Coordinates git operations with metadata updates

**Scope Spec (`lib/engine/scope_spec.ts`)**: Defines operation scopes:
- `BRANCH` - Current branch only
- `DOWNSTACK` - Current branch + all parents
- `STACK` - Full stack (parents + current + children)
- `UPSTACK` - Current branch + all children

**Context (`lib/context.ts`)**: Dependency injection container providing:
- `TContextLite` - User config, logging, prompts (no repo required)
- `TContext` - Full context with repo config and engine

### Testing Infrastructure

Tests use "scenes" (`test/lib/scenes/`) - reusable test fixtures that set up git repos with specific branch structures. Common pattern:

```typescript
import { BasicScene } from '../lib/scenes/basic_scene';
import { configureTest } from '../lib/utils/configure_test';

const scene = new BasicScene();
configureTest(scene);

test('my test', () => {
  scene.repo.execCliCommand('branch create my-branch');
  // assertions...
});
```

## Bun Usage

This project uses Bun instead of Node.js:
- Use `bun` instead of `node`
- Use `bun test` instead of Jest/Vitest
- Use `bun install` instead of npm/yarn
- Use `bunx` instead of `npx`
