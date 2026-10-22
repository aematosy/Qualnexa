import {
  ChevronLeft,
  Download,
  File as FileIcon,
  Folder,
  HardDrive,
  Home,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

type DirectoryItemKind =
  | "home"
  | "desktop"
  | "documents"
  | "downloads"
  | "drive";

type DirectoryItem = {
  name: string;
  path: string;
  kind?: DirectoryItemKind;
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-6 backdrop-blur-md">
      <div className="glass-panel animate-pop-in flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-[22px] border border-[var(--hairline)] shadow-[0_24px_64px_rgba(0,0,0,0.25)]">
        <header className="flex items-center justify-between border-b border-[var(--hairline)] px-6 py-5">
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight">
              Select project directory
            </h2>

            <p className="mt-1 text-[11.5px] text-[var(--text-quaternary)]">
              Browse directories visible to the platform backend.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 transition hover:bg-[var(--fill-tertiary)]"
          >
            <X size={18} />
          </button>
        </header>

        <div className="border-b border-[var(--hairline)] bg-[var(--fill-quinary)] px-6 py-3">
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
              className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] p-2 transition hover:bg-[var(--fill-tertiary)] disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="min-w-0 flex-1 truncate rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-2 font-mono text-[12.5px]">
              {currentPath ?? "Computer"}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-[14px] border border-[#ff3b30]/25 bg-[#ff3b30]/10 px-4 py-3 text-[12.5px] text-[var(--badge-red-text)]">
              {error}
            </div>
          )}

          {loading && (
            <div className="p-6 text-center text-[12.5px] text-[var(--text-quaternary)]">
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
                className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left transition hover:bg-[var(--fill-tertiary)]"
              >
                <RootIcon kind={root.kind} />

                <div>
                  <div className="text-[13px] font-medium">
                    {root.name}
                  </div>

                  <div className="text-[11.5px] text-[var(--text-quaternary)]">
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
                className="flex w-full items-center gap-3 rounded-[14px] px-4 py-3 text-left transition hover:bg-[var(--fill-tertiary)]"
              >
                <Folder size={18} className="text-[#0a84ff]" />

                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium">
                    {directory.name}
                  </div>

                  <div className="truncate text-[11.5px] text-[var(--text-quaternary)]">
                    {directory.path}
                  </div>
                </div>
              </button>
            ))}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-[var(--hairline)] bg-[var(--fill-quinary)] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-medium transition hover:bg-[var(--fill-tertiary)] active:scale-[0.97]"
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
            className="rounded-full bg-[#0a84ff] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(10,132,255,0.4)] transition hover:bg-[#0074e8] active:scale-[0.97] disabled:bg-[var(--fill-secondary)] disabled:text-[var(--text-quinary)] disabled:shadow-none"
          >
            Select this folder
          </button>
        </footer>
      </div>
    </div>
  );
}

function RootIcon({
  kind,
}: {
  kind?: DirectoryItemKind;
}) {
  switch (kind) {
    case "home":
      return <Home size={18} className="text-[#0a84ff]" />;
    case "desktop":
      return <FileIcon size={18} className="text-[#0a84ff]" />;
    case "documents":
      return <Folder size={18} className="text-[#0a84ff]" />;
    case "downloads":
      return <Download size={18} className="text-[#0a84ff]" />;
    default:
      return <HardDrive size={18} className="text-[var(--text-tertiary)]" />;
  }
}
