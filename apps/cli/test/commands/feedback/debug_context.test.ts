import { describe, it, expect } from 'bun:test';
import { emptyDirSync, removeSync } from '../../../src/lib/utils/fs_utils';
import { GitRepo } from '../../lib/utils/git_repo';
import { TrailingProdScene } from '../../lib/scenes/trailing_prod_scene';
import { configureTest } from '../../lib/utils/configure_test';

for (const scene of [new TrailingProdScene()]) {
  describe(`(${scene}): feedback debug-context`, () => {
    configureTest(scene);

    it('Can create debug-context', () => {
      expect(() =>
        scene.repo.runCliCommand([`feedback`, `debug-context`])
      ).not.toThrow();
    });

    it('Can recreate a tmp repo based on debug context', () => {
      scene.repo.createChange('a', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);

      scene.repo.createChange('b', 'b');
      scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `b`]);

      const context = scene.repo.runCliCommandAndGetOutput([
        `feedback`,
        `debug-context`,
      ]);

      const outputLines = scene.repo
        .runCliCommandAndGetOutput([
          `feedback`,
          `debug-context`,
          `--recreate`,
          context,
        ])
        .toString()
        .trim()
        .split('\n');

      const tmpDir = outputLines[outputLines.length - 1];

      const newRepo = new GitRepo(tmpDir);
      newRepo.checkoutBranch('b');
      expect(newRepo.currentBranchName()).toBe('b');

      newRepo.runCliCommand([`bd`]);
      expect(newRepo.currentBranchName()).toBe('a');

      emptyDirSync(tmpDir);
      removeSync(tmpDir);
    });
  });
}
