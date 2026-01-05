import type { Argv } from "yargs";

// Import all subcommands explicitly (required for ESM/bundling)
import * as branch_dateCmd from "./user-commands/branch_date";
import * as branch_prefixCmd from "./user-commands/branch_prefix";
import * as branch_replacementCmd from "./user-commands/branch_replacement";
import * as editorCmd from "./user-commands/editor";
import * as pagerCmd from "./user-commands/pager";
import * as restack_dateCmd from "./user-commands/restack_date";
import * as submit_bodyCmd from "./user-commands/submit_body";
import * as tipsCmd from "./user-commands/tips";
export const command = "user <command>";
export const desc =
	"Read or write Pancake's user configuration settings. Run `pk user --help` to learn more.";
export const builder = (yargs: Argv): Argv => {
	// biome-ignore lint/suspicious/noExplicitAny: yargs command types are complex
	const cmds: any[] = [
		branch_dateCmd,
		branch_prefixCmd,
		branch_replacementCmd,
		editorCmd,
		pagerCmd,
		restack_dateCmd,
		submit_bodyCmd,
		tipsCmd,
	];
	let y = yargs;
	for (const cmd of cmds) {
		y = y.command(cmd);
	}
	return y.strict().demandCommand();
};
