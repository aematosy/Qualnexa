import {
  readFile,
  readdir,
  stat,
} from "node:fs/promises";

import {
  join,
} from "node:path";

import {
  XMLParser,
} from "fast-xml-parser";

import type {
  ExecutionResult,
} from "../core/execution/model.js";

const REPORT_DIRECTORY_NAMES =
  new Set([
    "surefire-reports",
    "failsafe-reports",
  ]);

const GRADLE_TEST_RESULTS_SUFFIX =
  join(
    "test-results",
    "test",
  );

const MAX_SCAN_DEPTH = 6;

async function findReportDirectories(
  root: string,
): Promise<string[]> {

  const found: string[] = [];

  async function visit(
    directory: string,
    depth: number,
  ): Promise<void> {

    if (depth > MAX_SCAN_DEPTH) {
      return;
    }

    let entries;

    try {
      entries =
        await readdir(
          directory,
          {
            withFileTypes: true,
          },
        );
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const fullPath =
        join(
          directory,
          entry.name,
        );

      if (
        REPORT_DIRECTORY_NAMES.has(
          entry.name,
        ) ||
        fullPath.endsWith(
          GRADLE_TEST_RESULTS_SUFFIX,
        )
      ) {
        found.push(fullPath);
        continue;
      }

      if (
        entry.name === ".git" ||
        entry.name === "node_modules"
      ) {
        continue;
      }

      await visit(
        fullPath,
        depth + 1,
      );
    }
  }

  await visit(root, 0);

  return found;
}

function asRecord(
  value: unknown,
): Record<string, unknown> | undefined {

  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as
      Record<string, unknown>;
  }

  return undefined;
}

function toArray(
  value: unknown,
): unknown[] {

  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value)
    ? value
    : [value];
}

function toNumber(
  value: unknown,
): number {

  const parsed =
    Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

export async function parseJunitXmlResults(
  workspaceRoot: string,
  since?: Date | undefined,
): Promise<ExecutionResult | undefined> {

  const directories =
    await findReportDirectories(
      workspaceRoot,
    );

  if (directories.length === 0) {
    return undefined;
  }

  const parser =
    new XMLParser({
      ignoreAttributes: false,
      parseTagValue: false,
      trimValues: true,
    });

  let total = 0;
  let failed = 0;
  let skipped = 0;
  let flaky = 0;
  let durationSeconds = 0;
  let parsedAnyFile = false;

  for (const directory of directories) {
    let files;

    try {
      files =
        await readdir(directory);
    } catch {
      continue;
    }

    for (const file of files) {
      if (!file.toLowerCase().endsWith(".xml")) {
        continue;
      }

      const filePath =
        join(directory, file);

      if (since) {
        try {
          const fileStats =
            await stat(filePath);

          if (fileStats.mtime < since) {
            // Stale report left over from a previous execution
            // (e.g. a build tool that does not clean its report
            // directory between runs): ignore it so results only
            // reflect the current execution.
            continue;
          }
        } catch {
          continue;
        }
      }

      let xml: string;

      try {
        xml =
          await readFile(
            filePath,
            "utf8",
          );
      } catch {
        continue;
      }

      let document: unknown;

      try {
        document =
          parser.parse(xml);
      } catch {
        continue;
      }

      const suite =
        asRecord(
          asRecord(document)
            ?.testsuite,
        );

      if (!suite) {
        continue;
      }

      parsedAnyFile = true;

      total +=
        toNumber(
          suite["@_tests"],
        );

      failed +=
        toNumber(
          suite["@_failures"],
        ) +
        toNumber(
          suite["@_errors"],
        );

      skipped +=
        toNumber(
          suite["@_skipped"],
        );

      durationSeconds +=
        toNumber(
          suite["@_time"],
        );

      const testcases =
        toArray(
          suite.testcase,
        )
          .map(asRecord)
          .filter(
            (
              value,
            ): value is Record<string, unknown> =>
              value !== undefined,
          );

      for (const testcase of testcases) {
        const hasFlakyMarker =
          testcase["flakyFailure"] !==
            undefined ||
          testcase["flakyError"] !==
            undefined ||
          testcase["rerunFailure"] !==
            undefined;

        const terminallyFailed =
          testcase["failure"] !==
            undefined ||
          testcase["error"] !==
            undefined;

        if (hasFlakyMarker && !terminallyFailed) {
          flaky += 1;
        }
      }
    }
  }

  if (!parsedAnyFile) {
    return undefined;
  }

  const passed =
    Math.max(
      0,
      total - failed - skipped,
    );

  return {
    total,
    passed,
    failed,
    skipped,
    flaky,

    durationMs:
      Math.round(
        durationSeconds * 1000,
      ),

    source:
      "junit-xml",
  };
}
