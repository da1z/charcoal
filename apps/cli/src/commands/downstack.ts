import type { Argv } from 'yargs';

// Import all subcommands explicitly (required for ESM/bundling)
import * as editCmd from './downstack-commands/edit';
import * as getCmd from './downstack-commands/get';
import * as restackCmd from './downstack-commands/restack';
import * as submitCmd from './downstack-commands/submit';
import * as testCmd from './downstack-commands/test';
import * as trackCmd from './downstack-commands/track';
export const command = 'downstack <command>';
export const desc =
  'Commands that operate on a branch and its ancestors. Run `pk downstack --help` to learn more.';
export const aliases = ['ds'];
export const builder = function (yargs: Argv): Argv {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cmds: any[] = [
    editCmd,
    getCmd,
    restackCmd,
    submitCmd,
    testCmd,
    trackCmd,
  ];
  let y = yargs;
  for (const cmd of cmds) {
    y = y.command(cmd);
  }
  return y.strict().demandCommand();
};
