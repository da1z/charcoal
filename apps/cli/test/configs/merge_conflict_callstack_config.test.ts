import { describe, it, expect } from 'bun:test';
import fs from 'node:fs';
import { BasicScene } from '../lib/scenes/basic_scene';
import { configureTest } from '../lib/utils/configure_test';

for (const scene of [new BasicScene()]) {
  describe(`merge conflict callstack config test`, () => {
    configureTest(scene);

    it('Can silently clean up invalid config', () => {
      // should work fine.
      expect(() => scene.repo.runCliCommand([`log`, `short`])).not.toThrow();
      // write an invalid config
      fs.writeFileSync(
        `${scene.repo.dir}/.git/.graphite_merge_conflict`,
        'abc'
      );
      // Should still not error
      expect(() => scene.repo.runCliCommand([`log`, `short`])).not.toThrow();
    });
  });
}
