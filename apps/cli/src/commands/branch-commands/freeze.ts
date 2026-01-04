import type { Arguments, InferredOptionTypes } from 'yargs';
import { freezeBranchAction } from '../../actions/freeze_branch';
import { graphite } from '../../lib/runner';

const args = {
  branch: {
    type: 'string',
    positional: true,
    demandOption: false,
    describe: 'The name of the branch to freeze. Defaults to current branch.',
    hidden: true,
  },
} as const;
type argsT = Arguments<InferredOptionTypes<typeof args>>;

export const command = 'freeze [branch]';
export const canonical = 'branch freeze';
export const aliases = ['fz'];
export const description =
  'Mark a branch as frozen to prevent accidental modifications.';
export const builder = args;
export const handler = async (argv: argsT): Promise<void> =>
  graphite(argv, canonical, async (context) =>
    freezeBranchAction({ branchName: argv.branch }, context)
  );
