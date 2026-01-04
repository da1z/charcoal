import { describe, it, expect, beforeEach } from 'bun:test';
import { allScenes } from '../../lib/scenes/all_scenes';
import { configureTest } from '../../lib/utils/configure_test';

for (const scene of allScenes) {
  describe(`(${scene}): continue`, () => {
    configureTest(scene);

    beforeEach(() => {
      scene.repo.createAndCheckoutBranch('a');
      scene.repo.trackBranch('a', 'main');
      scene.repo.createChangeAndCommit('a1');

      scene.repo.createAndCheckoutBranch('b');
      scene.repo.trackBranch('b', 'a');
      scene.repo.createChangeAndCommit('b1');

      scene.repo.checkoutBranch('a');
      scene.repo.createChangeAndCommit('a2');
    });

    describe('While not during a rebase', () => {
      it('Will error', () => {
        expect(() => scene.repo.runCliCommand(['continue'])).toThrow();
      });
    });

    describe('During a git initiated rebase', () => {
      beforeEach(() => {
        scene.repo.checkoutBranch('b');
        scene.repo.runGitCommand(['rebase', 'a']);
      });

      it('Stops during a rebase', () => {
        expect(scene.repo.rebaseInProgress()).toBe(true);
      });

      it('Will not continue', () => {
        expect(() => scene.repo.runCliCommand(['continue'])).toThrow();
      });

      describe('After resolving conflict', () => {
        beforeEach(() => {
          scene.repo.resolveMergeConflicts();
          scene.repo.markMergeConflictsAsResolved();
        });

        it('Will not continue', () => {
          expect(() => scene.repo.runCliCommand(['continue'])).toThrow();
        });
      });
    });

    describe('During a Grahite initiated rebase', () => {
      beforeEach(() => {
        scene.repo.checkoutBranch('b');
        expect(() => scene.repo.runCliCommand(['stack', 'restack'])).toThrow();
      });

      it('Stops during a rebase conflict', () => {
        expect(scene.repo.rebaseInProgress()).toBe(true);
      });

      it('Will not continue without resolving conflict', () => {
        expect(() => scene.repo.runCliCommand(['continue'])).toThrow();
      });

      describe('After resolving conflict and continuing', () => {
        beforeEach(() => {
          scene.repo.resolveMergeConflicts();
          scene.repo.markMergeConflictsAsResolved();
          scene.repo.runCliCommand(['continue']);
        });

        it('Lands on the restacked branch', () => {
          expect(scene.repo.currentBranchName()).toBe('b');
        });

        it('No longer is in a rebase', () => {
          expect(scene.repo.rebaseInProgress()).toBe(false);
        });
      });
    });
  });
}
