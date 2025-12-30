import yargs from 'yargs';
import { restackBranches } from '../../actions/restack';
import { SCOPE } from '../../lib/engine/scope_spec';
import { graphite } from '../../lib/runner';

const args = {
  force: {
    describe: `Override frozen status of branches.`,
    demandOption: false,
    type: 'boolean',
    alias: 'f',
    default: false,
  },
} as const;
type argsT = yargs.Arguments<yargs.InferredOptionTypes<typeof args>>;

export const aliases = ['r', 'fix'];
export const command = 'restack';
export const canonical = 'upstack restack';
export const description =
  'Ensure the current branch and each of its descendants is based on its parent, rebasing if necessary.';
export const builder = args;
export const handler = async (argv: argsT): Promise<void> =>
  graphite(argv, canonical, async (context) =>
    restackBranches(
      context.engine.getRelativeStack(
        context.engine.currentBranchPrecondition,
        SCOPE.UPSTACK
      ),
      context,
      { force: argv.force }
    )
  );
