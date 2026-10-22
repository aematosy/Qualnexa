import {
  probeCommand,
} from "./tool-probe.js";

import {
  discoverJdks,
  type JdkCandidate,
} from "./jdk-discovery.js";

export interface ToolStatus {
  id: string;
  displayName: string;
  found: boolean;
  version?: string | undefined;
  error?: string | undefined;
}

export interface DoctorReport {
  tools: ToolStatus[];
  jdks: JdkCandidate[];
  generatedAt: string;
}

interface ToolCheck {
  id: string;
  displayName: string;
  executable: string;
  args: string[];
  versionPattern: RegExp;
}

const checks: ToolCheck[] = [
  {
    id: "java",
    displayName: "Java",
    executable: "java",
    args: ["-version"],
    versionPattern:
      /version "([^"]+)"/,
  },
  {
    id: "maven",
    displayName: "Maven",
    executable: "mvn",
    args: ["-version"],
    versionPattern:
      /Apache Maven ([\w.-]+)/,
  },
  {
    id: "gradle",
    displayName: "Gradle",
    executable: "gradle",
    args: ["-version"],
    versionPattern:
      /Gradle ([\w.-]+)/,
  },
  {
    id: "node",
    displayName: "Node.js",
    executable: "node",
    args: ["--version"],
    versionPattern:
      /v?([\w.-]+)/,
  },
  {
    id: "npm",
    displayName: "npm",
    executable: "npm",
    args: ["--version"],
    versionPattern:
      /([\w.-]+)/,
  },
  {
    id: "pnpm",
    displayName: "pnpm",
    executable: "pnpm",
    args: ["--version"],
    versionPattern:
      /([\w.-]+)/,
  },
  {
    id: "yarn",
    displayName: "Yarn",
    executable: "yarn",
    args: ["--version"],
    versionPattern:
      /([\w.-]+)/,
  },
  {
    id: "python",
    displayName: "Python",
    executable:
      process.platform === "win32"
        ? "python"
        : "python3",
    args: ["--version"],
    versionPattern:
      /Python ([\w.-]+)/,
  },
  {
    id: "pip",
    displayName: "pip",
    executable:
      process.platform === "win32"
        ? "pip"
        : "pip3",
    args: ["--version"],
    versionPattern:
      /pip ([\w.-]+)/,
  },
  {
    id: "git",
    displayName: "Git",
    executable: "git",
    args: ["--version"],
    versionPattern:
      /git version ([\w.-]+)/,
  },
  {
    id: "docker",
    displayName: "Docker",
    executable: "docker",
    args: ["--version"],
    versionPattern:
      /Docker version ([\w.-]+)/,
  },
];

export async function runDoctor(): Promise<DoctorReport> {

  const tools = await Promise.all(
    checks.map(
      async (check): Promise<ToolStatus> => {

        const probe =
          await probeCommand(
            check.executable,
            check.args,
            check.versionPattern,
          );

        return {
          id: check.id,
          displayName:
            check.displayName,
          found: probe.found,
          version: probe.version,
          error:
            probe.found
              ? undefined
              : probe.error ??
                "Not found on PATH.",
        };
      },
    ),
  );

  const jdks =
    await discoverJdks();

  return {
    tools,
    jdks,
    generatedAt:
      new Date().toISOString(),
  };
}
