import { describe, expect, it } from "bun:test";
import { BasicScene } from "../../lib/scenes/basic_scene";
import { configureTest } from "../../lib/utils/configure_test";

for (const scene of [new BasicScene()]) {
	describe(`(${scene}): user pager`, () => {
		configureTest(scene);

		it("Sanity check - can check pager", () => {
			expect(() => scene.repo.runCliCommand([`user`, `pager`])).not.toThrow();
		});

		it("Sanity check - can set pager", () => {
			expect(
				scene.repo.runCliCommandAndGetOutput([
					`user`,
					`pager`,
					`--set`,
					`less -FRX`,
				]),
			).toBe("Pager set to less -FRX");
			expect(scene.repo.runCliCommandAndGetOutput([`user`, `pager`])).toBe(
				"less -FRX",
			);
		});

		it("Sanity check - can disable pager", () => {
			expect(
				scene.repo.runCliCommandAndGetOutput([`user`, `pager`, `--disable`]),
			).toBe("Pager disabled");
			expect(scene.repo.runCliCommandAndGetOutput([`user`, `pager`])).toBe(
				"Pager is disabled",
			);
		});

		it("Sanity check - can unset pager", () => {
			process.env.TEST_GT_PAGER = "less";
			expect(
				scene.repo.runCliCommandAndGetOutput([`user`, `pager`, `--unset`]),
			).toBe(
				"Pager preference erased. Defaulting to your git pager (currently less)",
			);
		});
	});
}
