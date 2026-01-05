import type { Argv } from "yargs";

// Import all subcommands explicitly (required for ESM/bundling)
import * as mergeCmd from "./stack-commands/merge";
import * as restackCmd from "./stack-commands/restack";
import * as submitCmd from "./stack-commands/submit";
import * as testCmd from "./stack-commands/test";
export const command = "stack <command>";
export const desc =
	"Commands that operate on your current stack of branches. Run `pk stack --help` to learn more.";
export const aliases = ["s"];
export const builder = (yargs: Argv): Argv => {
	// biome-ignore lint/suspicious/noExplicitAny: yargs command types are complex
	const cmds: any[] = [mergeCmd, restackCmd, submitCmd, testCmd];
	let y = yargs;
	for (const cmd of cmds) {
		y = y.command(cmd);
	}
	return y.strict().demandCommand();
};
