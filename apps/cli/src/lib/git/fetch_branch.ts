import { getShaOrThrow } from "./get_sha";
import { runGitCommand } from "./runner";

const FETCH_HEAD = "refs/pk-metadata/FETCH_HEAD";
const FETCH_BASE = "refs/pk-metadata/FETCH_BASE";
export function fetchBranch(remote: string, branchName: string): void {
	runGitCommand({
		args: [
			`fetch`,
			`--no-write-fetch-head`,
			`-f`,
			remote,
			`${branchName}:${FETCH_HEAD}`,
		],
		options: { stdio: "pipe" },
		onError: "throw",
		resource: "fetchBranch",
	});
}
export function readFetchHead(): string {
	return getShaOrThrow(FETCH_HEAD);
}

export function readFetchBase(): string {
	return getShaOrThrow(FETCH_BASE);
}

export function writeFetchBase(sha: string): void {
	runGitCommand({
		args: [`update-ref`, FETCH_BASE, sha],
		options: { stdio: "pipe" },
		onError: "throw",
		resource: "writeFetchBase",
	});
}
