import {
  readFile,
} from "node:fs/promises";

import {
  join,
} from "node:path";

export interface NativeReportStep {
  prefix?: string;
  keyword?: string;
  text?: string;
  status?: string;
  durationMillis?: number;
  logSegments?: Array<{
    text?: string;
    lang?: string;
    code?: string;
  }>;
}

export interface NativeReportScenario {
  name: string;
  line?: number | undefined;
  tags: string[];
  skipped?: boolean | undefined;
  steps: NativeReportStep[];
}

export interface NativeReportData {
  framework: string;
  path: string;
  relativePath?: string | undefined;
  reportPath: string;
  scenarios: NativeReportScenario[];
}

export async function parseNativeReport(
  workspaceRoot: string,
  frameworkIds: string[],
): Promise<NativeReportData | undefined> {

  if (!frameworkIds.includes("karate")) {
    return undefined;
  }

  const candidatePaths = [
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

  for (const directory of candidatePaths) {
    try {
      const entries = await import("node:fs/promises").then((fs) =>
        fs.readdir(directory),
      );

      const htmlFile = entries.find((entry) =>
        entry.toLowerCase().endsWith(".html"),
      );

      if (!htmlFile) {
        continue;
      }

      const filePath = join(directory, htmlFile);
      const html = await readFile(filePath, "utf8");
      const marker = '<script id="karate-data" type="application/json">';
      const start = html.indexOf(marker);

      if (start < 0) {
        continue;
      }

      const end = html.indexOf("</script>", start);
      if (end < 0) {
        continue;
      }

      const raw = html.slice(start + marker.length, end).trim();
      const parsed = JSON.parse(raw) as {
        path?: string;
        relativePath?: string;
        scenarios?: Array<{
          name: string;
          line?: number;
          tags?: string[];
          skipped?: boolean;
          steps?: NativeReportStep[];
        }>;
      };

      return {
        framework: "karate",
        path: parsed.path ?? htmlFile,
        relativePath: parsed.relativePath,
        reportPath: filePath,
        scenarios: (parsed.scenarios ?? []).map((scenario) => ({
          name: scenario.name,
          line: scenario.line,
          tags: scenario.tags ?? [],
          skipped: scenario.skipped,
          steps: scenario.steps ?? [],
        })),
      };
    } catch {
      continue;
    }
  }

  return undefined;
}
