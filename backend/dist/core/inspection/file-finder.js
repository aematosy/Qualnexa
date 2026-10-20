import { readdir, } from "node:fs/promises";
import { extname, resolve, } from "node:path";
const ignoredDirectories = new Set([
    ".git",
    ".idea",
    ".vscode",
    "node_modules",
    "target",
    "build",
    ".gradle",
    ".venv",
    "venv",
    "__pycache__",
    "dist",
]);
export async function findFiles(root, predicate) {
    const result = [];
    async function visit(directory) {
        const entries = await readdir(directory, {
            withFileTypes: true,
        });
        for (const entry of entries) {
            if (ignoredDirectories.has(entry.name)) {
                continue;
            }
            const fullPath = resolve(directory, entry.name);
            if (entry.isDirectory()) {
                await visit(fullPath);
                continue;
            }
            if (entry.isFile() &&
                predicate(fullPath, entry.name)) {
                result.push(fullPath);
            }
        }
    }
    await visit(root);
    return result;
}
export function hasExtension(name, ...extensions) {
    return extensions.includes(extname(name).toLowerCase());
}
