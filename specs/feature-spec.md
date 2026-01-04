# Migration from Yarn to Bun

## Overview

Migrate the pancake monorepo from Yarn 3.x to Bun as the package manager, runtime, test runner, and bundler. This migration aims to simplify tooling, improve performance, and leverage Bun's native capabilities.

## Current State

- **Package Manager**: Yarn 3.3.1 with PnP disabled (nodeLinker: node-modules)
- **Runtime**: Node.js
- **Test Runner**: Mocha with Chai assertions, tests run against compiled JS in `dist/`
- **Bundler**: TypeScript compiler (tsc) + pkg for standalone executables
- **Monorepo Orchestration**: Turbo
- **Workspaces**: 2 packages (`apps/cli`, `libs/gti-cli-shared-types`)

## Target State

- **Package Manager**: Bun
- **Runtime**: Bun
- **Test Runner**: bun:test with Jest-like expect API
- **Bundler**: bun build for JS output, bun build --compile for executables
- **Monorepo Orchestration**: Turbo (unchanged)
- **Workspaces**: Same packages, using glob syntax

---

## Detailed Migration Plan

### 1. Package Manager Migration

#### 1.1 Update Root package.json

Replace:
```json
{
  "packageManager": "yarn@3.3.1",
  "workspaces": {
    "packages": [
      "./apps/cli",
      "./libs/gti-cli-shared-types"
    ]
  }
}
```

With:
```json
{
  "packageManager": "bun@1.2.0",
  "workspaces": [
    "apps/*",
    "libs/*"
  ]
}
```

#### 1.2 Update Scripts

Replace yarn-specific script references:
- `yarn workspace @da1z/pancake test-one` → `bun run --filter @da1z/pancake test-one`
- `yarn workspace @da1z/pancake cli` → `bun run --filter @da1z/pancake cli`
- `yarn workspace @da1z/pancake dev` → `bun run --filter @da1z/pancake dev`

Or use Turbo for cross-workspace commands where applicable.

#### 1.3 Remove Yarn Artifacts

Delete the following:
- `.yarn/` directory (plugins, releases, sdks)
- `.yarnrc.yml`
- `yarn.lock` (after `bun install` generates `bun.lock`)

#### 1.4 Generate Bun Lockfile

```bash
rm -rf node_modules
rm yarn.lock
bun install
```

This creates `bun.lock` and installs all dependencies.

---

### 2. Build System Migration

#### 2.1 Replace tsc with bun build

Current build in `apps/cli/package.json`:
```json
"build": "rm -rf dist/ && yarn lint && tsc && cp scripts/node_version.js dist/scripts/node_version.js && cp src/lib/pk.fish dist/src/lib/pk.fish"
```

New build:
```json
"build": "rm -rf dist/ && bun run lint && bun build ./src/index.ts --outdir ./dist --target bun"
```

Note: The `pk.fish` asset copy is deferred for later evaluation. For now, handle it separately if needed.

#### 2.2 Remove postinstall Script

Current:
```json
"postinstall": "node scripts/node_version.js || node dist/scripts/node_version.js"
```

Action: Remove this script entirely. Bun users don't need Node version checks.

#### 2.3 Update libs/gti-cli-shared-types Build

Current:
```json
"build": "rm -rf dist/ && tsc"
```

New:
```json
"build": "rm -rf dist/ && bun build ./src/index.ts --outdir ./dist --target bun"
```

#### 2.4 Replace pkg with bun compile

Current pkg configuration:
```json
"pkg": {
  "scripts": "dist/src/**/*.js",
  "assets": ["dist/src/commands/**/*", "dist/src/lib/pk.fish"],
  "targets": ["node18-macos", "node18-linux"],
  "outputPath": "pkg"
}
```

New build-pkg script:
```json
"build-pkg": "bun build ./src/index.ts --compile --outfile ./pkg/pancake-macos --target bun-darwin-arm64 && bun build ./src/index.ts --compile --outfile ./pkg/pancake-linux --target bun-linux-x64"
```

Target platforms:
- macOS: `bun-darwin-arm64`
- Linux: `bun-linux-x64`

---

### 3. Test Migration

#### 3.1 Convert Test Files to bun:test

All 45+ test files need conversion from Mocha/Chai to bun:test.

**Before (Mocha/Chai):**
```typescript
import { expect } from 'chai';
import { describe, it } from 'mocha';

describe('feature', function() {
  it('should work', () => {
    expect(value).to.equal(expected);
    expect(array).to.deep.equal([1, 2, 3]);
    expect(() => fn()).to.throw(Error);
  });
});
```

