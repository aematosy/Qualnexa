import {
  Check,
  Folder,
  FolderArchive,
  FolderGit2,
  GitBranch,
  KeyRound,
  X,
} from "lucide-react";
import {
  useRef,
  useState,
} from "react";

import {
  DirectoryBrowserDialog,
} from "./DirectoryBrowserDialog";

import type {
  AddProjectRequest,
  LocalSourceMode,
  ProjectSourceType,
} from "../types/project";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (request: AddProjectRequest) => void;
};

export function AddProjectDialog({
  open,
  onClose,
  onSubmit,
}: Props) {
  const [sourceType, setSourceType] =
    useState<ProjectSourceType>("LOCAL");

  const [localMode, setLocalMode] =
    useState<LocalSourceMode>("FOLDER");

  const [name, setName] = useState("");

  const [repositoryUrl, setRepositoryUrl] =
    useState("");

  const [branch, setBranch] = useState("main");

  const [authenticationType, setAuthenticationType] =
    useState<"NONE" | "TOKEN">("NONE");

  const [localPath, setLocalPath] = useState("");

  const [localArchive, setLocalArchive] =
    useState<File | undefined>();

  const [localFiles, setLocalFiles] =
    useState<File[]>([]);

  const [
    directoryBrowserOpen,
    setDirectoryBrowserOpen,
  ] = useState(false);

  if (!open) {
    return null;
  }

  const localSourceValid =
    localMode === "PATH"
      ? localPath.trim().length > 0
      : localMode === "ZIP"
        ? Boolean(localArchive)
        : localFiles.length > 0;

  const remoteSourceValid =
    repositoryUrl.trim().length > 0 &&
    branch.trim().length > 0;

  const canSubmit =
    name.trim().length > 0 &&
    (
      sourceType === "LOCAL"
        ? localSourceValid
        : remoteSourceValid
    );

  function reset() {
    setSourceType("LOCAL");
    setLocalMode("FOLDER");
    setName("");
    setRepositoryUrl("");
    setBranch("main");
    setAuthenticationType("NONE");
    setLocalPath("");
    setLocalArchive(undefined);
    setLocalFiles([]);
  }

  function close() {
    reset();
    onClose();
  }

  function handleSubmit() {
    if (!canSubmit) {
      return;
    }

    onSubmit({
      name: name.trim(),
      sourceType,

      repositoryUrl:
        sourceType === "LOCAL"
          ? undefined
          : repositoryUrl.trim(),

      branch:
        sourceType === "LOCAL"
          ? undefined
          : branch.trim(),

      authenticationType:
        sourceType === "LOCAL"
          ? undefined
          : authenticationType,

      localMode:
        sourceType === "LOCAL"
          ? localMode
          : undefined,

      localPath:
        sourceType === "LOCAL" &&
        localMode === "PATH"
          ? localPath.trim()
          : undefined,

      localArchive:
        sourceType === "LOCAL" &&
        localMode === "ZIP"
          ? localArchive
          : undefined,

      localFiles:
        sourceType === "LOCAL" &&
        localMode === "FOLDER"
          ? localFiles
          : undefined,
    });

    reset();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between border-b border-slate-200 bg-white px-7 py-5">
          <div>
            <h2 className="text-xl font-semibold">
              Add automation project
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select where the automation project comes from.
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
          <label className="mb-2 block text-sm font-medium">
            Project name
          </label>

          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="Example: Guidewire Accelerators"
            className="mb-7 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />

          <div className="mb-3 text-sm font-medium">
            Project source
          </div>

          <div className="mb-7 grid grid-cols-1 gap-3 md:grid-cols-3">
            <SourceButton
              active={sourceType === "LOCAL"}
              title="Local project"
              description="Folder, ZIP or local path"
              icon={<FolderGit2 size={20} />}
              onClick={() => setSourceType("LOCAL")}
            />

            <SourceButton
              active={sourceType === "GITHUB"}
              title="GitHub"
              description="Clone a repository"
              icon={<GitBranch size={20} />}
              onClick={() => setSourceType("GITHUB")}
            />

            <SourceButton
              active={sourceType === "BITBUCKET"}
              title="Bitbucket"
              description="Clone a repository"
              icon={<GitBranch size={20} />}
              onClick={() => setSourceType("BITBUCKET")}
            />
          </div>

          {sourceType === "LOCAL" && (
            <LocalSource
              mode={localMode}
              onModeChange={setLocalMode}
              path={localPath}
              onPathChange={setLocalPath}
              archive={localArchive}
              onArchiveChange={setLocalArchive}
              files={localFiles}
              onFilesChange={setLocalFiles}
              onBrowsePath={() =>
                setDirectoryBrowserOpen(true)
              }
            />
          )}

          {sourceType !== "LOCAL" && (
            <RepositorySource
              provider={sourceType}
              repositoryUrl={repositoryUrl}
              branch={branch}
              authenticationType={authenticationType}
              onRepositoryUrlChange={setRepositoryUrl}
              onBranchChange={setBranch}
              onAuthenticationTypeChange={
                setAuthenticationType
              }
            />
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-7 py-4">
          <div className="hidden text-xs text-slate-500 md:block">
            The project will be analyzed before it becomes executable.
          </div>

          <div className="ml-auto flex gap-3">
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Analyze project
            </button>
          </div>
        </footer>
      </div>

      <DirectoryBrowserDialog
        open={directoryBrowserOpen}
        initialPath={
          localPath || undefined
        }
        onClose={() =>
          setDirectoryBrowserOpen(false)
        }
        onSelect={(selectedPath) => {
          setLocalPath(selectedPath);
          setDirectoryBrowserOpen(false);
        }}
      />
    </div>
  );
}

function SourceButton({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative rounded-xl border p-4 text-left transition",
        active
          ? "border-slate-950 bg-slate-50 ring-1 ring-slate-950"
          : "border-slate-200 bg-white hover:border-slate-400",
      ].join(" ")}
    >
      {active && (
        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-white">
          <Check size={13} />
        </div>
      )}

      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
        {icon}
      </div>

      <div className="text-sm font-semibold">
        {title}
      </div>

      <div className="mt-1 text-xs text-slate-500">
        {description}
      </div>
    </button>
  );
}

