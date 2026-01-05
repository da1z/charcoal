import { describe, expect, it } from "bun:test";
import { BasicScene } from "../../lib/scenes/basic_scene";
import { configureTest } from "../../lib/utils/configure_test";

for (const scene of [new BasicScene()]) {
	describe(`(${scene}): user editor`, () => {
		configureTest(scene);

		it("Sanity check - can check editor", () => {
			expect(() => scene.repo.runCliCommand([`user`, `editor`])).not.toThrow();
		});

		it("Sanity check - can set editor", () => {
			expect(
				scene.repo.runCliCommandAndGetOutput([
					`user`,
					`editor`,
					`--set`,
					`vim`,
				]),
			).toBe("Editor set to vim");
			expect(scene.repo.runCliCommandAndGetOutput([`user`, `editor`])).toBe(
				"vim",
			);
		});

		it("Sanity check - can unset editor", () => {
			process.env.TEST_GIT_EDITOR = "vi";
			expect(
				scene.repo.runCliCommandAndGetOutput([`user`, `editor`, `--unset`]),
			).toBe(
				"Editor preference erased. Defaulting to your git editor (currently vi)",
			);
		});
	});
}
