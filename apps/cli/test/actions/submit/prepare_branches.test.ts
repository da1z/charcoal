import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import prompts from "prompts";
import { getPRInfoForBranches } from "../../../src/actions/submit/prepare_branches";
import { BasicScene } from "../../lib/scenes/basic_scene";
import { configureTest } from "../../lib/utils/configure_test";

const scene = new BasicScene();
describe(`(${scene}): correctly get PR information for branches`, () => {
	configureTest(scene);

	// TODO: Add more tests for different scenarios

	it("should be able to update PR title and body if editPRFieldsInline is set", async () => {
		const title = "Test Title";
		const body = "Test body";
		const message = `${title}\n\n${body}`;

		scene.repo.createChange("a");
		scene.repo.runCliCommand([`branch`, `create`, `a`, `-m`, message]);

		const context = scene.getContext(true);

		const updatedTitle = "updatedTitle";
		prompts.inject([updatedTitle]);

		const updatedBody = "updatedBody";
		// Skip editor and inject the updated body
		context.userConfig.execEditor = (editFilePath: string) => {
			fs.writeFileSync(editFilePath, updatedBody);
		};
		// Pretend the stack has been submitted
		context.engine.getPrInfo = (_branchName: string) => {
			return {
				number: 1,
			};
		};

		const info = await getPRInfoForBranches(
			{
				branchNames: ["a"],
				editPRFieldsInline: true,
				draft: false,
				publish: true,
				updateOnly: false,
				dryRun: false,
				reviewers: undefined,
				select: false,
				always: false,
			},
			context,
		);

		expect(info.length).toBe(1);
		const datum = info[0];
		expect(datum.action).toBe("update");
		expect(datum.title).toBe(updatedTitle);
		expect(datum.body).toBe(updatedBody);
	});
});