function LocalSource({
  mode,
  onModeChange,
  path,
  onPathChange,
  archive,
  onArchiveChange,
  files,
  onFilesChange,
  onBrowsePath,
}: {
  mode: LocalSourceMode;
  onModeChange: (mode: LocalSourceMode) => void;
  path: string;
  onPathChange: (path: string) => void;
  archive?: File;
  onArchiveChange: (file?: File) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  onBrowsePath: () => void;
}) {
  const folderInputRef =
    useRef<HTMLInputElement | null>(null);

  return (
    <div>
      <div className="mb-3 text-sm font-medium">
        Local source
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <LocalModeButton
          active={mode === "FOLDER"}
          title="Folder"
          description="Select project directory"
          icon={<Folder size={18} />}
          onClick={() => onModeChange("FOLDER")}
        />

        <LocalModeButton
          active={mode === "ZIP"}
          title="ZIP archive"
          description="Upload compressed project"
          icon={<FolderArchive size={18} />}
          onClick={() => onModeChange("ZIP")}
        />

        <LocalModeButton
          active={mode === "PATH"}
          title="Local path"
          description="Path visible to backend"
          icon={<FolderGit2 size={18} />}
          onClick={() => onModeChange("PATH")}
        />
      </div>

      {mode === "FOLDER" && (
        <div>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 transition hover:border-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white shadow-sm">
                <Folder size={21} />
              </div>

              <div>
                <div className="text-sm font-medium">
                  {files.length > 0
                    ? `${files.length} files selected`
                    : "Select project folder"}
                </div>

                <div className="mt-1 text-xs text-slate-500">
                  The browser will upload the selected project contents.
                </div>
              </div>
            </div>

            <span className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium">
              Browse
            </span>

            <input
              ref={folderInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) =>
                onFilesChange(
                  Array.from(event.target.files ?? []),
                )
              }
              {...({
                webkitdirectory: "",
                directory: "",
              } as React.InputHTMLAttributes<HTMLInputElement>)}
            />
          </label>

          {files.length > 0 && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
              Folder selected successfully. The project contents are ready for analysis.
            </div>
          )}
        </div>
      )}

      {mode === "ZIP" && (
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 transition hover:border-slate-500">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white shadow-sm">
              <FolderArchive size={21} />
            </div>

            <div>
              <div className="text-sm font-medium">
                {archive
                  ? archive.name
                  : "Select project ZIP"}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                Upload the complete automation project.
              </div>
            </div>
          </div>

          <span className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium">
            Browse
          </span>

          <input
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(event) =>
              onArchiveChange(
                event.target.files?.[0],
              )
            }
          />
        </label>
      )}

      {mode === "PATH" && (
        <div>
          <label className="mb-2 block text-sm font-medium">
            Project path
          </label>

          <div className="flex gap-3">
            <input
              value={path}
              onChange={(event) =>
                onPathChange(event.target.value)
              }
              placeholder="C:\Users\e-anty\Projects\my-project"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />

            <button
              type="button"
              onClick={onBrowsePath}
              className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium transition hover:bg-slate-50"
            >
              Browse
            </button>
          </div>

          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
            Select a directory accessible to the platform backend.
          </div>
        </div>
      )}
    </div>
  );
}

