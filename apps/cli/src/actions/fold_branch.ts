import chalk from 'chalk';
import { TContext } from '../lib/context';
import { SCOPE } from '../lib/engine/scope_spec';
import { assertBranchNotFrozen } from './assert_not_frozen';
import { restackBranches } from './restack';

export function foldCurrentBranch(
  args: { keep: boolean; force?: boolean },
  context: TContext
): void {
  const currentBranchName = context.engine.currentBranchPrecondition;
  const parentBranchName =
    context.engine.getParentPrecondition(currentBranchName);

  // Check frozen status on both branches since one will be deleted
  assertBranchNotFrozen(
    { branchName: currentBranchName, operation: 'fold', force: args.force },
    context
  );
  assertBranchNotFrozen(
    { branchName: parentBranchName, operation: 'fold into', force: args.force },
    context
  );

  context.engine.foldCurrentBranch(args.keep);
  if (args.keep) {
    context.splog.info(
      `Folded ${chalk.green(currentBranchName)} into ${chalk.blueBright(
        parentBranchName
      )}.`
    );
  } else {
    context.splog.info(
      `Folded ${chalk.blueBright(currentBranchName)} into ${chalk.green(
        parentBranchName
      )}.`
    );
    context.splog.tip(
      `To keep the name of the current branch, use the \`--keep\` flag.`
    );
  }
  restackBranches(
    context.engine.getRelativeStack(
      context.engine.currentBranchPrecondition,
      SCOPE.UPSTACK_EXCLUSIVE
    ),
    context
  );
}
