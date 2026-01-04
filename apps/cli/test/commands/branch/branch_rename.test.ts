import { describe, it, expect } from 'bun:test';
import { allScenes } from '../../lib/scenes/all_scenes';
import { configureTest } from '../../lib/utils/configure_test';
import { expectCommits } from '../../lib/utils/expect_commits';

for (const scene of allScenes) {
  describe(`(${scene}): rename`, () => {
    configureTest(scene);

    it('Can rename a branch', () => {
      scene.repo.createChange('a', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);

      scene.repo.createChange('b', 'b');
      scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `b`]);

      scene.repo.checkoutBranch('a');
      scene.repo.runCliCommand([`branch`, `rename`, `a1`]);

      expect(() => scene.repo.runCliCommand([`ls`])).not.toThrow();

      scene.repo.checkoutBranch('b');

      expectCommits(scene.repo, 'b, a, 1');

      scene.repo.runCliCommand([`branch`, `down`, `--no-interactive`]);
      expect(scene.repo.currentBranchName()).toBe('a1');

      scene.repo.runCliCommand([`branch`, `down`, `--no-interactive`]);
      expect(scene.repo.currentBranchName()).toBe('main');
    });
    it("Renaming a branch to its own name doesn't break", () => {
      scene.repo.createChange('a', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);

      scene.repo.createChange('b', 'b');
      scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `b`]);

      scene.repo.checkoutBranch('a');
      scene.repo.runCliCommand([`branch`, `rename`, `a`]);

      expect(() => scene.repo.runCliCommand([`ls`])).not.toThrow();
      expect(() => scene.repo.runCliCommand([`bu`])).not.toThrow();
      expectCommits(scene.repo, 'b, a, 1');
    });
  });
}
