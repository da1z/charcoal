import { describe, expect, it } from "bun:test";
import { removeUnsupportedTrailingCharacters } from "../../../src/lib/utils/branch_name";
import { allScenes } from "../../lib/scenes/all_scenes";
import { configureTest } from "../../lib/utils/configure_test";
import { expectCommits } from "../../lib/utils/expect_commits";

for (const scene of allScenes) {
	describe(`(${scene}): branch create`, () => {
		configureTest(scene);

		it("Can run branch create", () => {
			scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);
			expect(scene.repo.currentBranchName()).toBe("a");
			scene.repo.createChangeAndCommit("2", "2");

			scene.repo.runCliCommand(["branch", "down"]);
			expect(scene.repo.currentBranchName()).toBe("main");
		});

		it("Can rollback changes on a failed commit hook", () => {
			// Aggressive AF commit hook from your angry coworker
			scene.repo.createPrecommitHook("exit 1");
			scene.repo.createChange("2");
			expect(() => {
				scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);
			}).toThrow(Error);
			expect(scene.repo.currentBranchName()).toBe("main");
		});

		it("Can create a branch without providing a name", () => {
			scene.repo.createChange("2");
			scene.repo.runCliCommand([`branch`, `create`, `-m`, `feat(test): info.`]);
			expect(scene.repo.currentBranchName().includes("feat_test_info")).toBe(
				true,
			);
			expectCommits(scene.repo, "feat(test): info.");
		});

		it("Can create a branch with add all option", () => {
			scene.repo.createChange("23", "test", true);
			scene.repo.runCliCommand([
				`branch`,
				`create`,
				`test-branch`,
				`-m`,
				`add all`,
				`-a`,
			]);
		});

		it("Can restack its parents children", () => {
			scene.repo.createChange("a", "a");
			scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);

			scene.repo.createChange("b", "b");
			scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `b`]);
			scene.repo.runCliCommand(["bd"]);

			scene.repo.createChange("c", "c");
			scene.repo.runCliCommand([
				`branch`,
				`create`,
				`c`,
				`-m`,
				`c`,
				`--insert`,
			]);
			expect(() => scene.repo.runCliCommand(["branch", "up"])).not.toThrow();

			expectCommits(scene.repo, "b, c, a");
		});
	});
}

describe("removeUnsupportedTrailingCharacters", () => {
	[
		{
			name: "No unsupported trailing characters",
			input: "Hello world",
			expected: "Hello world",
		},
		{
			name: "Trailing dot",
			input: "Hello world.",
			expected: "Hello world",
		},
		{
			name: "Trailing slash",
			input: "Hello world/",
			expected: "Hello world",
		},
		{
			name: "Multiple unsupported trailing characters",
			input: "Hello world/_./.",
			expected: "Hello world/_",
		},
	].forEach((tc) => {
		it(tc.name, () => {
			const strippedInput = removeUnsupportedTrailingCharacters(tc.input);
			expect(strippedInput).toBe(tc.expected);
		});
	});
});
