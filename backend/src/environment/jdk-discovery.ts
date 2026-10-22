import {
  readdir,
  realpath,
} from "node:fs/promises";

import {
  homedir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  probeCommand,
} from "./tool-probe.js";

export interface JdkCandidate {
  path: string;
  version?: string | undefined;
  vendor?: string | undefined;
  isSystemDefault: boolean;
}

const VERSION_PATTERN =
  /version "([^"]+)"/;

const VENDOR_PATTERN =
  /^.*Runtime Environment[^\n]*/m;

function javaExecutableFor(
  home: string,
): string {

  return process.platform === "win32"
    ? join(home, "bin", "java.exe")
    : join(home, "bin", "java");
}

async function listGlobDirectories(
  parent: string,
): Promise<string[]> {

  try {
    const entries =
      await readdir(
        parent,
        {
          withFileTypes: true,
        },
      );

    return entries
      .filter(
        (entry) =>
          entry.isDirectory(),
      )
      .map(
        (entry) =>
          join(parent, entry.name),
      );
  } catch {
    return [];
  }
}

async function candidateHomeDirectories(): Promise<string[]> {

  const home = homedir();
  const directories: string[] = [];

  if (process.platform === "darwin") {
    directories.push(
      ...(
        await listGlobDirectories(
          "/Library/Java/JavaVirtualMachines",
        )
      ).map(
        (path) =>
          join(path, "Contents", "Home"),
      ),
    );

    for (
      const cellarRoot
      of await listGlobDirectories(
        "/opt/homebrew/Cellar",
      )
    ) {
      if (
        !cellarRoot
          .split("/")
          .pop()
          ?.startsWith("openjdk")
      ) {
        continue;
      }

      for (
        const versionDir
        of await listGlobDirectories(
          cellarRoot,
        )
      ) {
        directories.push(
          join(
            versionDir,
            "libexec",
            "openjdk.jdk",
            "Contents",
            "Home",
          ),
        );
      }
    }
  }

  if (process.platform === "linux") {
    directories.push(
      ...(
        await listGlobDirectories(
          "/usr/lib/jvm",
        )
      ),
    );
  }

  if (process.platform === "win32") {
    for (
      const parent
      of [
        "C:\\Program Files\\Java",
        "C:\\Program Files\\Eclipse Adoptium",
        "C:\\Program Files\\Microsoft",
        "C:\\Program Files\\Zulu",
      ]
    ) {
      directories.push(
        ...(
          await listGlobDirectories(
            parent,
          )
        ),
      );
    }
  }

  directories.push(
    ...(
      await listGlobDirectories(
        join(
          home,
          ".sdkman",
          "candidates",
          "java",
        ),
      )
    ),
  );

  directories.push(
    ...(
      await listGlobDirectories(
        join(
          home,
          ".jenv",
          "versions",
        ),
      )
    ),
  );

  return directories;
}

async function resolveSystemDefaultHome(): Promise<string | undefined> {

  const whichCommand =
    process.platform === "win32"
      ? "where"
      : "which";

  const probe =
    await probeCommand(
      whichCommand,
      ["java"],
    );

  if (!probe.found || !probe.rawOutput) {
    return undefined;
  }

  const javaPath =
    probe.rawOutput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);

  if (!javaPath) {
    return undefined;
  }

  try {
    const resolved =
      await realpath(javaPath);

    const binIndex =
      resolved.lastIndexOf(
        process.platform === "win32"
          ? "\\bin\\"
          : "/bin/",
      );

    return binIndex === -1
      ? undefined
      : resolved.slice(0, binIndex);
  } catch {
    return undefined;
  }
}

export async function discoverJdks(): Promise<JdkCandidate[]> {

  const systemDefaultHome =
    await resolveSystemDefaultHome();

  const homeDirectories =
    new Set(
      await candidateHomeDirectories(),
    );

  if (systemDefaultHome) {
    homeDirectories.add(
      systemDefaultHome,
    );
  }

  const candidates:
    JdkCandidate[] = [];

  for (const home of homeDirectories) {
    const probe =
      await probeCommand(
        javaExecutableFor(home),
        ["-version"],
        VERSION_PATTERN,
      );

    if (!probe.found) {
      continue;
    }

    const vendorMatch =
      probe.rawOutput?.match(
        VENDOR_PATTERN,
      );

    candidates.push({
      path: home,
      version: probe.version,
      vendor: vendorMatch?.[0]?.trim(),
      isSystemDefault:
        systemDefaultHome === home,
    });
  }

  return candidates.sort(
    (left, right) => {
      if (left.isSystemDefault) {
        return -1;
      }

      if (right.isSystemDefault) {
        return 1;
      }

      return (right.version ?? "").localeCompare(
        left.version ?? "",
      );
    },
  );
}
