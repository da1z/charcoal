import fs from "node:fs";
import tmp from "tmp";
import { cuteString } from "../../../src/lib/utils/cute_string";
import { GitRepo } from "../utils/git_repo";
import { AbstractScene } from "./abstract_scene";

export class PublicRepoScene extends AbstractScene {
	repoUrl: string;
	name: string;
	timeout: number;

	constructor(opts: { repoUrl: string; name: string; timeout: number }) {
		super();
		this.repoUrl = opts.repoUrl;
		this.name = opts.name;
		this.timeout = opts.timeout;
	}

	public toString(): string {
		return this.name;
	}
	public override setup(): void {
		this.tmpDir = tmp.dirSync();
		this.dir = this.tmpDir.name;
		this.repo = new GitRepo(this.dir, { repoUrl: this.repoUrl, shallow: true });
		fs.writeFileSync(
			`${this.dir}/.git/.graphite_repo_config`,
			cuteString({ trunk: "master" }),
		);
		process.chdir(this.dir);
		this.repo.createChangeAndCommit("1", "1");
	}
}
