# Pancake

> A CLI for managing stacked pull requests

## About

Pancake is a fork of [danerwilliams/charcoal](https://github.com/danerwilliams/charcoal) (which itself is a fork of the Graphite CLI) with additional features for managing stacked PRs.

## Features

### Stack Merge Command

Merge all PRs in your stack sequentially with a single command:

```bash
pk stack merge
```

The command:
- Merges PRs from trunk toward your current branch, one at a time
- Waits for CI checks to pass before each merge
- Automatically syncs and restacks remaining branches after each merge
- Updates PR base branches as the stack collapses

Options:
- `--dry-run` - List PRs that would be merged without actually merging
- `--until <branch>` - Stop merging at a specific branch (inclusive)
- `--timeout <minutes>` - Timeout per PR for checks to complete (default: 15)
- `--method <squash|merge|rebase>` - Override merge method (uses repo default if not specified)

### Branch Freeze

Freeze branches to prevent accidental modifications in collaborative workflows:

```bash
pk branch freeze [branch]   # Freeze current or specified branch
pk branch unfreeze [branch] # Unfreeze a frozen branch
```

Frozen branches cannot be:
- Restacked, pushed, deleted, renamed, folded, or squashed

This is useful when multiple people are working on a stack and you want to prevent changes to branches that are under review or have been approved. The `stack merge` command respects frozen branches and will stop merging at a frozen branch.

### Restack by Default with Sync

`pk repo sync` now restacks branches by default, keeping your stack up to date with trunk automatically.

### Bug Fixes

- **Branch traversal fix**: Fixed an issue where `repo sync` could get into an invalid state if a branch was deleted in the middle of a stack
- **PR body footer fix**: Fixed duplication of the dependency tree footer when external bots (like CI/linters) add content to PR descriptions

## Quick Start

```bash
# Initialize Pancake in your repo
pk repo init

# Create a new branch
pk branch create my-feature

# Make changes and commit
pk commit create -m "Add feature"

# Submit PR
pk stack submit

# View your stack
pk log
```

## User Guide

The [Graphite Docs](https://graphite.dev/docs/graphite-cli/) cover most of the core functionality. Commands use `pk` instead of `gt`.

## Credits

Pancake builds on the work of two great projects:

### Charcoal by Dane Williams

Pancake is a fork of [Charcoal](https://github.com/danerwilliams/charcoal) by [Dane Williams](https://github.com/danerwilliams). Charcoal kept the Graphite CLI open source and free after Graphite moved to a closed-source model.

Check out Dane's [blog post announcing Charcoal](https://danewilliams.com/announcing-charcoal).

### Graphite

The original CLI was created by [Graphite](https://graphite.dev), a fast, simple code review platform designed for engineers who want to write and review smaller pull requests, stay unblocked, and ship faster.

> On 7/14/2023 the Graphite team announced that they closed open source development of the Graphite CLI and moved development to their private monorepo. They also added a pay wall limiting free users to 10 open stacks at a time per organization.

Graphite is an amazing company with great products including a code review platform, merge queue, and more. Check them out at [graphite.dev](https://graphite.dev).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)
