import { describe, it, expect } from 'bun:test';
import fs from 'node:fs';
import { removeSync } from '../../../src/lib/utils/fs_utils';
import { TrailingProdScene } from '../../lib/scenes/trailing_prod_scene';
import { configureTest } from '../../lib/utils/configure_test';

for (const scene of [new TrailingProdScene()]) {
  describe(`(${scene}): repo init`, () => {
    configureTest(scene);

    it('Can run repo init', () => {
      const repoConfigPath = `${scene.repo.dir}/.git/.graphite_repo_config`;
      removeSync(repoConfigPath);
      scene.repo.runCliCommand([`repo`, `init`, `--trunk`, `main`]);
      const savedConfig = JSON.parse(
        fs.readFileSync(repoConfigPath).toString()
      );
      expect(savedConfig['trunk']).toBe('main');
    });

    it('Falls back to main if non-existent branch is passed in', () => {
      const repoConfigPath = `${scene.repo.dir}/.git/.graphite_repo_config`;
      scene.repo.runCliCommand([
        `repo`,
        `init`,
        `--trunk`,
        `random`,
        `--no-interactive`,
      ]);
      const savedConfig = JSON.parse(
        fs.readFileSync(repoConfigPath).toString()
      );
      expect(savedConfig['trunk']).toBe('main');
    });

    it('Cannot set an invalid trunk if trunk cannot be inferred', () => {
      scene.repo.runGitCommand([`branch`, `-m`, `main2`]);
      expect(() =>
        scene.repo.runCliCommand([
          `repo`,
          `init`,
          `--trunk`,
          `random`,
          `--no-interactive`,
        ])
      ).toThrow(Error);
    });
  });
}
