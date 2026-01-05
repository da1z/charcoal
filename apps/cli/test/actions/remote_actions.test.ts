import { describe, expect, it } from "bun:test";
import { syncAction } from "../../src/actions/sync/sync";
import { composeGit } from "../../src/lib/git/git";
import { CloneScene } from "../lib/scenes/clone_scene";
import { configureTest } from "../lib/utils/configure_test";

for (const scene of [new CloneScene()]) {
	// eslint-disable-next-line max-lines-per-function
	describe("handle remote actions properly (sync/submit)", () => {
		configureTest(scene);

		it("can push a branch to remote", async () => {
			scene.repo.createChange("1");
			scene.repo.runCliCommand([`branch`, `create`, `1`, `-am`, `1`]);
			expect(scene.repo.currentBranchName()).toBe("1");

			composeGit().pushBranch({
				remote: "origin",
				branchName: "1",
				noVerify: false,
				forcePush: false,
			});

			expect(scene.repo.getRef("refs/heads/1")).toBe(
				scene.originRepo.getRef("refs/heads/1"),
			);
		});

		it("fails to push to a branch with external commits", () => {
			scene.repo.createChange("1");
			scene.repo.runCliCommand([`branch`, `create`, `1`, `-am`, `1`]);
			expect(scene.repo.currentBranchName()).toBe("1");

			scene.originRepo.createChange("2");
			scene.originRepo.runCliCommand([`branch`, `create`, `1`, `-am`, `1`]);
			expect(scene.originRepo.getRef("refs/heads/1")).not.toBe(
				scene.repo.getRef("refs/heads/1"),
			);

			expect(() =>
				composeGit().pushBranch({
					remote: "origin",
					branchName: "1",
					noVerify: false,
					forcePush: false,
				}),
			).toThrow();
		});

		it("can pull trunk from remote", async () => {
			scene.originRepo.createChangeAndCommit("a");

			await syncAction(
				{
					pull: true,
					force: false,
					delete: false,
					showDeleteProgress: false,
					restack: false,
				},
				scene.getContext(),
			);

			expect(scene.repo.getRef("refs/heads/main")).toBe(
				scene.originRepo.getRef("refs/heads/main"),
			);
		});

		it("errors if trunk diverges from remote and force is false", async () => {
			scene.originRepo.createChangeAndCommit("a");
			scene.repo.createChangeAndCommit("b");
			await expect(
				syncAction(
					{
						pull: true,
						force: false,
						delete: false,
						showDeleteProgress: false,
						restack: false,
					},
					scene.getContext(),
				),
			).rejects.toThrow("Killed Pancake early.");
		});

		it("can reset trunk from remote", async () => {
			scene.originRepo.createChangeAndCommit("a");
			scene.repo.createChangeAndCommit("b");

			await syncAction(
				{
					pull: true,
					force: true,
					delete: false,
					showDeleteProgress: false,
					restack: false,
				},
				scene.getContext(),
			);

			expect(scene.repo.getRef("refs/heads/main")).toBe(
				scene.originRepo.getRef("refs/heads/main"),
			);
		});

		// TODO test downstack get actions
	});
}
