import unzipper from "unzipper";

import {
  writeWorkspaceFile,
} from "./upload-workspace.js";

export async function extractZipToWorkspace(
  buffer: Buffer,
  workspaceRoot: string,
): Promise<number> {

  const directory =
    await unzipper.Open.buffer(
      buffer,
    );

  let fileCount = 0;

  for (
    const entry
    of directory.files
  ) {
    if (entry.type === "Directory") {
      continue;
    }

    const content =
      await entry.buffer();

    await writeWorkspaceFile(
      workspaceRoot,
      entry.path,
      content,
    );

    fileCount += 1;
  }

  return fileCount;
}
