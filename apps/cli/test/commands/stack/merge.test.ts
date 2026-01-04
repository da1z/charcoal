import { describe, it, expect } from 'bun:test';
import {
  readMetadataRef,
  writeMetadataRef,
} from '../../../src/lib/engine/metadata_ref';
import { allScenes } from '../../lib/scenes/all_scenes';
import { configureTest } from '../../lib/utils/configure_test';

for (const scene of allScenes) {
  describe(`(${scene}): stack merge`, () => {
    configureTest(scene);

    it('Fails when run from trunk', () => {
      expect(() => scene.repo.runCliCommand([`stack`, `merge`])).toThrow(
        /Cannot merge stack from trunk/
      );
    });

    it('Fails when branch has no PR', () => {
      scene.repo.createChange('2', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `2`]);

      expect(() => scene.repo.runCliCommand([`stack`, `merge`])).toThrow(
        /does not have an associated PR/
      );
    });

    it('Fails when --until branch is not in stack', () => {
      scene.repo.createChange('2', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `2`]);

      // Set up PR info so we get past the PR check
      writeMetadataRef(
        'a',
        {
          ...readMetadataRef('a', scene.dir),
          prInfo: { number: 1, state: 'OPEN', reviewDecision: 'APPROVED' },
        },
        scene.dir
      );

      expect(() =>
        scene.repo.runCliCommand([`stack`, `merge`, `--until`, `nonexistent`])
      ).toThrow(/is not in the current stack/);
    });

    it('Stops at frozen branch with warning', () => {
      scene.repo.createChange('2', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `2`]);

      scene.repo.createChange('3', 'b');
      scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `3`]);

      // Set up PR info for branch a and mark it as frozen
      writeMetadataRef(
        'a',
        {
          ...readMetadataRef('a', scene.dir),
          prInfo: { number: 1, state: 'OPEN', reviewDecision: 'APPROVED' },
          frozen: true,
        },
        scene.dir
      );

      // Set up PR info for branch b
      writeMetadataRef(
        'b',
        {
          ...readMetadataRef('b', scene.dir),
          prInfo: { number: 2, state: 'OPEN', reviewDecision: 'APPROVED' },
        },
        scene.dir
      );

      // Should not throw - it stops at frozen branch gracefully
      // But since there are no branches to merge (first one is frozen),
      // it will output "No branches to merge"
      const output = scene.repo.runCliCommandAndGetOutput([
        `stack`,
        `merge`,
        `--dry-run`,
      ]);
      expect(output).toContain('Stopped at frozen branch');
    });

    it('Dry run shows PRs that would be merged', () => {
      scene.repo.createChange('2', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `2`]);

      scene.repo.createChange('3', 'b');
      scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `3`]);

      // Set up PR info for both branches
      writeMetadataRef(
        'a',
        {
          ...readMetadataRef('a', scene.dir),
          prInfo: { number: 101, state: 'OPEN', reviewDecision: 'APPROVED' },
        },
        scene.dir
      );

      writeMetadataRef(
        'b',
        {
          ...readMetadataRef('b', scene.dir),
          prInfo: { number: 102, state: 'OPEN', reviewDecision: 'APPROVED' },
        },
        scene.dir
      );

      const output = scene.repo.runCliCommandAndGetOutput([
        `stack`,
        `merge`,
        `--dry-run`,
      ]);

      expect(output).toContain('Would merge the following PRs');
      expect(output).toContain('PR #101');
      expect(output).toContain('PR #102');
    });

    it('Dry run with --until only shows PRs up to that branch', () => {
      scene.repo.createChange('2', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `2`]);

      scene.repo.createChange('3', 'b');
      scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `3`]);

      scene.repo.createChange('4', 'c');
      scene.repo.runCliCommand([`branch`, `create`, `c`, `-m`, `4`]);

      // Set up PR info for all branches
      writeMetadataRef(
        'a',
        {
          ...readMetadataRef('a', scene.dir),
          prInfo: { number: 101, state: 'OPEN', reviewDecision: 'APPROVED' },
        },
        scene.dir
      );

      writeMetadataRef(
        'b',
        {
          ...readMetadataRef('b', scene.dir),
          prInfo: { number: 102, state: 'OPEN', reviewDecision: 'APPROVED' },
        },
        scene.dir
      );

      writeMetadataRef(
        'c',
        {
          ...readMetadataRef('c', scene.dir),
          prInfo: { number: 103, state: 'OPEN', reviewDecision: 'APPROVED' },
        },
        scene.dir
      );

      const output = scene.repo.runCliCommandAndGetOutput([
        `stack`,
        `merge`,
        `--dry-run`,
        `--until`,
        `b`,
      ]);

      expect(output).toContain('Would merge the following PRs');
      expect(output).toContain('PR #101');
      expect(output).toContain('PR #102');
      expect(output).not.toContain('PR #103');
    });

    it('Skips already merged PRs in dry run', () => {
      scene.repo.createChange('2', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `2`]);

      scene.repo.createChange('3', 'b');
      scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `3`]);

      // Set up PR info - a is already merged
      writeMetadataRef(
        'a',
        {
          ...readMetadataRef('a', scene.dir),
          prInfo: { number: 101, state: 'MERGED', reviewDecision: 'APPROVED' },
        },
        scene.dir
      );

      writeMetadataRef(
        'b',
        {
          ...readMetadataRef('b', scene.dir),
          prInfo: { number: 102, state: 'OPEN', reviewDecision: 'APPROVED' },
        },
        scene.dir
      );

      const output = scene.repo.runCliCommandAndGetOutput([
        `stack`,
        `merge`,
        `--dry-run`,
      ]);

      expect(output).toContain('Would merge the following PRs');
      expect(output).not.toContain('PR #101');
      expect(output).toContain('PR #102');
    });

    it('Reports when all PRs are already merged', () => {
      scene.repo.createChange('2', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `2`]);

      // Set up PR info - already merged
      writeMetadataRef(
        'a',
        {
          ...readMetadataRef('a', scene.dir),
          prInfo: { number: 101, state: 'MERGED', reviewDecision: 'APPROVED' },
        },
        scene.dir
      );

      const output = scene.repo.runCliCommandAndGetOutput([
        `stack`,
        `merge`,
        `--dry-run`,
      ]);

      expect(output).toContain('All PRs in the stack are already merged');
    });

    it('Works with the m alias', () => {
      scene.repo.createChange('2', 'a');
      scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `2`]);

      // Set up PR info
      writeMetadataRef(
        'a',
        {
          ...readMetadataRef('a', scene.dir),
          prInfo: { number: 101, state: 'OPEN', reviewDecision: 'APPROVED' },
        },
        scene.dir
      );

      const output = scene.repo.runCliCommandAndGetOutput([
        `stack`,
        `m`,
        `--dry-run`,
      ]);

      expect(output).toContain('Would merge the following PRs');
    });
  });
}
