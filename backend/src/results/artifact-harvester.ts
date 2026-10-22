import {
  cp,
  mkdir,
  readdir,
  rename,
  stat,
} from "node:fs/promises";

import {
  join,
  relative,
} from "node:path";

import type {
  ExecutionArtifact,
} from "../core/execution/model.js";

import {
  zipDirectory,
} from "./report-zipper.js";

const MAX_ARTIFACT_FILES = 500;

const MIN_HTML_FILES_FOR_ZIP = 2;

const REPORT_ZIP_NAME =
  "reports.zip";

function patternsForFramework(
  frameworkId: string,
  buildToolType: string | undefined,
): string[] {

  const isGradle =
    buildToolType?.toUpperCase() ===
    "GRADLE";

  switch (frameworkId) {

    case "karate":
      return [
        join(
          isGradle ? "build" : "target",
          "karate-reports",
        ),
      ];

    case "serenity":
      return [
        join(
          isGradle ? "build" : "target",
          isGradle
            ? join("reports", "serenity")
            : join("site", "serenity"),
        ),
      ];

    case "cucumber":
      return [
        join(
          isGradle ? "build" : "target",
          "cucumber-reports",
        ),
      ];

    case "playwright":
      return [
        "playwright-report",
        "test-results",
      ];

    case "cypress":
      return [
        join("cypress", "screenshots"),
        join("cypress", "videos"),
        join("cypress", "results"),
      ];

    case "pytest":
      return [
        "htmlcov",
        "report.html",
      ];

    default:
      return [];
  }
}

async function pathExists(
  path: string,
): Promise<boolean> {

  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function listFilesRecursively(
  root: string,
  current: string,
  collected: ExecutionArtifact[],
): Promise<void> {

  if (
    collected.length >=
    MAX_ARTIFACT_FILES
  ) {
    return;
  }

  const stats =
    await stat(current).catch(
      () => undefined,
    );

  if (stats?.isFile()) {
    collected.push({
      name:
        current.split(/[\\/]/).pop() ??
        current,

      relativePath:
        relative(root, current),

      sizeBytes:
        stats.size,
    });

    return;
  }

  let entries;

  try {
    entries =
      await readdir(
        current,
        {
          withFileTypes: true,
        },
      );
  } catch {
    return;
  }

  for (const entry of entries) {
    if (
      collected.length >=
      MAX_ARTIFACT_FILES
    ) {
      return;
    }

    const fullPath =
      join(current, entry.name);

    if (entry.isDirectory()) {
      await listFilesRecursively(
        root,
        fullPath,
        collected,
      );

      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const entryStats =
      await stat(fullPath);

    collected.push({
      name: entry.name,

      relativePath:
        relative(root, fullPath),

      sizeBytes:
        entryStats.size,
    });
  }
}

function countHtmlArtifacts(
  artifacts: ExecutionArtifact[],
): number {

  return artifacts.filter(
    (artifact) =>
      artifact.name
        .toLowerCase()
        .endsWith(".html"),
  ).length;
}

export async function harvestArtifacts(
  workspaceRoot: string,
  destinationRoot: string,
  frameworkIds: string[],
  buildToolType?: string,
): Promise<ExecutionArtifact[]> {

  const patterns = [
    ...new Set(
      frameworkIds.flatMap(
        (frameworkId) =>
          patternsForFramework(
            frameworkId,
            buildToolType,
          ),
      ),
    ),
  ];

  const collectedFiles:
    ExecutionArtifact[] = [];

  for (const pattern of patterns) {
    const sourcePath =
      join(
        workspaceRoot,
        pattern,
      );

    if (!(await pathExists(sourcePath))) {
      continue;
    }

    const destinationPath =
      join(
        destinationRoot,
        pattern,
      );

    try {
      await mkdir(
        destinationRoot,
        {
          recursive: true,
        },
      );

      await cp(
        sourcePath,
        destinationPath,
        {
          recursive: true,
        },
      );

      await listFilesRecursively(
        destinationRoot,
        destinationPath,
        collectedFiles,
      );
    } catch {
      // Best-effort harvesting; skip sources that cannot be copied.
    }
  }

  if (
    countHtmlArtifacts(collectedFiles) >=
    MIN_HTML_FILES_FOR_ZIP
  ) {
    const bundle =
      await bundleReportsAsZip(
        destinationRoot,
      );

    if (bundle) {
      // Multiple HTML reports were generated: surface only the zipped
      // bundle in the UI to avoid overwhelming the user with every
      // individual asset (CSS/JS/images/per-feature HTML). The
      // individual files remain on disk inside destinationRoot and are
      // included in the zip; they are just not listed separately here.
      return [bundle];
    }
  }

  return collectedFiles;
}

async function bundleReportsAsZip(
  destinationRoot: string,
): Promise<ExecutionArtifact | undefined> {

  const temporaryZipPath =
    `${destinationRoot}.tmp-${Date.now()}.zip`;

  const finalZipPath =
    join(
      destinationRoot,
      REPORT_ZIP_NAME,
    );

  try {
    await zipDirectory(
      destinationRoot,
      temporaryZipPath,
    );

    await rename(
      temporaryZipPath,
      finalZipPath,
    );

    const stats =
      await stat(finalZipPath);

    return {
      name: REPORT_ZIP_NAME,

      relativePath:
        REPORT_ZIP_NAME,

      sizeBytes:
        stats.size,
    };
  } catch {
    // Best-effort bundling; individual report files remain downloadable.
    return undefined;
  }
}
