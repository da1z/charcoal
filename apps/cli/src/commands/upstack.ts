import type { Argv } from "yargs";

// Import all subcommands explicitly (required for ESM/bundling)
import * as ontoCmd from "./upstack-commands/onto";
import * as restackCmd from "./upstack-commands/restack";
import * as submitCmd from "./upstack-commands/submit";
import * as testCmd from "./upstack-commands/test";
export const command = "upstack <command>";
export const desc =
	"Commands that operate on a branch and its descendants. Run `pk upstack --help` to learn more.";
export const aliases = ["us"];
export const builder = (yargs: Argv): Argv => {
	// biome-ignore lint/suspicious/noExplicitAny: yargs command types are complex
	const cmds: any[] = [ontoCmd, restackCmd, submitCmd, testCmd];
	let y = yargs;
	for (const cmd of cmds) {
		y = y.command(cmd);
	}
	return y.strict().demandCommand();
};
