import { expect } from 'bun:test';
import type { GitRepo } from './git_repo';
export function expectCommits(repo: GitRepo, commitMessages: string): void {
  expect(
    repo
      .listCurrentBranchCommitMessages()
      .slice(0, commitMessages.split(',').length)
      .join(', ')
  ).toBe(commitMessages);
}
