import type { Argv } from "yargs";

// Import all subcommands explicitly (required for ESM/bundling)
import * as amendCmd from "./commit-commands/amend";
import * as createCmd from "./commit-commands/create";
export const command = "commit <command>";
export const desc =
	"Commands that operate on commits. Run `pk commit --help` to learn more.";
export const aliases = ["c"];
export const builder = (yargs: Argv): Argv => {
	// biome-ignore lint/suspicious/noExplicitAny: yargs command types are complex
	const cmds: any[] = [amendCmd, createCmd];
	let y = yargs;
	for (const cmd of cmds) {
		y = y.command(cmd);
	}
	return y.strict().demandCommand();
};
