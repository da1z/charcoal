import { describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import fs from "node:fs";
import { TrailingProdScene } from "../../lib/scenes/trailing_prod_scene";
import { configureTest } from "../../lib/utils/configure_test";

for (const scene of [new TrailingProdScene()]) {
	describe(`(${scene}): log short`, () => {
		configureTest(scene);

		it("Can log short", () => {
			expect(() => scene.repo.runCliCommand([`ls`])).not.toThrow();
		});

		it("Can print stacks if a branch's parent has been deleted", () => {
			// This is mostly an effort to recreate a messed-up repo state that created a bug for a user.
			scene.repo.createChange("a", "a");
			scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);

			scene.repo.createChange("b", "b");
			scene.repo.runCliCommand([`branch`, `create`, `b`, `-m`, `b`]);

			scene.repo.checkoutBranch("main");
			scene.repo.createChangeAndCommit("2", "2");
			scene.repo.checkoutBranch("a");
			execSync(`git -C ${scene.repo.dir} rebase prod`);

			// b's now has no git-parents, but it's meta points to "a" which still exists but is not off main.
			expect(() => scene.repo.runCliCommand([`ls`])).not.toThrow();
		});

		it("Doesnt error when creating an empty branch because of empty commits", () => {
			scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, `a`]);
			scene.repo.checkoutBranch("main");
			expect(() => scene.repo.runCliCommand([`ls`])).not.toThrow();
		});

		it("Works if branch and file have same name", () => {
			const textFileName = "test.txt";
			scene.repo.runCliCommand([`branch`, `create`, textFileName, `-m`, `a`]);

			// Creates a commit with contents "a" in file "test.txt"
			scene.repo.createChangeAndCommit("a");
			expect(fs.existsSync(textFileName)).toBe(true);

			scene.repo.checkoutBranch(textFileName);

			// gt log should work - using "test.txt" as a revision rather than a path
			expect(() => scene.repo.runCliCommand([`log`])).not.toThrow();
			expect(() => scene.repo.runCliCommand([`ls`])).not.toThrow();
		});
	});
}
