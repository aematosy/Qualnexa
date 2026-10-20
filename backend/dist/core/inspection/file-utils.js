import { access, readFile, } from "node:fs/promises";
export async function fileExists(path) {
    try {
        await access(path);
        return true;
    }
    catch {
        return false;
    }
}
export async function readTextIfExists(path) {
    try {
        return await readFile(path, "utf8");
    }
    catch {
        return null;
    }
}
export async function readJsonIfExists(path) {
    const text = await readTextIfExists(path);
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text);
    }
    catch {
        return null;
    }
}
export function firstNonBlank(...values) {
    return values.find((value) => value !== undefined &&
        value !== null &&
        value.trim().length > 0)?.trim();
}
