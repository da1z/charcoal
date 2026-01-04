import type { Argv } from 'yargs';

// Import all subcommands explicitly (required for ESM/bundling)
import * as debug_contextCmd from './feedback-commands/debug_context';
export const command = 'feedback <command>';
export const desc = 'Commands for providing feedback and debug state.';

export const builder = function (yargs: Argv): Argv {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cmds: any[] = [debug_contextCmd];
  let y = yargs;
  for (const cmd of cmds) {
    y = y.command(cmd);
  }
  return y.strict().demandCommand();
};
