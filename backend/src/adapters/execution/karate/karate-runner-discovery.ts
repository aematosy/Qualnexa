import {
  readFile,
} from "node:fs/promises";

import {
  findFiles,
} from "../../../core/inspection/file-finder.js";

export interface KarateRunnerInfo {
  className: string;
  basePaths: string[];
}

const RUN_CALL_PATTERN =
  /Karate\s*\.\s*run\s*\(([^)]*)\)/g;

const STRING_LITERAL_PATTERN =
  /"([^"]+)"/g;

const CLASS_DECLARATION_PATTERN =
  /\bclass\s+(\w+)/;

export async function discoverKarateRunners(
  workspaceRoot: string,
): Promise<KarateRunnerInfo[]> {

  const javaFiles =
    await findFiles(
      workspaceRoot,
      (_path, name) =>
        name.endsWith(".java"),
    );

  const runners:
    KarateRunnerInfo[] = [];

  for (const file of javaFiles) {
    const content =
      await readFile(
        file,
        "utf8",
      );

    if (
      !content.includes(
        "@Karate.Test",
      ) &&
      !content.includes(
        "Karate.run",
      )
    ) {
      continue;
    }

    const classMatch =
      content.match(
        CLASS_DECLARATION_PATTERN,
      );

    const className =
      classMatch?.[1];

    if (!className) {
      continue;
    }

    const basePaths =
      new Set<string>();

    for (
      const runCall
      of content.matchAll(
        RUN_CALL_PATTERN,
      )
    ) {
      const argumentsText =
        runCall[1] ?? "";

      for (
        const literal
        of argumentsText.matchAll(
          STRING_LITERAL_PATTERN,
        )
      ) {
        const value =
          literal[1];

        if (value) {
          basePaths.add(value);
        }
      }
    }

    if (basePaths.size === 0) {
      continue;
    }

    runners.push({
      className,

      basePaths: [
        ...basePaths,
      ],
    });
  }

  return runners;
}

function isPathUnderBase(
  path: string,
  basePath: string,
): boolean {

  if (path === basePath) {
    return true;
  }

  if (
    path.startsWith(
      `${basePath}/`,
    )
  ) {
    return true;
  }

  return false;
}

export function findMostSpecificRunner(
  path: string,
  runners: KarateRunnerInfo[],
): KarateRunnerInfo | undefined {

  let best:
    KarateRunnerInfo | undefined;

  let bestLength = -1;

  for (const runner of runners) {
    for (
      const basePath
      of runner.basePaths
    ) {
      if (
        isPathUnderBase(
          path,
          basePath,
        ) &&
        basePath.length > bestLength
      ) {
        best = runner;
        bestLength = basePath.length;
      }
    }
  }

  return best;
}
