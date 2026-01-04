import type { Argv } from 'yargs';

// Import all subcommands explicitly (required for ESM/bundling)
import * as bottomCmd from './branch-commands/bottom';
import * as checkoutCmd from './branch-commands/checkout';
import * as createCmd from './branch-commands/create';
import * as deleteCmd from './branch-commands/delete';
import * as downCmd from './branch-commands/down';
import * as editCmd from './branch-commands/edit';
import * as foldCmd from './branch-commands/fold';
import * as freezeCmd from './branch-commands/freeze';
import * as infoCmd from './branch-commands/info';
import * as renameCmd from './branch-commands/rename';
import * as restackCmd from './branch-commands/restack';
import * as splitCmd from './branch-commands/split';
import * as squashCmd from './branch-commands/squash';
import * as submitCmd from './branch-commands/submit';
import * as topCmd from './branch-commands/top';
import * as trackCmd from './branch-commands/track';
import * as unbranchCmd from './branch-commands/unbranch';
import * as unfreezeCmd from './branch-commands/unfreeze';
import * as untrackCmd from './branch-commands/untrack';
import * as upCmd from './branch-commands/up';
export const command = 'branch <command>';
export const desc =
  'Commands that operate on your current branch. Run `pk branch --help` to learn more.';
export const aliases = ['b'];
export const builder = function (yargs: Argv): Argv {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cmds: any[] = [
    bottomCmd,
    checkoutCmd,
    createCmd,
    deleteCmd,
    downCmd,
    editCmd,
    foldCmd,
    freezeCmd,
    infoCmd,
    renameCmd,
    restackCmd,
    splitCmd,
    squashCmd,
    submitCmd,
    topCmd,
    trackCmd,
    unbranchCmd,
    unfreezeCmd,
    untrackCmd,
    upCmd,
  ];
  let y = yargs;
  for (const cmd of cmds) {
    y = y.command(cmd);
  }
  return y.strict().demandCommand();
};
