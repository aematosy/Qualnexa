import {
  resolve,
  sep,
} from "node:path";

const ENV_VAR = "ALLOWED_PROJECT_ROOTS";

function parseRoots(
  raw: string | undefined,
): string[] {

  if (!raw || !raw.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => resolve(entry));
}

let cachedRoots: string[] | null = null;
let warnedUnrestricted = false;

export function getAllowedRoots(): string[] {

  if (cachedRoots === null) {
    cachedRoots = parseRoots(
      process.env[ENV_VAR],
    );
  }

  return cachedRoots;
}

export function isUnrestricted(): boolean {
  return getAllowedRoots().length === 0;
}

export function isPathWithinAllowedRoots(
  targetPath: string,
): boolean {

  const resolvedTarget = resolve(targetPath);
  const roots = getAllowedRoots();

  if (roots.length === 0) {
    return true;
  }

  return roots.some((root) =>
    resolvedTarget === root ||
    resolvedTarget.startsWith(
      root.endsWith(sep)
        ? root
        : `${root}${sep}`,
    ),
  );
}

export function assertPathWithinAllowedRoots(
  targetPath: string,
): string {

  const resolvedTarget = resolve(targetPath);

  if (isUnrestricted()) {
    if (!warnedUnrestricted) {
      warnedUnrestricted = true;

      console.warn(
        `[security] ${ENV_VAR} is not set: the filesystem browser and ` +
        "project inspection endpoints will accept any path on this " +
        "machine. Set it to a comma-separated allowlist of directories " +
        "before exposing this backend beyond your own machine.",
      );
    }

    return resolvedTarget;
  }

  if (!isPathWithinAllowedRoots(resolvedTarget)) {
    throw new Error(
      `Path is outside the configured allowed roots: ${resolvedTarget}`,
    );
  }

  return resolvedTarget;
}
