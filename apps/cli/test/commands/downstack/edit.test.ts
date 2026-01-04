import { describe, it, expect } from 'bun:test';
import fs from 'node:fs';
import path from 'path';
import { performInTmpDir } from '../../../src/lib/utils/perform_in_tmp_dir';
import { BasicScene } from '../../lib/scenes/basic_scene';
import { configureTest } from '../../lib/utils/configure_test';
import { expectCommits } from '../../lib/utils/expect_commits';

function createStackEditsInput(opts: {
  dirPath: string;
  orderedBranches: string[];
}): string {
  const contents = opts.orderedBranches.join('\n');
  const filePath = path.join(opts.dirPath, 'edits.txt');
  fs.writeFileSync(filePath, contents);
  return filePath;
}

for (const scene of [new BasicScene()]) {
  describe(`(${scene}): downstack edit`, () => {
    configureTest(scene);

    it('Can make a no-op downstack edit without conflict or error', () => {
      scene.repo.createChange('2', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `2`]);
      scene.repo.createChange('3', 'b');
      scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `3`]);

      performInTmpDir((dirPath) => {
        const inputPath = createStackEditsInput({
          dirPath,
          orderedBranches: ['b', 'a'],
        });
        expect(() =>
          scene.repo.runCliCommand([`downstack`, `edit`, `--input`, inputPath])
        ).not.toThrow();
        expect(scene.repo.rebaseInProgress()).toBe(false);
      });
    });

    it('Can can resolve a conflict and continue', () => {
      scene.repo.createChange('2', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `2`]);
      scene.repo.createChange('3', 'a'); // change the same file with a new value.
      scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `3`]);

      performInTmpDir((dirPath) => {
        const inputPath = createStackEditsInput({
          dirPath,
          orderedBranches: ['a', 'b'], // reverse the order
        });
        expect(() =>
          scene.repo.runCliCommand([`downstack`, `edit`, `--input`, inputPath])
        ).toThrow(Error);
        expect(scene.repo.rebaseInProgress()).toBe(true);

        scene.repo.resolveMergeConflicts();
        scene.repo.markMergeConflictsAsResolved();

        expect(() => scene.repo.runCliCommand(['continue'])).toThrow();
        expect(scene.repo.rebaseInProgress()).toBe(true);

        scene.repo.resolveMergeConflicts();
        scene.repo.markMergeConflictsAsResolved();
        scene.repo.runCliCommand(['continue']);
        expectCommits(scene.repo, '2, 3, 1');
      });
    });
  });
}
