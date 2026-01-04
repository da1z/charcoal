import fs from 'node:fs';
import path from 'path';
import tmp from 'tmp';
import type { TContext } from '../../../src/lib/context';
import { initContext, initContextLite } from '../../../src/lib/context';
import { composeGit } from '../../../src/lib/git/git';
import { cuteString } from '../../../src/lib/utils/cute_string';
import {
  emptyDirSync,
  ensureDirSync,
  removeSync,
} from '../../../src/lib/utils/fs_utils';
import { GitRepo } from '../utils/git_repo';

function createTmpDir(): tmp.DirResult {
  const baseDir = process.env.PK_TEST_DIR;
  if (baseDir) {
    const absoluteDir = path.resolve(baseDir);
    ensureDirSync(absoluteDir);
    const name = fs.mkdtempSync(path.join(absoluteDir, 'tmp-'));
    return {
      name,
      removeCallback: () => removeSync(name),
    };
  }
  return tmp.dirSync();
}

export abstract class AbstractScene {
  tmpDir: tmp.DirResult;
  repo: GitRepo;
  dir: string;
  oldDir: string;

  constructor() {
    this.tmpDir = createTmpDir();
    this.dir = this.tmpDir.name;
    this.repo = new GitRepo(this.dir);
    this.oldDir = process.cwd();
  }

  abstract toString(): string;

  public setup(): void {
    this.tmpDir = createTmpDir();
    this.dir = this.tmpDir.name;
    this.repo = new GitRepo(this.dir);
    fs.writeFileSync(
      `${this.dir}/.git/.graphite_repo_config`,
      cuteString({ trunk: 'main', isGithubIntegrationEnabled: false })
    );
    const userConfigPath = `${this.dir}/.git/.graphite_user_config`;
    fs.writeFileSync(userConfigPath, cuteString({ tips: false }));
    process.env.GRAPHITE_USER_CONFIG_PATH = userConfigPath;
    process.env.GRAPHITE_PROFILE = '';
    this.oldDir = process.cwd();
    process.chdir(this.dir);
  }

  public cleanup(): void {
    process.chdir(this.oldDir);
    if (!process.env.DEBUG) {
      emptyDirSync(this.dir);
      this.tmpDir.removeCallback();
    }
  }

  public getContext(interactive = false): TContext {
    const oldDir = process.cwd();
    process.chdir(this.tmpDir.name);
    const context = initContext(
      initContextLite({
        interactive,
        quiet: !process.env.DEBUG,
        debug: !!process.env.DEBUG,
      }),
      composeGit(),
      {
        verify: false,
      }
    );
    process.chdir(oldDir);
    return context;
  }
}
