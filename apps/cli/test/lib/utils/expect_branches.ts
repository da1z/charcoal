import { expect } from "bun:test";
import { execSync } from "node:child_process";
import type { GitRepo } from "./git_repo";

export function expectBranches(repo: GitRepo, sortedBranches: string): void {
	expect(
		execSync(
			`git -C "${repo.dir}" for-each-ref refs/heads/ "--format=%(refname:short)"`,
		)
			.toString()
			.trim()
			.split("\n")
			.filter((b) => b !== "prod") // scene related branch
			.filter((b) => b !== "x2") // scene related branch

			.sort()
			.join(", "),
	).toBe(sortedBranches);
}
