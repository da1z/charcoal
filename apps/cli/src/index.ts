#!/usr/bin/env node
/* eslint-disable no-console */

import chalk from "chalk";
import tmp from "tmp";
import yargs from "yargs";
// Import all commands explicitly (required for bundling)
import * as branchCmd from "./commands/branch";
import * as commitCmd from "./commands/commit";
import * as continueCmd from "./commands/continue";
import * as devCmd from "./commands/dev";
import * as downstackCmd from "./commands/downstack";
import * as feedbackCmd from "./commands/feedback";
import * as fishCmd from "./commands/fish";
import * as logCmd from "./commands/log";
import * as repoCmd from "./commands/repo";
import * as stackCmd from "./commands/stack";
import * as upstackCmd from "./commands/upstack";
import * as userCmd from "./commands/user";
import { globalArgumentsOptions } from "./lib/global_arguments";
import { getYargsInput } from "./lib/pre-yargs/preprocess_command";

// this line gets rid of warnings about "experimental fetch API" for our users
// while still showing us warnings when we test with DEBUG=1
if (!process.env.DEBUG) {
	process.removeAllListeners("warning");
}

// https://www.npmjs.com/package/tmp#graceful-cleanup
tmp.setGracefulCleanup();

process.on("uncaughtException", (err) => {
	console.log(chalk.redBright(`UNCAUGHT EXCEPTION: ${err.message}`));
	console.log(chalk.redBright(`UNCAUGHT EXCEPTION: ${err.stack}`));
	// eslint-disable-next-line no-restricted-syntax
	process.exit(1);
});

// biome-ignore lint/suspicious/noExplicitAny: yargs command types are complex
const commands: any[] = [
	branchCmd,
	commitCmd,
	continueCmd,
	devCmd,
	downstackCmd,
	feedbackCmd,
	fishCmd,
	logCmd,
	repoCmd,
	stackCmd,
	upstackCmd,
	userCmd,
];

let cli = yargs(getYargsInput());
for (const cmd of commands) {
	cli = cli.command(cmd);
}
void cli
	.help()
	.usage(
		"Pancake is a command line tool that makes working with stacked changes fast & intuitive.\n\nhttps://docs.graphite.dev/guides/graphite-cli",
	)
	.options(globalArgumentsOptions)
	.global(Object.keys(globalArgumentsOptions))
	.strict()
	.demandCommand().argv;
