import {
  ChevronLeft,
  Folder,
  HardDrive,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

type DirectoryItem = {
  name: string;
  path: string;
};

type DirectoryResponse = {
  currentPath: string;
  parentPath: string | null;
  directories: DirectoryItem[];
};

type Props = {
  open: boolean;
  initialPath?: string;
  onClose: () => void;
  onSelect: (path: string) => void;
};

export function DirectoryBrowserDialog({
  open,
  initialPath,
  onClose,
  onSelect,
}: Props) {
  const [currentPath, setCurrentPath] =
    useState<string | null>(null);

  const [parentPath, setParentPath] =
    useState<string | null>(null);

  const [directories, setDirectories] =
    useState<DirectoryItem[]>([]);

  const [roots, setRoots] =
    useState<DirectoryItem[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialPath) {
      void browse(initialPath);
    } else {
      void loadRoots();
    }
  }, [open]);

  async function loadRoots() {
    setLoading(true);
    setError(null);
    setCurrentPath(null);
    setParentPath(null);

    try {
      const response = await fetch(
        "/api/filesystem/roots",
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load filesystem roots.",
        );
      }

      const data =
        (await response.json()) as DirectoryItem[];

      setRoots(data);
      setDirectories([]);
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : "Unable to load filesystem.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function browse(path: string) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/filesystem/directories?path=${encodeURIComponent(path)}`,
      );

      if (!response.ok) {
        const body = await response.json();

        throw new Error(
          body.message ??
            "Unable to browse directory.",
        );
      }

      const data =
        (await response.json()) as DirectoryResponse;

      setCurrentPath(data.currentPath);
      setParentPath(data.parentPath);
      setDirectories(data.directories);
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : "Unable to browse directory.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-6">
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold">
              Select project directory
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Browse directories visible to the platform backend.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={19} />
          </button>
        </header>

        <div className="border-b border-slate-200 bg-slate-50 px-6 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!currentPath}
              onClick={() => {
                if (parentPath) {
                  void browse(parentPath);
                } else {
                  void loadRoots();
                }
              }}
              className="rounded-lg border border-slate-300 bg-white p-2 disabled:opacity-40"
            >
              <ChevronLeft size={17} />
            </button>

            <div className="min-w-0 flex-1 truncate rounded-lg border border-slate-300 bg-white px-4 py-2 font-mono text-sm">
              {currentPath ?? "Computer"}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading && (
            <div className="p-6 text-center text-sm text-slate-500">
              Loading...
            </div>
          )}

          {!loading &&
            !currentPath &&
            roots.map((root) => (
              <button
                key={root.path}
                type="button"
                onClick={() =>
                  void browse(root.path)
                }
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-slate-100"
              >
                <HardDrive size={19} />

                <div>
                  <div className="text-sm font-medium">
                    {root.name}
                  </div>

                  <div className="text-xs text-slate-500">
                    {root.path}
                  </div>
                </div>
              </button>
            ))}

          {!loading &&
            currentPath &&
            directories.map((directory) => (
              <button
                key={directory.path}
                type="button"
                onClick={() =>
                  void browse(directory.path)
                }
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left hover:bg-slate-100"
              >
                <Folder size={19} />

                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {directory.name}
                  </div>

                  <div className="truncate text-xs text-slate-500">
                    {directory.path}
                  </div>
                </div>
              </button>
            ))}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!currentPath}
            onClick={() => {
              if (currentPath) {
                onSelect(currentPath);
              }
            }}
            className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-medium text-white disabled:bg-slate-300"
          >
            Select this folder
          </button>
        </footer>
      </div>
    </div>
  );
}