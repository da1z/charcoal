import { runGitCommandAndSplitLines } from "./runner";

export function getBranchNamesAndRevisions(): Record<string, string> {
	const branches: Record<string, string> = {};

	const lines = runGitCommandAndSplitLines({
		args: [
			`for-each-ref`,
			`--format=%(refname:short):%(objectname)`,
			`--sort=-committerdate`,
			`refs/heads/`,
		],
		onError: "throw",
		resource: "getBranchNamesAndRevisions",
	})
		.map((line) => line.split(":"))
		.filter(
			(lineSplit): lineSplit is [string, string] =>
				lineSplit.length === 2 && lineSplit.every((s) => s.length > 0),
		);
	for (const [branchName, sha] of lines) {
		branches[branchName] = sha;
	}

	return branches;
}
