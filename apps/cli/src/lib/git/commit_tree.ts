import { getSha } from "./get_sha";
import { runGitCommand, runGitCommandAndSplitLines } from "./runner";

export function getCommitTree(branchNames: string[]): Record<string, string[]> {
	const parentOfMergeBase = getSha(
		`${runGitCommand({
			args: [`merge-base`, `--octopus`, ...branchNames],
			onError: "ignore",
			resource: "parentOfMergeBase",
		})}~`,
	);
	const ret: Record<string, string[]> = {};
	const lines = runGitCommandAndSplitLines({
		args: [
			`rev-list`,
			`--parents`,
			...(parentOfMergeBase
				? [`^${parentOfMergeBase}`, ...branchNames]
				: [`--all`]),
			"--",
		],
		onError: "throw",
		resource: "getCommitTree",
	}).map((l) => l.split(" "));
	for (const l of lines) {
		ret[l[0]] = l.slice(1);
	}
	return ret;
}
