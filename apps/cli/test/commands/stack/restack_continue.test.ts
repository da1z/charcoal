import { describe, it, expect } from 'bun:test';
import { allScenes } from '../../lib/scenes/all_scenes';
import { configureTest } from '../../lib/utils/configure_test';
import { expectCommits } from '../../lib/utils/expect_commits';

for (const scene of allScenes) {
  // eslint-disable-next-line max-lines-per-function
  describe(`(${scene}): restack continue`, () => {
    configureTest(scene);

    it('Can abort a restack with a merge conflict', () => {
      scene.repo.createChange('a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);

      scene.repo.createChange('b');
      scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `b`]);

      scene.repo.checkoutBranch('a');
      scene.repo.createChangeAndAmend('1');

      expect(() =>
        scene.repo.runCliCommand(['stack', 'restack', '-q'])
      ).toThrow();
      expect(scene.repo.rebaseInProgress()).toBe(true);

      scene.repo.runGitCommand(['rebase', '--abort']);

      expect(scene.repo.rebaseInProgress()).toBe(false);
      expect(scene.getContext().engine.currentBranchPrecondition).toBe('b');
      expect(scene.repo.currentBranchName()).toBe('b');

      scene.repo.checkoutBranch('b');
      expectCommits(scene.repo, 'b, a, 1');
    });

    it('Can continue a stack restack with single merge conflict', () => {
      scene.repo.createChange('a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);

      scene.repo.createChange('b');
      scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `b`]);

      scene.repo.checkoutBranch('a');
      scene.repo.createChangeAndAmend('1');

      expect(() =>
        scene.repo.runCliCommand(['stack', 'restack', '-q'])
      ).toThrow();
      expect(scene.repo.rebaseInProgress()).toBe(true);

      scene.repo.resolveMergeConflicts();
      scene.repo.markMergeConflictsAsResolved();
      scene.repo.runCliCommand(['continue']);

      // Continue should finish the work that stack restack started, not only
      // completing the rebase but also re-checking out the original
      // branch.
      expect(scene.repo.currentBranchName()).toBe('a');
      expectCommits(scene.repo, 'a, 1');
      expect(scene.repo.rebaseInProgress()).toBe(false);

      scene.repo.checkoutBranch('b');
      expectCommits(scene.repo, 'b, a, 1');
    });

    it('Can run continue multiple times on a stack restack with multiple merge conflicts', () => {
      scene.repo.createChange('a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);

      scene.repo.createChange('b');
      scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `b`]);

      scene.repo.createChange('c');
      scene.repo.runCliCommand([`branch`, `create`, `c`, `-m`, `c`]);

      scene.repo.checkoutBranch('a');
      scene.repo.createChangeAndAmend('a1');

      scene.repo.checkoutBranch('b');
      scene.repo.createChangeAndAmend('b1');

      scene.repo.checkoutBranch('a');

      expect(() =>
        scene.repo.runCliCommand(['stack', 'restack', '-q'])
      ).toThrow();
      expect(scene.repo.rebaseInProgress()).toBe(true);

      scene.repo.resolveMergeConflicts();
      scene.repo.markMergeConflictsAsResolved();

      expect(() => scene.repo.runCliCommand(['continue'])).toThrow();
      expect(scene.repo.rebaseInProgress()).toBe(true);

      scene.repo.resolveMergeConflicts();
      scene.repo.markMergeConflictsAsResolved();
      scene.repo.runCliCommand(['continue']);

      // Note that even though multiple continues have been run, the original
      // context - that the original stack restack was kicked off at 'a' - should
      // not be lost.
      expect(scene.repo.currentBranchName()).toBe('a');
      expect(scene.repo.rebaseInProgress()).toBe(false);

      expectCommits(scene.repo, 'a, 1');

      scene.repo.checkoutBranch('b');
      expectCommits(scene.repo, 'b, a, 1');

      scene.repo.checkoutBranch('c');
      expectCommits(scene.repo, 'c, b, a, 1');
    });
  });
}