**After (bun:test):**
```typescript
import { expect, describe, it, beforeEach, afterEach } from 'bun:test';

describe('feature', () => {
  it('should work', () => {
    expect(value).toBe(expected);
    expect(array).toEqual([1, 2, 3]);
    expect(() => fn()).toThrow(Error);
  });
});
```

#### 3.2 Assertion Migration Reference

| Chai | bun:test |
|------|----------|
| `expect(x).to.equal(y)` | `expect(x).toBe(y)` |
| `expect(x).to.deep.equal(y)` | `expect(x).toEqual(y)` |
| `expect(x).to.be.true` | `expect(x).toBe(true)` |
| `expect(x).to.be.false` | `expect(x).toBe(false)` |
| `expect(x).to.include(y)` | `expect(x).toContain(y)` |
| `expect(() => fn()).to.throw(Error)` | `expect(() => fn()).toThrow(Error)` |
| `expect(() => fn()).not.to.throw()` | `expect(() => fn()).not.toThrow()` |
| `expect(x).to.be.undefined` | `expect(x).toBeUndefined()` |
| `expect(x).to.be.null` | `expect(x).toBeNull()` |

#### 3.3 Adapt configureTest Utility

Current (`test/lib/utils/configure_test.ts`):
```typescript
import { AbstractScene } from '../scenes/abstract_scene';

export function configureTest(suite: Mocha.Suite, scene: AbstractScene): void {
  suite.timeout(600000);
  suite.beforeEach(() => scene.setup());
  suite.afterEach(() => scene.cleanup());
}
```

New:
```typescript
import { beforeEach, afterEach, setDefaultTimeout } from 'bun:test';
import { AbstractScene } from '../scenes/abstract_scene';

export function configureTest(scene: AbstractScene): void {
  setDefaultTimeout(600000);
  beforeEach(() => scene.setup());
  afterEach(() => scene.cleanup());
}
```

Usage change in test files:
```typescript
// Before
configureTest(this, scene);

// After
configureTest(scene);
```

#### 3.4 Run Tests Directly on TypeScript

Update test scripts to run `.ts` files directly instead of compiled `.js`:

```json
"test": "PK_TEST_DIR=.test-tmp bun test test/**/*.test.ts",
"test-one": "PK_TEST_DIR=.test-tmp bun test"
```

#### 3.5 Remove Graphite-Related Tests

Delete or disable tests that mock Graphite API (no longer used):
- `test/commands/repo/sync.test.ts`
- `test/commands/repo/sync_continue.test.ts`

This also removes the `nock` dependency requirement.

#### 3.6 Coverage Migration

Replace nyc with bun's built-in coverage:

```json
"test-ci": "bun test --coverage test/**/*.test.ts"
```

Remove `nyc` configuration from package.json.

---

### 4. Dependency Changes

#### 4.1 Dependencies to Remove

| Package | Reason |
|---------|--------|
| `ts-mocha` | Replaced by bun test |
| `mocha` | Replaced by bun test |
| `chai` | Replaced by bun:test expect |
| `chai-as-promised` | Replaced by bun:test expect |
| `nyc` | Replaced by bun test --coverage |
| `nock` | Tests using it will be removed |
| `ts-node` | Bun runs TS directly |
| `pkg` | Replaced by bun build --compile |
| `husky` | Removing git hooks |
| `pretty-quick` | Removing git hooks |
| `@yarnpkg/sdks` | Yarn-specific |

#### 4.2 Dependencies to Replace (Where Possible)

| Current | Replacement | Notes |
|---------|-------------|-------|
| `fs-extra` | `Bun.file()` | Use sync variants to minimize code changes |

Files using fs-extra (13 files):
- `src/commands/feedback-commands/debug_context.ts`
- `src/lib/debug_context.ts`
- `src/commands/fish.ts`
- `src/commands/dev-commands/meta.ts`
- `src/actions/test.ts`
- `src/actions/edit/stack_edit_file.ts`
- `src/lib/utils/pr_templates.ts`
- `src/lib/utils/perform_in_tmp_dir.ts`
- `src/lib/utils/git_repo.ts`
- `src/lib/git/merge_conflict_help.ts`
- `src/lib/spiffy/spiffy.ts`
- `src/lib/git/rebase_in_progress.ts`
- `src/actions/submit/pr_body.ts`

