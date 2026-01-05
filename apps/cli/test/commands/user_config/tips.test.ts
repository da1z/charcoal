import { describe, expect, it } from "bun:test";
import { BasicScene } from "../../lib/scenes/basic_scene";
import { configureTest } from "../../lib/utils/configure_test";

for (const scene of [new BasicScene()]) {
	describe(`(${scene}): user tips`, () => {
		configureTest(scene);

		it("Sanity check - can enable tips", () => {
			expect(() =>
				scene.repo.runCliCommand([`user`, `tips`, `--enable`]),
			).not.toThrow();
			expect(scene.repo.runCliCommandAndGetOutput([`user`, `tips`])).toBe(
				"tips enabled",
			);
		});

		it("Sanity check - can disable tips", () => {
			expect(() =>
				scene.repo.runCliCommand([`user`, `tips`, `--disable`]),
			).not.toThrow();
			expect(scene.repo.runCliCommandAndGetOutput([`user`, `tips`])).toBe(
				"tips disabled",
			);
		});
	});
}
