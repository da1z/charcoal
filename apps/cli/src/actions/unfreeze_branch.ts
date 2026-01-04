import chalk from 'chalk';
import type { TContext } from '../lib/context';
import { ExitFailedError } from '../lib/errors';

export function unfreezeBranchAction(
  args: { branchName?: string },
  context: TContext
): void {
  const branchName =
    args.branchName ?? context.engine.currentBranchPrecondition;

  if (context.engine.isTrunk(branchName)) {
    throw new ExitFailedError('Cannot unfreeze trunk!');
  }

  if (!context.engine.isBranchTracked(branchName)) {
    throw new ExitFailedError(
      `Cannot unfreeze untracked branch ${chalk.yellow(branchName)}.`
    );
  }

  if (!context.engine.isBranchFrozen(branchName)) {
    context.splog.info(`Branch ${chalk.cyan(branchName)} is not frozen.`);
    return;
  }

  context.engine.unfreezeBranch(branchName);
  context.splog.info(`Unfroze branch ${chalk.cyan(branchName)}.`);
}
