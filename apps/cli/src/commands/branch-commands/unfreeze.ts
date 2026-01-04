import type { Arguments, InferredOptionTypes } from 'yargs';
import { unfreezeBranchAction } from '../../actions/unfreeze_branch';
import { graphite } from '../../lib/runner';

const args = {
  branch: {
    type: 'string',
    positional: true,
    demandOption: false,
    describe: 'The name of the branch to unfreeze. Defaults to current branch.',
    hidden: true,
  },
} as const;
type argsT = Arguments<InferredOptionTypes<typeof args>>;

export const command = 'unfreeze [branch]';
export const canonical = 'branch unfreeze';
export const aliases = ['uf'];
export const description = 'Remove the frozen status from a branch.';
export const builder = args;
export const handler = async (argv: argsT): Promise<void> =>
  graphite(argv, canonical, async (context) =>
    unfreezeBranchAction({ branchName: argv.branch }, context)
  );
