import { describe, it, expect } from 'bun:test';
import { composeGit } from '../../../src/lib/git/git';
import { CloneScene } from '../../lib/scenes/clone_scene';
import { configureTest } from '../../lib/utils/configure_test';

for (const scene of [new CloneScene()]) {
  describe(`(${scene}): freeze`, () => {
    configureTest(scene);

    it("Can't freeze a branch that hasn't been pushed to remote", () => {
      scene.repo.createChange('a', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);

      expect(() => scene.repo.runCliCommand([`branch`, `freeze`])).toThrow();
    });

    it('Can freeze a branch that has been pushed to remote', async () => {
      scene.repo.createChange('a', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);

      // Push to remote
      composeGit().pushBranch({
        remote: 'origin',
        branchName: 'a',
        noVerify: false,
        forcePush: false,
      });

      // Should not throw
      scene.repo.runCliCommand([`branch`, `freeze`]);

      // Verify branch is frozen by checking that operations fail
      expect(() => scene.repo.runCliCommand([`branch`, `delete`])).toThrow();
    });

    it('Can unfreeze a frozen branch', async () => {
      scene.repo.createChange('a', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);

      composeGit().pushBranch({
        remote: 'origin',
        branchName: 'a',
        noVerify: false,
        forcePush: false,
      });

      scene.repo.runCliCommand([`branch`, `freeze`]);
      scene.repo.runCliCommand([`branch`, `unfreeze`]);

      // Go to main before deleting
      scene.repo.checkoutBranch('main');

      // Should not throw after unfreezing
      scene.repo.runCliCommand([`branch`, `delete`, `a`, `--force`]);
    });

    it('Can override frozen status with --force flag', async () => {
      scene.repo.createChange('a', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);

      composeGit().pushBranch({
        remote: 'origin',
        branchName: 'a',
        noVerify: false,
        forcePush: false,
      });

      scene.repo.runCliCommand([`branch`, `freeze`]);

      // Go to main before deleting
      scene.repo.checkoutBranch('main');

      // Should throw without --force (frozen)
      expect(() =>
        scene.repo.runCliCommand([`branch`, `delete`, `a`])
      ).toThrow();

      // Should succeed with --force
      scene.repo.runCliCommand([`branch`, `delete`, `a`, `--force`]);
    });

    it("Can't freeze trunk", () => {
      expect(() =>
        scene.repo.runCliCommand([`branch`, `freeze`, `main`])
      ).toThrow();
    });

    it('Frozen status persists across CLI invocations', async () => {
      scene.repo.createChange('a', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);

      composeGit().pushBranch({
        remote: 'origin',
        branchName: 'a',
        noVerify: false,
        forcePush: false,
      });

      scene.repo.runCliCommand([`branch`, `freeze`]);

      // Run a different command to force cache reload
      scene.repo.runCliCommand([`log`, `short`]);

      // Verify branch is still frozen
      expect(() => scene.repo.runCliCommand([`branch`, `delete`])).toThrow();
    });
  });
}
