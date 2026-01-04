# Contributing

Contributions are welcome! Please first open an issue so that we can discuss before opening a PR. I have limited bandwidth to maintain this project so please bear with me if responses and reviews are slow.

## Getting Started

[Install Bun](https://bun.sh/docs/installation) to build and test the project.

Install dependencies and build:

```bash
bun install
bun run build
```

## Running Tests

Run all tests:

```bash
bun run test
```

Run tests matching a pattern:

```bash
bun run test-grep "pattern"
```

Run a specific test file:

```bash
bun run test-one test/commands/branch/branch_create.test.ts
```

## Run CLI from Local Build

```bash
bun run cli <command>  # Run pk <command> from source
```

Link `pk` globally for development (includes a build):

```bash
bun run dev
# then to run commands:
pk <command>
```

## Generating the MacOS ARM Binary

Due to limitations with Github actions, we need to manually generate the MacOS ARM binary for a release.

From the cli app directory:

```
yarn build-pkg -t node18-macos -o gt-macos-arm64
```

## Getting Hashes for the Homebrew Tap

Download all 3 binaries and then run:

```
shasum -a 256 /path/to/mybinary
```
