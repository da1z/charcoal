# Yarn to Bun Migration - Code Review Issues

## Critical Issues (Must Fix)

### 1. TypeScript Configuration Mismatch Between Root and CLI Package
**Confidence: 95%**

**Files:**
- `/apps/cli/tsconfig.json`
- `/tsconfig.json`

**Issue:** The root `tsconfig.json` uses modern Bun-specific settings (`"module": "Preserve"`, `"moduleResolution": "bundler"`, `"noEmit": true`), but the CLI package still uses legacy settings (`"module": "commonjs"`, `"moduleResolution": "node"`).

**Impact:**
- Inconsistent build environment
- CLI package's `"module": "commonjs"` contradicts Bun's ES module-first philosophy
- Potential TypeScript type checking inconsistencies

**Fix:** Align `apps/cli/tsconfig.json` with the root config:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": ".",
    "types": ["bun-types"]
  },
  "include": ["src", "test", "scripts"]
}
```

---

### 2. Missing Bun Types Configuration in CLI tsconfig.json
**Confidence: 90%**

**File:** `/apps/cli/tsconfig.json`

**Issue:** The CLI's `tsconfig.json` doesn't include `"types": ["bun-types"]` in compilerOptions, even though `@types/bun` is installed in `devDependencies`.

**Impact:**
- No proper type information for Bun's APIs (`Bun.file()`, `Bun.serve()`, `bun:test`)
- The installed `@types/bun` dependency is not being used

**Fix:** Add to `apps/cli/tsconfig.json`:
```json
{
  "compilerOptions": {
    "types": ["bun-types"]
  }
}
```

---

### 3. TypeScript Version Inconsistency Across Packages
**Confidence: 85%**

**Files:**
- `/package.json` (TypeScript 5.7.0)
- `/libs/gti-cli-shared-types/package.json` (TypeScript 4.6.4)

**Issue:** The root and CLI packages use TypeScript 5.7.0, but the shared types library still uses TypeScript 4.6.4.

**Impact:**
- Type definitions compiled with TS 4.6.4 may not be fully compatible with TS 5.7.0
- Missing 2+ years of TypeScript features and improvements
- Potential build/compilation issues in the monorepo

**Fix:** Update `libs/gti-cli-shared-types/package.json`:
```json
{
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

---

## Important Issues (Should Fix)

### 4. Not Leveraging Bun.file() API for File I/O
**Confidence: 80%**

**Files:**
- `/apps/cli/src/lib/utils/fs_utils.ts`
- 13 other files using `fs.readFileSync/writeFileSync`

**Issue:** The migration replaced `fs-extra` with `node:fs`, but didn't adopt Bun's native `Bun.file()` API.

**Project Guideline Reference:** `.claude/rules/use-bun-instead-of-node-vite-npm-pnpm.md` states: "Prefer `Bun.file` over `node:fs`'s readFile/writeFile"

**Impact:**
- Missing out on Bun's optimized file I/O performance
- Not following documented project conventions
- 20+ occurrences of `readFileSync/writeFileSync` across the codebase

**Examples:**
- `src/lib/spiffy/spiffy.ts:39` - `fs.writeFileSync(filePath, cuteString(_data))`
- `src/lib/spiffy/spiffy.ts:131` - `fs.readFileSync(filePath).toString()`
- `src/actions/edit/stack_edit_file.ts:35` - `fs.writeFileSync(filePath, fileContents)`

**Fix Example:**
```typescript
// Instead of:
fs.writeFileSync(filePath, content);
const data = fs.readFileSync(filePath, 'utf-8');

// Use:
await Bun.write(filePath, content);
const data = await Bun.file(filePath).text();
```

---

### 5. ensureDirSync May Fail on Edge Cases
**Confidence: 82%**

**File:** `/apps/cli/src/lib/utils/fs_utils.ts:16-18`

**Issue:** The `ensureDirSync` implementation doesn't check if the path exists as a file before calling `mkdirSync`.

**Current Code:**
```typescript
export function ensureDirSync(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}
```

**Impact:**
- If `dirPath` exists as a file (not a directory), this throws `EEXIST` error
- fs-extra's `ensureDirSync` handled this edge case

**Fix:**
```typescript
export function ensureDirSync(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  } else if (!fs.statSync(dirPath).isDirectory()) {
    throw new Error(`Path exists but is not a directory: ${dirPath}`);
  }
}
```

---

### 6. turbo.json Missing PK_TEST_DIR in test-ci Environment Variables
**Confidence: 88%**

**File:** `/turbo.json:24-28`

**Issue:** The `test` task declares `PK_TEST_DIR` as an environment variable, but `test-ci` doesn't.

**Current Code:**
```json
"test": {
  "dependsOn": [],
  "outputs": [],
  "inputs": ["src/**", "test/**"],
  "env": ["PK_TEST_DIR"]
},
"test-ci": {
  "dependsOn": [],
  "outputs": ["coverage/**"],
  "inputs": ["src/**", "test/**"]
  // Missing env: ["PK_TEST_DIR"]
}
```

**Impact:**
- Turbo's caching might not invalidate properly when `PK_TEST_DIR` changes
- Inconsistent cache behavior between `test` and `test-ci`

**Fix:**
```json
"test-ci": {
  "dependsOn": [],
  "outputs": ["coverage/**"],
  "inputs": ["src/**", "test/**"],
  "env": ["PK_TEST_DIR"]
}
```

---

## Summary

| Priority | Issue | Status |
|----------|-------|--------|
| Critical | TypeScript config mismatch | FIXED |
| Critical | Missing Bun types in CLI | FIXED (auto-discovered from @types/bun) |
| Critical | TypeScript version inconsistency | FIXED |
| Important | Not using Bun.file() API | DEFERRED (would require async changes) |
| Important | ensureDirSync edge case | FIXED |
| Important | Missing env in test-ci | FIXED |

## Strengths of the Migration

- All 42 test files successfully migrated from Chai to bun:test
- Clean fs-extra helper utilities implementation
- No remaining references to removed dependencies (mocha, chai, nock, etc.)
- Proper test configuration with beforeEach/afterEach
- turbo.json correctly removes build dependency from test tasks
