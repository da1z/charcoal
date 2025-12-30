import chalk from 'chalk';
import { TContext } from '../lib/context';
import { ExitFailedError } from '../lib/errors';

export function assertBranchNotFrozen(
  opts: {
    branchName: string;
    operation: string;
    force: boolean | undefined;
  },
  context: TContext
): void {
  if (!context.engine.isBranchFrozen(opts.branchName)) {
    return;
  }

  if (opts.force) {
    context.splog.warn(
      `Overriding frozen status of ${chalk.yellow(
        opts.branchName
      )} with --force.`
    );
    return;
  }

  throw new ExitFailedError(
    [
      `Cannot ${opts.operation} frozen branch ${chalk.yellow(
        opts.branchName
      )}.`,
      `Use ${chalk.cyan('gt branch unfreeze')} to unfreeze it, ` +
        `or use ${chalk.cyan('--force')} to override.`,
    ].join('\n')
  );
}
