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
    useState<LocalSourceMode>("PATH");

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
    setLocalMode("PATH");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-md">
      <div className="glass-panel animate-pop-in flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[22px] border border-[var(--hairline)] shadow-[0_24px_64px_rgba(0,0,0,0.25)]">
        <header className="flex shrink-0 items-start justify-between border-b border-[var(--hairline)] px-7 py-5">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight">
              Add automation project
            </h2>

            <p className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">
              Select where the automation project comes from.
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            className="rounded-full p-2 text-[var(--text-quaternary)] transition hover:bg-[var(--fill-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
          <label className="mb-2 block text-[12.5px] font-medium text-[var(--text-secondary)]">
            Project name
          </label>

          <input
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            placeholder="Example: Guidewire Accelerators"
            className="mb-7 w-full rounded-[12px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-3 text-[13px] outline-none transition focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/25"
          />

          <div className="mb-3 text-[12.5px] font-medium text-[var(--text-secondary)]">
            Project source
          </div>

          <div className="mb-7 grid grid-cols-1 gap-3 md:grid-cols-3">
            <SourceButton
              active={sourceType === "LOCAL"}
              title="Local project"
              description="Folder, ZIP or local path"
              icon={<FolderGit2 size={19} />}
              onClick={() => setSourceType("LOCAL")}
            />

            <SourceButton
              active={sourceType === "GITHUB"}
              title="GitHub"
              description="Clone a repository"
              icon={<GitBranch size={19} />}
              onClick={() => setSourceType("GITHUB")}
            />

            <SourceButton
              active={sourceType === "BITBUCKET"}
              title="Bitbucket"
              description="Clone a repository"
              icon={<GitBranch size={19} />}
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

        <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-[var(--hairline)] bg-[var(--fill-quinary)] px-7 py-4">
          <div className="hidden text-[11.5px] text-[var(--text-quaternary)] md:block">
            The project will be analyzed before it becomes executable.
          </div>

          <div className="ml-auto flex gap-3">
            <button
              type="button"
              onClick={close}
              className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-medium transition hover:bg-[var(--fill-tertiary)] active:scale-[0.97]"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="rounded-full bg-[var(--accent-strong)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(10,132,255,0.28)] transition hover:bg-[var(--accent-strong-hover)] active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-[var(--fill-secondary)] disabled:text-[var(--text-quinary)] disabled:shadow-none"
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
        "relative rounded-[16px] border p-4 text-left transition",
        active
          ? "border-[var(--accent-soft-border)] bg-[var(--accent-soft-surface)] ring-1 ring-[var(--accent-soft-border)]"
          : "border-[var(--hairline-strong)] bg-[var(--surface)] hover:border-[var(--hairline-heavy)]",
      ].join(" ")}
    >
      {active && (
        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-strong)] text-white">
          <Check size={13} />
        </div>
      )}

      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--fill-tertiary)] text-[var(--text-secondary)]">
        {icon}
      </div>

      <div className="text-[13px] font-semibold">
        {title}
      </div>

      <div className="mt-1 text-[11.5px] text-[var(--text-quaternary)]">
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
      <div className="mb-3 text-[12.5px] font-medium text-[var(--text-secondary)]">
        Local source
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <LocalModeButton
          active={mode === "PATH"}
          title="Local path"
          description="Path visible to backend"
          icon={<FolderGit2 size={17} />}
          onClick={() => onModeChange("PATH")}
        />

        <LocalModeButton
          active={mode === "FOLDER"}
          title="Folder"
          description="Select project directory"
          icon={<Folder size={17} />}
          onClick={() => onModeChange("FOLDER")}
        />

        <LocalModeButton
          active={mode === "ZIP"}
          title="ZIP archive"
          description="Upload compressed project"
          icon={<FolderArchive size={17} />}
          onClick={() => onModeChange("ZIP")}
        />
      </div>

      {mode === "FOLDER" && (
        <div>
          <label className="flex cursor-pointer items-center justify-between rounded-[16px] border border-dashed border-[var(--hairline-strong)] bg-[var(--fill-quinary)] px-5 py-6 transition hover:border-[#0a84ff]/50">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--surface)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
                <Folder size={20} />
              </div>

              <div>
                <div className="text-[13px] font-medium">
                  {files.length > 0
                    ? `${files.length} files selected`
                    : "Select project folder"}
                </div>

                <div className="mt-1 text-[11.5px] text-[var(--text-quaternary)]">
                  The browser will upload the selected project contents.
                </div>
              </div>
            </div>

            <span className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-2 text-[11.5px] font-medium">
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
            <div className="mt-3 rounded-[14px] border border-[#34c759]/30 bg-[#34c759]/10 px-4 py-3 text-[11.5px] text-[var(--badge-green-text)]">
              Folder selected successfully. The project contents are ready for analysis.
            </div>
          )}
        </div>
      )}

      {mode === "ZIP" && (
        <label className="flex cursor-pointer items-center justify-between rounded-[16px] border border-dashed border-[var(--hairline-strong)] bg-[var(--fill-quinary)] px-5 py-6 transition hover:border-[#0a84ff]/50">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--surface)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
              <FolderArchive size={20} />
            </div>

            <div>
              <div className="text-[13px] font-medium">
                {archive
                  ? archive.name
                  : "Select project ZIP"}
              </div>

              <div className="mt-1 text-[11.5px] text-[var(--text-quaternary)]">
                Upload the complete automation project.
              </div>
            </div>
          </div>

          <span className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-2 text-[11.5px] font-medium">
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
          <label className="mb-2 block text-[12.5px] font-medium text-[var(--text-secondary)]">
            Project path
          </label>

          <div className="flex gap-3">
            <input
              autoFocus
              type="text"
              value={path}
              onChange={(event) =>
                onPathChange(event.target.value)
              }
              placeholder="/Users/me/Projects/my-project or C:\Users\me\Projects\my-project"
              className="min-w-0 flex-1 rounded-[12px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-3 font-mono text-[12.5px] outline-none transition focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/25"
            />

            <button
              type="button"
              onClick={onBrowsePath}
              className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-5 py-3 text-[13px] font-medium transition hover:bg-[var(--fill-tertiary)] active:scale-[0.97]"
            >
              Browse
            </button>
          </div>

          <div className="mt-3 rounded-[14px] border border-[#0a84ff]/20 bg-[#0a84ff]/8 px-4 py-3 text-[11.5px] leading-5 text-[var(--badge-blue-text)]">
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
  disabled,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "flex items-center gap-3 rounded-[14px] border px-4 py-3 text-left transition",
        disabled
          ? "cursor-not-allowed border-[var(--hairline-strong)] bg-[var(--fill-quaternary)] opacity-60"
          : active
            ? "border-[#0a84ff] bg-[#0a84ff]/[0.06] ring-1 ring-[#0a84ff]/40"
            : "border-[var(--hairline-strong)] bg-[var(--surface)] hover:border-[var(--hairline-heavy)]",
      ].join(" ")}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--fill-tertiary)]">
        {icon}
      </div>

      <div>
        <div className="text-[13px] font-medium">
          {title}
        </div>

        <div className="mt-0.5 text-[11.5px] text-[var(--text-quaternary)]">
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
        <label className="mb-2 block text-[12.5px] font-medium text-[var(--text-secondary)]">
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
          className="w-full rounded-[12px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-3 text-[13px] outline-none transition focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/25"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-[12.5px] font-medium text-[var(--text-secondary)]">
            Branch
          </label>

          <input
            value={branch}
            onChange={(event) =>
              onBranchChange(event.target.value)
            }
            className="w-full rounded-[12px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-3 text-[13px] outline-none transition focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/25"
          />
        </div>

        <div>
          <label className="mb-2 block text-[12.5px] font-medium text-[var(--text-secondary)]">
            Authentication
          </label>

          <div className="relative">
            <KeyRound
              size={15}
              className="absolute left-3 top-3.5 text-[var(--text-quinary)]"
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
              className="w-full appearance-none rounded-[12px] border border-[var(--hairline-strong)] bg-[var(--surface)] py-3 pl-10 pr-4 text-[13px] outline-none transition focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/25"
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
        <div className="rounded-[14px] border border-[#ff9f0a]/30 bg-[#ff9f0a]/10 px-4 py-3 text-[11.5px] leading-5 text-[var(--badge-orange-text)]">
          Token configuration will be connected to the platform secret store. Credentials will not be persisted in project metadata.
        </div>
      )}
    </div>
  );
}
