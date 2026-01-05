import { describe, expect, it } from "bun:test";
import { allScenes } from "../../lib/scenes/all_scenes";
import { configureTest } from "../../lib/utils/configure_test";
import { expectCommits } from "../../lib/utils/expect_commits";

for (const scene of allScenes) {
	// eslint-disable-next-line max-lines-per-function
	describe(`(${scene}): upstack restack`, () => {
		configureTest(scene);

		it("Can restack a stack of three branches", () => {
			scene.repo.createChange("2", "a");
			scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `2`]);
			scene.repo.createChangeAndCommit("2.5", "a.5");

			scene.repo.createChange("3", "b");
			scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `3`]);
			scene.repo.createChangeAndCommit("3.5", "b.5");

			scene.repo.createChange("4", "c");
			scene.repo.runCliCommand([`branch`, `create`, `c`, `-m`, `4`]);

			expectCommits(scene.repo, "4, 3.5, 3, 2.5, 2, 1");

			scene.repo.checkoutBranch("main");
			scene.repo.createChangeAndCommit("1.5", "main");
			expect(
				scene.repo.listCurrentBranchCommitMessages().slice(0, 2).join(", "),
			).toBe("1.5, 1");

			scene.repo.runCliCommand(["upstack", "restack"]);

			expect(scene.repo.currentBranchName()).toBe("main");

			scene.repo.checkoutBranch("c");
			expectCommits(scene.repo, "4, 3.5, 3, 2.5, 2, 1.5, 1");
		});

		it("Can handle merge conflicts", () => {
			scene.repo.createChange("2");
			scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `2`]);

			scene.repo.createChange("3");
			scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `3`]);

			scene.repo.checkoutBranch("main");
			scene.repo.createChangeAndCommit("1.5");

			expect(() => scene.repo.runCliCommand(["upstack", "restack"])).toThrow();
			expect(scene.repo.rebaseInProgress()).toBe(true);

			scene.repo.resolveMergeConflicts();

			expect(() => scene.repo.runCliCommand(["continue", "-q"])).toThrow();
			expect(scene.repo.rebaseInProgress()).toBe(true);

			scene.repo.markMergeConflictsAsResolved();
			scene.repo.runCliCommand(["continue", "-q"]);

			expect(scene.repo.rebaseInProgress()).toBe(false);
			expect(scene.repo.currentBranchName()).toBe("main");

			scene.repo.checkoutBranch("b");
			expect(
				scene.repo.listCurrentBranchCommitMessages().slice(0, 4).join(", "),
			).toBe("3, 2, 1.5, 1");
		});

		it("Can restack one specific stack", () => {
			scene.repo.createChange("a", "a");
			scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);

			scene.repo.createChange("b", "b");
			scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `b`]);

			scene.repo.checkoutBranch("a");
			scene.repo.createChangeAndCommit("1.5", "1.5");

			scene.repo.runCliCommand(["upstack", "restack"]);

			scene.repo.checkoutBranch("b");

			expect(scene.repo.currentBranchName()).toBe("b");
			expectCommits(scene.repo, "b, 1.5, a, 1");
		});

		it("Doesn't restack below current commit", () => {
			scene.repo.createChange("a", "a");
			scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);

			scene.repo.createChange("b", "b");
			scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `b`]);

			scene.repo.checkoutBranch("a");
			scene.repo.createChangeAndCommit("2.5", "2.5");

			scene.repo.checkoutBranch("main");
			scene.repo.createChangeAndCommit("1.5", "1.5");

			scene.repo.checkoutBranch("b");

			scene.repo.runCliCommand(["upstack", "restack"]);

			expect(scene.repo.currentBranchName()).toBe("b");
			expectCommits(scene.repo, "b, 2.5, a, 1");
		});
	});
}
