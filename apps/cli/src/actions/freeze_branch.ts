import chalk from 'chalk';
import { TContext } from '../lib/context';
import { ExitFailedError } from '../lib/errors';

export function freezeBranchAction(
  args: { branchName?: string },
  context: TContext
): void {
  const branchName =
    args.branchName ?? context.engine.currentBranchPrecondition;

  if (context.engine.isTrunk(branchName)) {
    throw new ExitFailedError('Cannot freeze trunk!');
  }

  if (!context.engine.isBranchTracked(branchName)) {
    throw new ExitFailedError(
      `Cannot freeze untracked branch ${chalk.yellow(branchName)}.`
    );
  }

  const prInfo = context.engine.getPrInfo(branchName);
  if (!prInfo?.number) {
    throw new ExitFailedError(
      [
        `Cannot freeze branch ${chalk.yellow(
          branchName
        )} - it has not been submitted yet.`,
        `Freezing is intended for branches in collaborative workflows that have been pushed to remote.`,
        `Use ${chalk.cyan('gt stack submit')} or ${chalk.cyan(
          'gt branch submit'
        )} first.`,
      ].join('\n')
    );
  }

  if (context.engine.isBranchFrozen(branchName)) {
    context.splog.info(`Branch ${chalk.cyan(branchName)} is already frozen.`);
    return;
  }

  context.engine.freezeBranch(branchName);
  context.splog.info(`Froze branch ${chalk.cyan(branchName)}.`);
  context.splog.tip(
    `Frozen branches cannot be restacked, pushed, deleted, renamed, folded, or squashed without --force.`
  );
}
