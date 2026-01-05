import fs from "node:fs";
import path from "node:path";
import tmp from "tmp";
import type { Arguments, InferredOptionTypes } from "yargs";
import {
	readMetadataRef,
	writeMetadataRef,
} from "../../lib/engine/metadata_ref";
import { graphite } from "../../lib/runner";
import { cuteString } from "../../lib/utils/cute_string";
import { readJSONSync } from "../../lib/utils/fs_utils";

const args = {
	branch: {
		demandOption: true,
		type: "string",
		positional: true,
		hidden: true,
	},
	edit: {
		type: "boolean",
		default: false,
		alias: "e",
	},
} as const;

export const command = "meta <branch>";
export const canonical = "dev meta";
export const description = false;
export const builder = args;

// This command allows for direct access to the metadata ref. USE WITH CARE!
type argsT = Arguments<InferredOptionTypes<typeof args>>;
export const handler = async (argv: argsT): Promise<void> => {
	return graphite(argv, canonical, async (context) => {
		const metaString = cuteString(readMetadataRef(argv.branch));
		if (!argv.edit) {
			context.splog.info(metaString);
			return;
		}
		const tmpfilePath = path.join(tmp.dirSync().name, "meta");
		fs.writeFileSync(tmpfilePath, metaString);
		context.userConfig.execEditor(tmpfilePath);
		writeMetadataRef(argv.branch, readJSONSync(tmpfilePath));
		context.engine.rebuild();
	});
};
