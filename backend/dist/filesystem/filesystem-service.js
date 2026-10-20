import { access, readdir, } from "node:fs/promises";
import { dirname, parse, resolve, } from "node:path";
export async function getFileSystemRoots() {
    if (process.platform !== "win32") {
        return [
            {
                name: "/",
                path: "/",
            },
        ];
    }
    const candidates = [];
    for (let code = "C".charCodeAt(0); code <= "Z".charCodeAt(0); code++) {
        const drive = `${String.fromCharCode(code)}:\\`;
        try {
            await access(drive);
            candidates.push({
                name: drive,
                path: drive,
            });
        }
        catch {
            // Drive is not available.
        }
    }
    return candidates;
}
export async function listDirectories(requestedPath) {
    const currentPath = resolve(requestedPath);
    const entries = await readdir(currentPath, {
        withFileTypes: true,
    });
    const directories = entries
        .filter((entry) => entry.isDirectory())
        .filter((entry) => !entry.name.startsWith("."))
        .map((entry) => ({
        name: entry.name,
        path: resolve(currentPath, entry.name),
    }))
        .sort((left, right) => left.name.localeCompare(right.name, undefined, {
        sensitivity: "base",
    }));
    const parsed = parse(currentPath);
    const parentPath = currentPath === parsed.root
        ? null
        : dirname(currentPath);
    return {
        currentPath,
        parentPath,
        directories,
    };
}