function LocalModeButton({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition",
        active
          ? "border-slate-950 bg-slate-50 ring-1 ring-slate-950"
          : "border-slate-200 bg-white hover:border-slate-400",
      ].join(" ")}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        {icon}
      </div>

      <div>
        <div className="text-sm font-medium">
          {title}
        </div>

        <div className="mt-0.5 text-xs text-slate-500">
          {description}
        </div>
      </div>
    </button>
  );
}

function RepositorySource({
  provider,
  repositoryUrl,
  branch,
  authenticationType,
  onRepositoryUrlChange,
  onBranchChange,
  onAuthenticationTypeChange,
}: {
  provider: "GITHUB" | "BITBUCKET";
  repositoryUrl: string;
  branch: string;
  authenticationType: "NONE" | "TOKEN";
  onRepositoryUrlChange: (value: string) => void;
  onBranchChange: (value: string) => void;
  onAuthenticationTypeChange: (
    value: "NONE" | "TOKEN",
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="mb-2 block text-sm font-medium">
          Repository URL
        </label>

        <input
          value={repositoryUrl}
          onChange={(event) =>
            onRepositoryUrlChange(event.target.value)
          }
          placeholder={
            provider === "GITHUB"
              ? "https://github.com/organization/repository.git"
              : "https://bitbucket.org/workspace/repository.git"
          }
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Branch
          </label>

          <input
            value={branch}
            onChange={(event) =>
              onBranchChange(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Authentication
          </label>

          <div className="relative">
            <KeyRound
              size={16}
              className="absolute left-3 top-3.5 text-slate-400"
            />

            <select
              value={authenticationType}
              onChange={(event) =>
                onAuthenticationTypeChange(
                  event.target.value as
                    | "NONE"
                    | "TOKEN",
                )
              }
              className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            >
              <option value="NONE">
                Public repository
              </option>

              <option value="TOKEN">
                Access token
              </option>
            </select>
          </div>
        </div>
      </div>

      {authenticationType === "TOKEN" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          Token configuration will be connected to the platform secret store. Credentials will not be persisted in project metadata.
        </div>
      )}
    </div>
  );
}







