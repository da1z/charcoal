import type { Argv } from 'yargs';

// Import all subcommands explicitly (required for ESM/bundling)
import * as repo_disable_githubCmd from './repo-commands/repo_disable_github';
import * as repo_initCmd from './repo-commands/repo_init';
import * as repo_nameCmd from './repo-commands/repo_name';
import * as repo_ownerCmd from './repo-commands/repo_owner';
import * as repo_pr_templatesCmd from './repo-commands/repo_pr_templates';
import * as repo_remoteCmd from './repo-commands/repo_remote';
import * as repo_syncCmd from './repo-commands/repo_sync';
export const command = 'repo <command>';
export const desc =
  "Read or write Pancake's configuration settings for the current repo. Run `pk repo --help` to learn more.";
export const aliases = ['r'];
export const builder = function (yargs: Argv): Argv {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cmds: any[] = [
    repo_disable_githubCmd,
    repo_initCmd,
    repo_nameCmd,
    repo_ownerCmd,
    repo_pr_templatesCmd,
    repo_remoteCmd,
    repo_syncCmd,
  ];
  let y = yargs;
  for (const cmd of cmds) {
    y = y.command(cmd);
  }
  return y.strict().demandCommand();
};
