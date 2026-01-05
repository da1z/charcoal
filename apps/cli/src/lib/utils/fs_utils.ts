import fs from "node:fs";

export function emptyDirSync(dirPath: string): void {
	if (fs.existsSync(dirPath)) {
		fs.rmSync(dirPath, { recursive: true, force: true });
	}
	fs.mkdirSync(dirPath, { recursive: true });
}

export function removeSync(path: string): void {
	if (fs.existsSync(path)) {
		fs.rmSync(path, { recursive: true, force: true });
	}
}

export function ensureDirSync(dirPath: string): void {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	} else if (!fs.statSync(dirPath).isDirectory()) {
		throw new Error(`Path exists but is not a directory: ${dirPath}`);
	}
}

export function readJSONSync<T>(filePath: string): T {
	return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
