import type { Argv } from "yargs";

// Import all subcommands explicitly (required for ESM/bundling)
import * as debug_contextCmd from "./feedback-commands/debug_context";
export const command = "feedback <command>";
export const desc = "Commands for providing feedback and debug state.";

export const builder = (yargs: Argv): Argv => {
	// biome-ignore lint/suspicious/noExplicitAny: yargs command types are complex
	const cmds: any[] = [debug_contextCmd];
	let y = yargs;
	for (const cmd of cmds) {
		y = y.command(cmd);
	}
	return y.strict().demandCommand();
};
