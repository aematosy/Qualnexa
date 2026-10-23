import {
  readFile,
  readdir,
  stat,
} from "node:fs/promises";

import {
  basename,
  join,
} from "node:path";

import {
  XMLParser,
} from "fast-xml-parser";

import type {
  ExecutionFailure,
  ExecutionResult,
  ExecutionStepResult,
  ExecutionTestResult,
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

function toStringValue(
  value: unknown,
): string | undefined {

  return typeof value === "string"
    ? value
    : undefined;
}

function normalizeFailureCategory(
  message: string,
  stacktrace?: string,
): ExecutionFailure["category"] {

  const haystack =
    `${message}\n${stacktrace ?? ""}`
      .toLowerCase();

  if (
    haystack.includes("assert") ||
    haystack.includes("expected")
  ) {
    return "ASSERTION";
  }

  if (haystack.includes("timeout")) {
    return "TIMEOUT";
  }

  if (
    /\bhttp\s*\d{3}\b/.test(haystack) ||
    haystack.includes("status code")
  ) {
    return "HTTP_ERROR";
  }

  if (
    haystack.includes("connection refused") ||
    haystack.includes("network") ||
    haystack.includes("econn")
  ) {
    return "NETWORK";
  }

  if (
    haystack.includes("element") &&
    haystack.includes("not found")
  ) {
    return "ELEMENT_NOT_FOUND";
  }

  if (
    haystack.includes("environment") ||
    haystack.includes("missing env")
  ) {
    return "ENVIRONMENT";
  }

  if (
    haystack.includes("config") ||
    haystack.includes("configuration")
  ) {
    return "CONFIGURATION";
  }

  if (
    haystack.includes("test data") ||
    haystack.includes("fixture")
  ) {
    return "TEST_DATA";
  }

  if (
    haystack.includes("build") ||
    haystack.includes("compilation")
  ) {
    return "BUILD";
  }

  if (
    haystack.includes("exception") ||
    haystack.includes("error")
  ) {
    return "RUNTIME";
  }

  return "UNKNOWN";
}

export async function parseJunitXmlResults(
  workspaceRoot: string,
  since?: Date | undefined,
): Promise<ExecutionResult | undefined> {

  const nativeKarateSteps =
    await loadKarateScenarioSteps(
      workspaceRoot,
    );

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

  const tests: ExecutionTestResult[] = [];
  const failures: ExecutionFailure[] = [];

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

      const suiteName =
        toStringValue(
          suite["@_name"],
        ) ?? basename(file, ".xml");

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
        const testId =
          `${suiteName}:${toStringValue(testcase["@_classname"]) ?? "suite"}:${toStringValue(testcase["@_name"]) ?? `test-${tests.length + 1}`}`;

        const failureNode =
          asRecord(testcase.failure) ??
          asRecord(testcase.error);

        const skippedNode =
          testcase.skipped !== undefined;

        const hasFlakyMarker =
          testcase["flakyFailure"] !==
            undefined ||
          testcase["flakyError"] !==
            undefined ||
          testcase["rerunFailure"] !==
            undefined;

        const failureMessage =
          toStringValue(
            failureNode?.["@_message"],
          ) ??
          toStringValue(
            failureNode?.["#text"],
          );

        const stacktrace =
          toStringValue(
            failureNode?.["#text"],
          );

        const status = failureNode
          ? "FAILED"
          : skippedNode
            ? "SKIPPED"
            : hasFlakyMarker
              ? "FLAKY"
              : "PASSED";

        if (hasFlakyMarker && !failureNode) {
          flaky += 1;
        }

        const testName =
          toStringValue(
            testcase["@_name"],
          ) ?? `Test ${tests.length + 1}`;

        const suiteValue =
          toStringValue(
            testcase["@_classname"],
          ) ?? suiteName;

        const normalizedSteps =
          nativeKarateSteps.get(
            `${suiteValue}::${testName}`,
          );

        tests.push({
          id: testId,
          name: testName,
          suite: suiteValue,
          status,
          durationMs: Math.round(
            toNumber(testcase["@_time"]) * 1000,
          ),
          retries: hasFlakyMarker
            ? 1
            : 0,
          failureType: failureMessage,
          tags:
            normalizedSteps?.tags ?? [],
          failureMessage,
          stacktrace,
          steps:
            normalizedSteps?.steps,
        });

        if (failureNode) {
          failures.push({
            testId,
            testName:
              toStringValue(
                testcase["@_name"],
              ) ?? `Test ${tests.length}`,
            suite:
              toStringValue(
                testcase["@_classname"],
              ) ?? suiteName,
            category:
              normalizeFailureCategory(
                failureMessage ?? "Unknown failure",
                stacktrace,
              ),
            message:
              failureMessage ?? "Unknown failure",
            stacktrace,
          });
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
    tests,
    failures,
  };
}

async function loadKarateScenarioSteps(
  workspaceRoot: string,
): Promise<Map<string, { tags: string[]; steps: ExecutionStepResult[] }>> {

  const result = new Map<string, { tags: string[]; steps: ExecutionStepResult[] }>();
  const candidateDirectories = [
    join(
      workspaceRoot,
      "target",
      "karate-reports",
      "feature-html",
    ),
    join(
      workspaceRoot,
      "build",
      "karate-reports",
      "feature-html",
    ),
  ];

  for (const directory of candidateDirectories) {
    let files: string[];

    try {
      files = await readdir(directory);
    } catch {
      continue;
    }

    for (const file of files) {
      if (!file.endsWith(".html")) {
        continue;
      }

      try {
        const html = await readFile(join(directory, file), "utf8");
        const marker = '<script id="karate-data" type="application/json">';
        const start = html.indexOf(marker);
        const end = html.indexOf("</script>", start);

        if (start < 0 || end < 0) {
          continue;
        }

        const parsed = JSON.parse(html.slice(start + marker.length, end).trim()) as {
          name?: string;
          scenarios?: Array<{
            name: string;
            tags?: string[];
            steps?: Array<{
              prefix?: string;
              keyword?: string;
              text?: string;
              status?: string;
              durationMillis?: number;
              logSegments?: Array<{ text?: string; lang?: string; code?: string }>;
            }>;
          }>;
        };

        for (const scenario of parsed.scenarios ?? []) {
          result.set(`${parsed.name ?? "Karate"}::${scenario.name}`, {
            tags: scenario.tags ?? [],
            steps: (scenario.steps ?? []).map((step) => ({
              prefix: step.prefix,
              keyword: step.keyword,
              text: step.text,
              status: step.status?.toUpperCase() === "PASSED"
                ? "PASSED"
                : step.status?.toUpperCase() === "FAILED"
                  ? "FAILED"
                  : step.status?.toUpperCase() === "SKIPPED"
                    ? "SKIPPED"
                    : undefined,
              durationMs: step.durationMillis,
              logSegments: step.logSegments,
            })),
          });
        }
      } catch {
        continue;
      }
    }
  }

  return result;
}
