import {
  access,
  readFile,
} from "node:fs/promises";

export async function fileExists(
  path: string,
): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readTextIfExists(
  path: string,
): Promise<string | null> {
  try {
    return await readFile(
      path,
      "utf8",
    );
  } catch {
    return null;
  }
}

export async function readJsonIfExists<T>(
  path: string,
): Promise<T | null> {
  const text =
    await readTextIfExists(path);

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function firstNonBlank(
  ...values: Array<
    string | null | undefined
  >
): string | undefined {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      value.trim().length > 0,
  )?.trim();
}
