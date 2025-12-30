import { TContext } from '../lib/context';
import { SCOPE } from '../lib/engine/scope_spec';
import { TCommitOpts } from '../lib/git/commit';
import { assertBranchNotFrozen } from './assert_not_frozen';
import { restackBranches } from './restack';

export function squashCurrentBranch(
  opts: Pick<TCommitOpts, 'message' | 'noEdit'> & { force?: boolean },
  context: TContext
): void {
  const branchName = context.engine.currentBranchPrecondition;
  assertBranchNotFrozen(
    { branchName, operation: 'squash', force: opts.force },
    context
  );

  context.engine.squashCurrentBranch({
    noEdit: opts.noEdit,
    message: opts.message,
  });
  restackBranches(
    context.engine.getRelativeStack(
      context.engine.currentBranchPrecondition,
      SCOPE.UPSTACK_EXCLUSIVE
    ),
    context
  );
}
