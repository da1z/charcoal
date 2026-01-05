import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { getOwnerAndNameFromURL } from "../../../src/lib/spiffy/repo_config_spf";
import { BasicScene } from "../../lib/scenes/basic_scene";
import { configureTest } from "../../lib/utils/configure_test";

for (const scene of [new BasicScene()]) {
	describe(`(${scene}): infer repo owner/name`, () => {
		configureTest(scene);

		it("Can infer cloned repos", () => {
			const match = getOwnerAndNameFromURL(
				"https://github.com/withgraphite/graphite-cli.git",
			);
			expect(match).not.toBeNull();
			expect(match?.owner).toBe("withgraphite");
			expect(match?.name).toBe("graphite-cli");
		});

		it("Can infer SSH cloned repos", () => {
			const match = getOwnerAndNameFromURL(
				"git@github.com:withgraphite/graphite-cli.git",
			);
			expect(match).not.toBeNull();
			expect(match?.owner).toBe("withgraphite");
			expect(match?.name).toBe("graphite-cli");
		});

		it("Can infer SSH cloned repos (with git@ configured separately)", () => {
			const match = getOwnerAndNameFromURL(
				"github.com/withgraphite/graphite-cli.git",
			);
			expect(match).not.toBeNull();
			expect(match?.owner).toBe("withgraphite");
			expect(match?.name).toBe("graphite-cli");
		});

		it("Can read the existing repo config when executing from a subfolder in the project", () => {
			expect(() => scene.repo.runCliCommand([`ls`])).not.toThrow();
			const subDir = path.join(scene.dir, "tmpDir");
			fs.mkdirSync(subDir);
			expect(() =>
				scene.repo.runCliCommand([`ls`], { cwd: subDir }),
			).not.toThrow();
		});

		// Not sure where these are coming from but we should be able to handle
		// them.
		it("Can infer cloned repos without .git", () => {
			const clone = getOwnerAndNameFromURL(
				"https://github.com/withgraphite/graphite-cli",
			);
			expect(clone).not.toBeNull();
			expect(clone?.owner).toBe("withgraphite");
			expect(clone?.name).toBe("graphite-cli");

			const sshClone = getOwnerAndNameFromURL(
				"git@github.com:withgraphite/graphite-cli",
			);
			expect(sshClone).not.toBeNull();
			expect(sshClone?.owner).toBe("withgraphite");
			expect(sshClone?.name).toBe("graphite-cli");
		});
	});
}
