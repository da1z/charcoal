import chalk from "chalk";
import type { TContext } from "../lib/context";
import { ExitFailedError } from "../lib/errors";

export async function freezeBranchAction(
	args: { branchName?: string },
	context: TContext,
): Promise<void> {
	const branchName =
		args.branchName ?? context.engine.currentBranchPrecondition;

	if (context.engine.isTrunk(branchName)) {
		throw new ExitFailedError("Cannot freeze trunk!");
	}

	if (!context.engine.isBranchTracked(branchName)) {
		throw new ExitFailedError(
			`Cannot freeze untracked branch ${chalk.yellow(branchName)}.`,
		);
	}

	await context.engine.populateRemoteShas();
	if (!context.engine.branchExistsOnRemote(branchName)) {
		throw new ExitFailedError(
			[
				`Cannot freeze branch ${chalk.yellow(
					branchName,
				)} - it has not been pushed to remote yet.`,
				`Freezing is intended for branches in collaborative workflows that exist on remote.`,
				`Use ${chalk.cyan("pk stack submit")} or ${chalk.cyan(
					"pk branch submit",
				)} to push first.`,
			].join("\n"),
		);
	}

	if (context.engine.isBranchFrozen(branchName)) {
		context.splog.info(`Branch ${chalk.cyan(branchName)} is already frozen.`);
		return;
	}

	context.engine.freezeBranch(branchName);
	context.splog.info(`Froze branch ${chalk.cyan(branchName)}.`);
	context.splog.tip(
		`Frozen branches cannot be restacked, pushed, deleted, renamed, folded, or squashed without --force.`,
	);
}
