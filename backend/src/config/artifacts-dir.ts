import {
  fileURLToPath,
} from "node:url";

import {
  dirname,
  join,
  resolve,
} from "node:path";

const moduleDirectory =
  dirname(
    fileURLToPath(
      import.meta.url,
    ),
  );

const backendRoot =
  resolve(
    moduleDirectory,
    "..",
    "..",
  );

export const ARTIFACTS_ROOT =
  join(
    backendRoot,
    ".data",
    "artifacts",
  );

export function artifactsDirectoryFor(
  jobId: string,
): string {

  return join(
    ARTIFACTS_ROOT,
    jobId,
  );
}
