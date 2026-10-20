import { access, stat, } from "node:fs/promises";
import { resolve, } from "node:path";
export class LocalPathSourceResolver {
    supports(type) {
        return type === "LOCAL_PATH";
    }
    async resolve(source) {
        if (!source.location.trim()) {
            throw new Error("Local project path is required.");
        }
        const root = resolve(source.location);
        await access(root);
        const info = await stat(root);
        if (!info.isDirectory()) {
            throw new Error(`Project path is not a directory: ${root}`);
        }
        return {
            root,
        };
    }
}
