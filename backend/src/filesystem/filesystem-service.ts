import {
  access,
  readdir,
} from "node:fs/promises";

import {
  homedir,
} from "node:os";

import {
  dirname,
  join,
  parse,
  resolve,
} from "node:path";

import {
  assertPathWithinAllowedRoots,
  getAllowedRoots,
  isPathWithinAllowedRoots,
  isUnrestricted,
} from "../config/allowed-roots.js";

export type DirectoryItemKind =
  | "home"
  | "desktop"
  | "documents"
  | "downloads"
  | "drive";

export interface DirectoryItem {
  name: string;
  path: string;
  kind?: DirectoryItemKind;
}

export interface DirectoryResponse {
  currentPath: string;
  parentPath: string | null;
  directories: DirectoryItem[];
}

async function getPlatformRoots(): Promise<DirectoryItem[]> {

  if (process.platform !== "win32") {
    return [
      {
        name: "/",
        path: "/",
        kind: "drive",
      },
    ];
  }

  const candidates: DirectoryItem[] = [];

  for (
    let code = "C".charCodeAt(0);
    code <= "Z".charCodeAt(0);
    code++
  ) {
    const drive =
      `${String.fromCharCode(code)}:\\`;

    try {
      await access(drive);

      candidates.push({
        name: drive,
        path: drive,
        kind: "drive",
      });
    } catch {
      // Drive is not available.
    }
  }

  return candidates;
}

function getQuickAccessCandidates(): DirectoryItem[] {

  const home = homedir();

  return [
    {
      name: "Home",
      path: home,
      kind: "home",
    },
    {
      name: "Desktop",
      path: join(home, "Desktop"),
      kind: "desktop",
    },
    {
      name: "Documents",
      path: join(home, "Documents"),
      kind: "documents",
    },
    {
      name: "Downloads",
      path: join(home, "Downloads"),
      kind: "downloads",
    },
  ];
}

async function getAccessibleQuickAccess(): Promise<DirectoryItem[]> {

  const unrestricted = isUnrestricted();
  const accessible: DirectoryItem[] = [];

  for (const candidate of getQuickAccessCandidates()) {
    if (
      !unrestricted &&
      !isPathWithinAllowedRoots(candidate.path)
    ) {
      continue;
    }

    try {
      await access(candidate.path);

      accessible.push(candidate);
    } catch {
      // Not available on this machine.
    }
  }

  return accessible;
}

export async function getFileSystemRoots(): Promise<DirectoryItem[]> {

  const quickAccess =
    await getAccessibleQuickAccess();

  if (isUnrestricted()) {
    return [
      ...quickAccess,
      ...(await getPlatformRoots()),
    ];
  }

  const configuredRoots: DirectoryItem[] = [];
  const seen = new Set(
    quickAccess.map(
      (item) => item.path,
    ),
  );

  for (const root of getAllowedRoots()) {
    if (seen.has(root)) {
      continue;
    }

    try {
      await access(root);

      configuredRoots.push({
        name: root,
        path: root,
      });

      seen.add(root);
    } catch {
      // Configured root is not accessible from this process.
    }
  }

  return [
    ...quickAccess,
    ...configuredRoots,
  ];
}

export async function listDirectories(
  requestedPath: string,
): Promise<DirectoryResponse> {

  const currentPath = assertPathWithinAllowedRoots(
    requestedPath,
  );

  const entries = await readdir(
    currentPath,
    {
      withFileTypes: true,
    },
  );

  const directories = entries
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !entry.name.startsWith("."))
    .map((entry) => ({
      name: entry.name,
      path: resolve(
        currentPath,
        entry.name,
      ),
    }))
    .sort((left, right) =>
      left.name.localeCompare(
        right.name,
        undefined,
        {
          sensitivity: "base",
        },
      ),
    );

  const parsed = parse(currentPath);

  const parentPath =
    currentPath === parsed.root
      ? null
      : dirname(currentPath);

  return {
    currentPath,
    parentPath,
    directories,
  };
}
