import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { BasicScene } from "../lib/scenes/basic_scene";
import { configureTest } from "../lib/utils/configure_test";

for (const scene of [new BasicScene()]) {
	describe(`(${scene}): find all PR templates`, () => {
		configureTest(scene);

		it("Can find single PR templates", () => {
			testPRTemplates(
				{
					templatePaths: [
						"pull_request_template.md",
						".github/pull_request_template.md",
						"docs/pull_request_template.md",
					],
				},
				scene,
			);
		});

		it("Can find all templates in PR template folders", () => {
			testPRTemplates(
				{
					templatePaths: [
						"PULL_REQUEST_TEMPLATE/a.md",
						"PULL_REQUEST_TEMPLATE/b.md",
						"PULL_REQUEST_TEMPLATE/c.md",
						".github/PULL_REQUEST_TEMPLATE/a.md",
						".github/PULL_REQUEST_TEMPLATE/b.md",
						".github/PULL_REQUEST_TEMPLATE/c.md",
						"docs/PULL_REQUEST_TEMPLATE/a.md",
						"docs/PULL_REQUEST_TEMPLATE/b.md",
						"docs/PULL_REQUEST_TEMPLATE/c.md",
					],
				},
				scene,
			);
		});

		it("Searches for PR templates, case-insensitive", () => {
			testPRTemplates({ templatePaths: ["pull_Request_Template.md"] }, scene);
		});

		it("Only finds .md and .txt as PR templates", () => {
			testPRTemplates(
				{
					templatePaths: [
						"pull_request_template.txt",
						".github/pull_request_template.md",
					],
					nonTemplatePaths: ["docs/pull_request_template.doc"],
				},
				scene,
			);
		});
	});
}
function testPRTemplates(
	args: {
		templatePaths: string[];
		nonTemplatePaths?: string[];
	},
	scene: BasicScene,
) {
	for (const template of args.templatePaths) {
		createFile(path.join(scene.repo.dir, template));
	}
	if (args.nonTemplatePaths) {
		for (const nonTemplate of args.nonTemplatePaths) {
			createFile(path.join(scene.repo.dir, nonTemplate));
		}
	}

	const foundPRTemplates = scene.repo.runCliCommandAndGetOutput([
		"repo",
		"pr-templates",
	]);
	for (const template of args.templatePaths) {
		expect(foundPRTemplates.includes(template)).toBe(true);
	}
	if (args.nonTemplatePaths) {
		for (const nonTemplate of args.nonTemplatePaths) {
			expect(foundPRTemplates.includes(nonTemplate)).toBe(false);
		}
	}
}

function createFile(filepath: string) {
	const parsedPath = path.parse(filepath);
	const dirs = parsedPath.dir.split("/");

	let writtenFilePath = "";
	dirs.forEach((part) => {
		writtenFilePath += `${part}/`;
		if (!fs.existsSync(writtenFilePath)) {
			fs.mkdirSync(writtenFilePath);
		}
	});

	fs.writeFileSync(filepath, "test");
}
