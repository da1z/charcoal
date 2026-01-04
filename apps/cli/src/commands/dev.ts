import type { Argv } from 'yargs';

// Import all subcommands explicitly (required for ESM/bundling)
import * as cacheCmd from './dev-commands/cache';
import * as metaCmd from './dev-commands/meta';
export const command = 'dev <command>';
export const description = false;

export const builder = function (yargs: Argv): Argv {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cmds: any[] = [cacheCmd, metaCmd];
  let y = yargs;
  for (const cmd of cmds) {
    y = y.command(cmd);
  }
  return y.strict().demandCommand();
};
