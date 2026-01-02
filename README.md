# Charcoal

> A CLI for managing stacked pull requests

<img width="1346" alt="CleanShot 2023-09-09 at 19 48 49@2x" src="https://github.com/danerwilliams/graphite-cli/assets/22798229/17385828-f235-4b56-84dd-ad73350d55b9">

## About This Fork

This is a fork of [danerwilliams/charcoal](https://github.com/danerwilliams/charcoal) with additional features:

### Stack Merge Command

Merge all PRs in your stack sequentially with a single command:

```bash
gt stack merge
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

### Restack by Default with Sync

`gt repo sync` now restacks branches by default, keeping your stack up to date with trunk automatically.

### Bug Fixes

- **Branch traversal fix**: Fixed an issue where `repo sync` could get into an invalid state if a branch was deleted in the middle of a stack
- **PR body footer fix**: Fixed duplication of the dependency tree footer when external bots (like CI/linters) add content to PR descriptions

## Install

`brew install danerwilliams/tap/charcoal`

Or build from source:
```bash
git clone https://github.com/da1z/charcoal.git
cd charcoal/apps/cli
npm install
npm run build
```

## What is Graphite?

From Graphite:

> [Graphite](https://graphite.dev) is a **fast, simple code review platform** designed for engineers who want to **write and review smaller pull requests, stay unblocked, and ship faster**. Anyone can start using Graphite individually without needing their coworkers to change tools - we'll seamlessly sync your code changes and reviews. We built Graphite because we missed internal code review tools like Phabricator (at Facebook) and Critique (Google) that help engineers create, approve, and ship small, incremental changes, and long-term we’re passionate about creating products & workflows that help fast-moving eng teams achieve more.

## What is Charcoal?

Charcoal is simply the Graphite CLI, but open source!

On 7/14/2023 the Graphite team announced that they closed open source development of the Graphite CLI and [moved development to their private monorepo](https://github.com/withgraphite/graphite-cli). They also added a pay wall limiting free users to 10 open stacks at a time per organization starting 8/7/2023.

Graphite is an amazing company and you should absolutely check out their products. In addition to a stacking CLI, they have an entire code review platform, merge queue, and more developer productivity tools.

However, many organizations aren't interested in paying for Graphite's team plan at this time.

The Graphite CLI does not need to depend on Graphite's API, so this project allows for use of the CLI with any git repository (even ones hosted on platforms other than GitHub!), entirely for free.

## User guide

<https://graphite.dev/docs/graphite-cli/>

Right now, the Graphite Docs are more or less in sync with the features available in Charcoal.

As Graphite continues to develop their private version of the CLI, however, these will become out of sync. Ideally we can add our own open source docs to accompany this project.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)
