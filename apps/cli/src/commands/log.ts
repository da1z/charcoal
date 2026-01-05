import type { Argv } from "yargs";

// Import all subcommands explicitly (required for ESM/bundling)
import * as defaultCmd from "./log-commands/default";
import * as longCmd from "./log-commands/long";
import * as shortCmd from "./log-commands/short";
export const command = "log <command>";
export const desc = "Commands that log your stacks.";

export const aliases = ["l"];
export const builder = (yargs: Argv): Argv => {
	// biome-ignore lint/suspicious/noExplicitAny: yargs command types are complex
	const cmds: any[] = [defaultCmd, longCmd, shortCmd];
	let y = yargs;
	for (const cmd of cmds) {
		y = y.command(cmd);
	}
	return y.strict().demandCommand();
};