Migration pattern:
```typescript
// Before (fs-extra)
import fs from 'fs-extra';
const content = fs.readFileSync(path, 'utf-8');
fs.writeFileSync(path, content);
fs.ensureDirSync(dir);
fs.copySync(src, dest);

// After (Bun)
const content = Bun.file(path).text(); // or use textSync when available
await Bun.write(path, content);
// For ensureDir and copy, may need custom helpers or keep fs-extra for complex operations
```

#### 4.3 Dependencies to Keep

All other dependencies remain unchanged:
- `yargs` - CLI framework
- `chalk` - Terminal colors
- `prompts` - User prompts
- `zod` - Schema validation
- `semver` - Version parsing
- ESLint and related plugins
- Prettier

---

### 5. TypeScript Configuration

#### 5.1 Upgrade TypeScript

Update to latest stable TypeScript 5.x in both:
- Root `package.json`
- `apps/cli/package.json`
- `libs/gti-cli-shared-types/package.json`

```json
"typescript": "^5.7.0"
```

#### 5.2 Add Bun Types

Already present (`@types/bun`), ensure it's up to date:
```json
"@types/bun": "latest"
```

---

### 6. npm Publishing Strategy

The package continues to be published to npm as a JS bundle that works with Node.js:

```json
"main": "dist/src/index.js",
"types": "dist/src/index.d.ts"
```

Compiled binaries (bun build --compile) are distributed separately via GitHub releases.

---

### 7. Out of Scope

The following items are explicitly deferred:

1. **CI/CD Pipeline Updates** - Update GitHub Actions separately
2. **ESLint to Biome Migration** - Evaluate as future improvement
3. **pk.fish Asset Handling** - Evaluate how to handle fish completions later
4. **Test Pass Requirement** - Build passing is sufficient for initial migration

---

## Migration Execution Order

1. **Phase 1: Package Manager**
   - Remove yarn artifacts (.yarn/, .yarnrc.yml)
   - Update package.json with bun config
   - Run `bun install`
   - Verify lockfile generated

2. **Phase 2: Build System**
   - Update build scripts to use bun build
   - Remove postinstall script
   - Remove pkg configuration
   - Add bun compile scripts
   - Verify build succeeds

3. **Phase 3: Dependency Cleanup**
   - Remove unused dependencies (mocha, chai, nyc, etc.)
   - Update TypeScript to 5.x
   - Migrate fs-extra to Bun.file where straightforward

4. **Phase 4: Test Migration** (can be done incrementally)
   - Convert test files to bun:test syntax
   - Update configureTest utility
   - Remove Graphite-related tests
   - Verify tests can run (passing not required initially)

---

## Success Criteria

The migration is considered complete when:

- [x] `bun install` succeeds and generates bun.lock
- [x] `bun run build` (via Turbo) succeeds for all packages
- [x] The CLI is executable via `bun run cli`
- [x] `bun build --compile` produces working binaries

Test pass is not required for initial migration completion.

---

## Future Work

### Migrate @withgraphite/retype to Zod

The codebase currently uses `@withgraphite/retype` for runtime type validation and schema definition. This library has compatibility issues with TypeScript 5.x (particularly with `t.literal` and `t.unionMany`).

**Current state:**
- `@withgraphite/retype` is used in 4 files for schema definitions
- `@withgraphite/graphite-cli-routes` was removed (Graphite API no longer used)
- Type definitions now use explicit TypeScript types instead of deriving from API routes

**Recommendation:**
Migrate from `@withgraphite/retype` to `zod` (already a dependency) for:
- Better TypeScript 5.x compatibility
- More active maintenance
- Larger community and better documentation

Files to migrate:
- `src/lib/spiffy/user_config_spf.ts`
- `src/lib/spiffy/pr_info_spf.ts`
- `src/lib/engine/metadata_ref.ts`
- `src/lib/engine/cached_meta.ts`

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Bun API differences from Node | Most code uses standard Node APIs that Bun supports. fs-extra migration uses sync variants. |
| Test migration complexity | Full conversion approach chosen; can be done incrementally file by file |
| Build output differences | bun build produces compatible JS; verify manually that CLI commands work |
| Workspace resolution | Bun supports workspace:* protocol; Turbo handles orchestration |

---

## References

- [Bun Documentation](https://bun.sh/docs)
- [Bun Test Runner](https://bun.sh/docs/cli/test)
- [Bun Build](https://bun.sh/docs/bundler)
- [Turbo with Bun](https://turbo.build/repo/docs/crafting-your-repository/structuring-a-repository)
