import { describe, it, expect } from 'bun:test';
import { BasicScene } from '../lib/scenes/basic_scene';
import { configureTest } from '../lib/utils/configure_test';

for (const scene of [new BasicScene()]) {
  describe(`(${scene}): two letter shortcuts`, () => {
    configureTest(scene);

    it("Can run 'bd' shortcut command", () => {
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);
      scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `b`]);
      expect(() => scene.repo.runCliCommand(['bd'])).not.toThrow();
    });
  });
}
