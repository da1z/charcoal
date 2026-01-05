import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import { BasicScene } from "../../lib/scenes/basic_scene";
import { configureTest } from "../../lib/utils/configure_test";

for (const scene of [new BasicScene()]) {
	describe(`(${scene}): upgrade message`, () => {
		configureTest(scene);

		it("Sanity check - can read previously written message config", () => {
			const contents = "Hello world!";
			const cliVersion = "0.0.0";
			scene.getContext().messageConfig.update((data) => {
				data.message = {
					contents: contents,
					cliVersion: cliVersion,
				};
			});

			const writtenContents =
				scene.getContext().messageConfig.data.message?.contents;
			const wirttenCLIVersion =
				scene.getContext().messageConfig.data.message?.cliVersion;
			expect(writtenContents === contents).toBe(true);
			expect(wirttenCLIVersion === cliVersion).toBe(true);
		});

		it("If no message, removes message config file", () => {
			scene.getContext().messageConfig.update((d) => {
				d.message = undefined;
			});
			expect(fs.existsSync(scene.getContext().messageConfig.path)).toBe(false);

			// can handle removing the file "twice"
			scene.getContext().messageConfig.update((d) => {
				d.message = undefined;
			});
			expect(fs.existsSync(scene.getContext().messageConfig.path)).toBe(false);
		});
	});
}
