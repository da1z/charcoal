import { describe, it, expect } from 'bun:test';
import { allScenes } from '../../lib/scenes/all_scenes';
import { configureTest } from '../../lib/utils/configure_test';
import { expectCommits } from '../../lib/utils/expect_commits';

for (const scene of allScenes) {
  describe(`(${scene}): continue upstack onto`, () => {
    configureTest(scene);

    it('Can continue an upstack onto with single merge conflict', () => {
      scene.repo.createChange('a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);

      scene.repo.checkoutBranch('main');

      scene.repo.createChange('b');
      scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `b`]);

      expect(() =>
        scene.repo.runCliCommand(['upstack', 'onto', 'a'])
      ).toThrow();
      expect(scene.repo.rebaseInProgress()).toBe(true);

      scene.repo.resolveMergeConflicts();
      scene.repo.markMergeConflictsAsResolved();
      const output = scene.repo.runCliCommandAndGetOutput(['continue']);

      // Continue should finish the work that stack fix started, not only
      // completing the rebase but also re-checking out the original
      // branch.
      expect(scene.repo.currentBranchName()).toBe('b');
      expectCommits(scene.repo, 'b, a');
      expect(scene.repo.rebaseInProgress()).toBe(false);
      output.includes('Successfully moved');
    });

    it('Can run continue multiple times on an upstack onto with multiple merge conflicts', () => {
      scene.repo.createChange('a', '1');
      scene.repo.createChange('a', '2');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);

      scene.repo.checkoutBranch('main');

      scene.repo.createChange('b', '1');
      scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `b`]);

      scene.repo.createChange('c', '2');
      scene.repo.runCliCommand([`branch`, `create`, `c`, `-m`, `c`]);

      scene.repo.checkoutBranch('b');

      expect(() =>
        scene.repo.runCliCommand(['upstack', 'onto', 'a'])
      ).toThrow();
      expect(scene.repo.rebaseInProgress()).toBe(true);

      scene.repo.resolveMergeConflicts();
      scene.repo.markMergeConflictsAsResolved();

      expect(() => scene.repo.runCliCommand(['continue'])).toThrow();
      expect(scene.repo.rebaseInProgress()).toBe(true);

      scene.repo.resolveMergeConflicts();
      scene.repo.markMergeConflictsAsResolved();
      scene.repo.runCliCommand(['continue']);

      // Continue should finish the work that stack fix started, not only
      // completing the rebase but also re-checking out the original
      // branch.
      expect(scene.repo.currentBranchName()).toBe('b');
      expectCommits(scene.repo, 'b, a');
      expect(scene.repo.rebaseInProgress()).toBe(false);

      // Ensure that the upstack worked too (verify integrity of entire stack).
      scene.repo.checkoutBranch('c');
      expectCommits(scene.repo, 'c, b, a');
    });
  });
}
