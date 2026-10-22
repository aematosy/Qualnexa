import {
  createWriteStream,
} from "node:fs";

import {
  stat,
} from "node:fs/promises";

import {
  ZipArchive,
} from "archiver";

export async function zipDirectory(
  sourceDir: string,
  destinationZipPath: string,
): Promise<number> {

  return new Promise(
    (resolve, reject) => {

      const output =
        createWriteStream(
          destinationZipPath,
        );

      const archive =
        new ZipArchive({
          zlib: {
            level: 9,
          },
        });

      output.on(
        "close",
        () => {
          resolve(
            archive.pointer(),
          );
        },
      );

      archive.on(
        "error",
        reject,
      );

      archive.pipe(output);

      archive.directory(
        sourceDir,
        false,
      );

      void archive.finalize();
    },
  );
}

export async function zipSizeBytes(
  zipPath: string,
): Promise<number> {

  const stats =
    await stat(zipPath);

  return stats.size;
}
