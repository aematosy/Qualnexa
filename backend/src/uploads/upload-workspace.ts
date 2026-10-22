import {
  mkdir,
  mkdtemp,
  writeFile,
} from "node:fs/promises";

import {
  tmpdir,
} from "node:os";

import {
  dirname,
  join,
  resolve,
  sep,
} from "node:path";

const WORKSPACE_PREFIX = "qualnexa-upload-";

export async function createUploadWorkspace(): Promise<string> {
  return mkdtemp(
    join(
      tmpdir(),
      WORKSPACE_PREFIX,
    ),
  );
}

export function sanitizeRelativePath(
  relativePath: string,
): string {

  const normalized =
    relativePath.replace(
      /\\/g,
      "/",
    );

  const segments = normalized
    .split("/")
    .map((segment) => segment.trim())
    .filter(
      (segment) =>
        segment.length > 0 &&
        segment !== ".",
    );

  if (segments.length === 0) {
    throw new Error(
      `Invalid file path: ${relativePath}`,
    );
  }

  if (
    segments.some(
      (segment) => segment === "..",
    )
  ) {
    throw new Error(
      `Unsafe file path: ${relativePath}`,
    );
  }

  return segments.join("/");
}

export async function writeWorkspaceFile(
  workspaceRoot: string,
  relativePath: string,
  data: Buffer,
): Promise<void> {

  const safeRelative =
    sanitizeRelativePath(
      relativePath,
    );

  const normalizedRoot =
    resolve(workspaceRoot);

  const destination = resolve(
    normalizedRoot,
    safeRelative,
  );

  if (
    destination !== normalizedRoot &&
    !destination.startsWith(
      `${normalizedRoot}${sep}`,
    )
  ) {
    throw new Error(
      `Resolved path escapes upload workspace: ${relativePath}`,
    );
  }

  await mkdir(
    dirname(destination),
    {
      recursive: true,
    },
  );

  await writeFile(
    destination,
    data,
  );
}
