import { beforeEach, afterEach } from 'bun:test';
import type { AbstractScene } from '../scenes/abstract_scene';

export function configureTest(scene: AbstractScene): void {
  beforeEach(() => scene.setup());
  afterEach(() => scene.cleanup());
}
