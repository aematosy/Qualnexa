import {
  ChevronDown,
  ChevronRight,
  Cpu,
  Play,
  Tags,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  ProjectManifest,
} from "../types/api-project";

import type {
  ExecutionSelection,
} from "../types/execution";

import type {
  CustomCommandConfig,
  ExecutionPreferences,
} from "../types/execution-job";

import type {
  JdkCandidate,
} from "../types/environment";

import {
  TestTreePanel,
} from "./TestTreePanel";

type Props = {
  project: ProjectManifest | null;

  selection:
    ExecutionSelection | null;

  onClose: () => void;

  onConfirm: (
    projectId: string,
    selection: ExecutionSelection,
    environment?: string,
  ) => void;
};

export function ExecutionConfigurationDialog({
  project,
  selection,
  onClose,
  onConfirm,
}: Props) {
  const [
    environment,
    setEnvironment,
  ] = useState("");

  const [
    selectedLabels,
    setSelectedLabels,
  ] = useState<string[]>([]);

  const [
    labelMatch,
    setLabelMatch,
  ] = useState<"ANY" | "ALL">(
    "ANY",
  );

  const [
    jdks,
    setJdks,
  ] = useState<JdkCandidate[]>([]);

  const [
    selectedJdkPath,
    setSelectedJdkPath,
  ] = useState("");

  const [
    advancedOpen,
    setAdvancedOpen,
  ] = useState(false);

  const [
    customCommandEnabled,
    setCustomCommandEnabled,
  ] = useState(false);

  const [
    customExecutable,
    setCustomExecutable,
  ] = useState("");

  const [
    customArguments,
    setCustomArguments,
  ] = useState("");

  const [
    customWorkingDirectory,
    setCustomWorkingDirectory,
  ] = useState("");

  const [
    customTimeoutMinutes,
    setCustomTimeoutMinutes,
  ] = useState("30");

  const requiresJava =
    useMemo(
      () =>
        project?.runtimes.some(
          (runtime) =>
            runtime.type === "JAVA",
        ) ??
        false,
      [project],
    );

  useEffect(() => {
    if (!project || !requiresJava) {
      setJdks([]);
      return;
    }

    void (async () => {
      try {
        const response =
          await fetch(
            "/api/environment/jdks",
          );

        if (response.ok) {
          setJdks(
            (await response.json()) as JdkCandidate[],
          );
        }
      } catch {
        setJdks([]);
      }
    })();
  }, [project, requiresJava]);

  useEffect(() => {
    if (!project) {
      return;
    }

    void (async () => {
      try {
        const response =
          await fetch(
            `/api/projects/${project.id}/execution-preferences`,
          );

        if (!response.ok) {
          return;
        }

        const preferences =
          (await response.json()) as ExecutionPreferences;

        setSelectedJdkPath(
          preferences.jdkPath ?? "",
        );

        if (preferences.customCommand) {
          setCustomCommandEnabled(true);
          setAdvancedOpen(true);

          setCustomExecutable(
            preferences.customCommand.executable,
          );

          setCustomArguments(
            preferences.customCommand.arguments.join(
              " ",
            ),
          );

          setCustomWorkingDirectory(
            preferences.customCommand.workingDirectory ??
              "",
          );

          setCustomTimeoutMinutes(
            String(
              preferences.customCommand.timeoutMinutes ??
                30,
            ),
          );
        } else {
          setCustomCommandEnabled(false);
        }
      } catch {
        // Keep defaults if preferences cannot be loaded.
      }
    })();
  }, [project]);

  const defaultEnvironment =
    useMemo(() => {
      if (!project) {
        return "";
      }

      return (
        project.environments.find(
          (item) =>
            item.isDefault,
        )?.id ??
        project.environments[0]?.id ??
        ""
      );
    }, [project]);

  useEffect(() => {
    setEnvironment(
      defaultEnvironment,
    );
  }, [defaultEnvironment]);

  useEffect(() => {
    if (
      selection?.type ===
      "LABELS"
    ) {
      setSelectedLabels(
        selection.labels,
      );

      setLabelMatch(
        selection.labelMatch,
      );

      return;
    }

    setSelectedLabels([]);
    setLabelMatch("ANY");
  }, [selection]);

  const scopedContainers =
    useMemo(() => {
      if (!project) {
        return [];
      }

      if (
        selection?.type ===
          "LABELS" &&
        selection.containerId
      ) {
        return project.testCatalog.containers.filter(
          (container) =>
            container.id ===
            selection.containerId,
        );
      }

      return project.testCatalog.containers;
    }, [
      project,
      selection,
    ]);

  const availableLabels =
    useMemo(() => {
      const labels =
        new Set<string>();

      for (
        const container
        of scopedContainers
      ) {
        for (
          const label
          of container.labels
        ) {
          labels.add(label);
        }

        for (
          const test
          of container.tests
        ) {
          for (
            const label
            of test.labels
          ) {
            labels.add(label);
          }
        }
      }

      return [
        ...labels,
      ].sort(
        (left, right) =>
          left.localeCompare(
            right,
          ),
      );
    }, [scopedContainers]);

  if (
    !project ||
    !selection
  ) {
    return null;
  }

  const activeProject =
    project;

  const activeSelection =
    selection;

  const labelVocabulary =
    resolveLabelVocabulary(
      activeProject,
      activeSelection,
    );

  const selectionDescription =
    describeSelection(
      activeProject,
      activeSelection,
    );

  const requiresLabelSelection =
    activeSelection.type ===
    "LABELS";

  const canPrepare =
    !requiresLabelSelection ||
    selectedLabels.length > 0;

  function toggleLabel(
    label: string,
  ) {
    setSelectedLabels(
      (current) =>
        current.includes(label)
          ? current.filter(
              (item) =>
                item !== label,
            )
          : [
              ...current,
              label,
            ],
    );
  }

  function confirm() {
    const resolvedSelection:
      ExecutionSelection =
      activeSelection.type ===
      "LABELS"
        ? {
            type: "LABELS",
            labels:
              selectedLabels,
            labelMatch,
            ...(activeSelection.containerId
              ? {
                  containerId:
                    activeSelection.containerId,
                }
              : {}),
          }
        : activeSelection;

    void savePreferences();

    onConfirm(
      activeProject.id,
      resolvedSelection,
      environment ||
        undefined,
    );
  }

  async function savePreferences() {

    const customCommand:
      CustomCommandConfig | null =
      customCommandEnabled &&
      customExecutable.trim()
        ? {
            executable:
              customExecutable.trim(),

            arguments:
              customArguments
                .trim()
                .split(/\s+/)
                .filter(
                  (value) =>
                    value.length > 0,
                ),

            workingDirectory:
              customWorkingDirectory.trim() ||
              undefined,

            timeoutMinutes:
              Number(
                customTimeoutMinutes,
              ) || undefined,
          }
        : null;

    try {
      await fetch(
        `/api/projects/${activeProject.id}/execution-preferences`,
        {
          method: "PUT",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            jdkPath:
              selectedJdkPath ||
              null,

            customCommand,
          }),
        },
      );
    } catch {
      // Execution will fall back to previously saved preferences.
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-5 backdrop-blur-md">
      <div className="glass-panel animate-pop-in flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[22px] border border-[var(--hairline)] shadow-[0_24px_64px_rgba(0,0,0,0.25)]">

        <header className="flex items-center justify-between border-b border-[var(--hairline)] px-6 py-5">
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight">
              Execution configuration
            </h2>

            <p className="mt-1 text-[11.5px] text-[var(--text-quaternary)]">
              Configure the execution before preparing the plan.
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

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-6">

          <section className="grid gap-4 md:grid-cols-2">
            <InfoCard
              label="Project"
              value={
                activeProject.name
              }
            />

            <InfoCard
              label="Selection"
              value={
                selectionDescription
              }
            />
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-[13px] font-semibold">
              <Play size={15} className="text-accent" />
              Features & Scenarios
            </div>

            <div className="max-h-64 overflow-y-auto rounded-[16px] border border-[var(--hairline)] bg-[var(--fill-quinary)]">
              {activeProject.testCatalog.containers.length > 0 ? (
                <TestTreePanel
                  project={activeProject}
                  onSelectTest={(testSelection) => {
                    onConfirm(activeProject.id, testSelection, environment);
                  }}
                />
              ) : (
                <div className="p-4 text-[12.5px] text-[var(--text-quaternary)]">
                  No tests found in this project
                </div>
              )}
            </div>
          </section>

          {requiresLabelSelection && (
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[13px] font-semibold">
                    <Tags size={15} className="text-accent" />
                    {labelVocabulary}
                  </div>

                  <p className="mt-1 text-[11.5px] text-[var(--text-quaternary)]">
                    Select one or more values discovered from this execution scope.
                  </p>
                </div>

                <div className="flex shrink-0 rounded-full border border-[var(--hairline-strong)] bg-[var(--fill-quaternary)] p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setLabelMatch(
                        "ANY",
                      )
                    }
                    className={[
                      "rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                      labelMatch ===
                      "ANY"
                        ? "bg-accent text-white shadow-sm shadow-accent/30"
                        : "text-[var(--text-secondary)] hover:bg-[var(--fill-tertiary)]",
                    ].join(" ")}
                  >
                    ANY
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setLabelMatch(
                        "ALL",
                      )
                    }
                    className={[
                      "rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                      labelMatch ===
                      "ALL"
                        ? "bg-accent text-white shadow-sm shadow-accent/30"
                        : "text-[var(--text-secondary)] hover:bg-[var(--fill-tertiary)]",
                    ].join(" ")}
                  >
                    ALL
                  </button>
                </div>
              </div>

              {availableLabels.length >
              0 ? (
                <div className="max-h-64 overflow-y-auto rounded-[16px] border border-[var(--hairline)] bg-[var(--fill-quinary)] p-3">
                  <div className="flex flex-wrap gap-2">
                    {availableLabels.map(
                      (label) => {
                        const selected =
                          selectedLabels.includes(
                            label,
                          );

                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() =>
                              toggleLabel(
                                label,
                              )
                            }
                            className={[
                              "rounded-full border px-3 py-2 text-[11.5px] font-medium transition",
                              selected
                                ? "border-accent bg-accent text-white shadow-sm shadow-accent/30"
                                : "border-[var(--hairline-strong)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--hairline-heavy)] hover:bg-[var(--fill-quaternary)]",
                            ].join(" ")}
                          >
                            {label}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-[16px] border border-[#ff9f0a]/30 bg-[#ff9f0a]/10 px-4 py-3">
                  <div className="text-[13px] font-medium text-[var(--badge-orange-text)]">
                    No labels were discovered
                  </div>

                  <p className="mt-1 text-[11.5px] text-[var(--badge-orange-text)]/85">
                    The selected execution scope does not expose any labels.
                  </p>
                </div>
              )}

              <div className="text-[11.5px] text-[var(--text-quaternary)]">
                {selectedLabels.length} selected
              </div>
            </section>
          )}

          <section>
            <label className="mb-2 block text-[13px] font-semibold">
              Environment
            </label>

            <input
              list="qualnexa-environment-suggestions"
              value={environment}
              onChange={(event) =>
                setEnvironment(
                  event.target.value,
                )
              }
              placeholder="dev, qa, staging..."
              className="w-full rounded-[12px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-3 text-[13px] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
            />

            <datalist id="qualnexa-environment-suggestions">
              {activeProject.environments.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.displayName}
                  </option>
                ),
              )}
            </datalist>

            {activeProject.environments.length > 0 ? (
              <EnvironmentSource
                project={activeProject}
                environment={environment}
              />
            ) : (
              <p className="mt-2 text-[11.5px] leading-5 text-[var(--text-quaternary)]">
                No fixed environment list was detected for this project —
                type any value your test suite expects (it will be passed
                through, e.g. as <code className="rounded bg-[var(--fill-quaternary)] px-1 py-0.5">-Dkarate.env</code>,{" "}
                <code className="rounded bg-[var(--fill-quaternary)] px-1 py-0.5">serenity.environment</code>, or an equivalent
                environment variable for your framework).
              </p>
            )}
          </section>

          <section>
            <div className="mb-2 text-[13px] font-semibold">
              Runtime requirements
            </div>

            <div className="flex flex-wrap gap-2">
              {activeProject.runtimes.map(
                (runtime) => (
                  <span
                    key={`${runtime.type}:${runtime.versionConstraint ?? ""}`}
                    className="rounded-full border border-[var(--hairline-strong)] bg-[var(--fill-quaternary)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--text-secondary)]"
                  >
                    {runtime.type}
                    {runtime.versionConstraint
                      ? ` ${runtime.versionConstraint}`
                      : ""}
                  </span>
                ),
              )}

              {activeProject.buildTools.map(
                (buildTool) => (
                  <span
                    key={`${buildTool.type}:${buildTool.versionConstraint ?? ""}`}
                    className="rounded-full border border-[var(--hairline-strong)] bg-[var(--fill-quaternary)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--text-secondary)]"
                  >
                    {buildTool.type}
                    {buildTool.versionConstraint
                      ? ` ${buildTool.versionConstraint}`
                      : ""}
                  </span>
                ),
              )}
            </div>
          </section>

          {requiresJava && (
            <section>
              <label className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
                <Cpu size={14} className="text-accent" />
                Java virtual machine
              </label>

              <select
                value={selectedJdkPath}
                onChange={(event) =>
                  setSelectedJdkPath(
                    event.target.value,
                  )
                }
                className="w-full rounded-[12px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-3 text-[13px] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
              >
                <option value="">
                  System default
                </option>

                {jdks.map((jdk) => (
                  <option
                    key={jdk.path}
                    value={jdk.path}
                  >
                    {jdk.version ?? "?"}
                    {jdk.vendor
                      ? ` — ${jdk.vendor}`
                      : ""}
                    {jdk.isSystemDefault
                      ? " (system default)"
                      : ""}
                    {" — "}
                    {jdk.path}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-[11.5px] leading-5 text-[var(--text-quaternary)]">
                Runs this execution with the selected JDK without changing
                your system's default Java installation.
              </p>
            </section>
          )}

          <section>
            <button
              type="button"
              onClick={() =>
                setAdvancedOpen(
                  (current) => !current,
                )
              }
              className="flex w-full items-center gap-2 text-[13px] font-semibold"
            >
              {advancedOpen ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              Advanced: custom command
            </button>

            {advancedOpen && (
              <div className="mt-3 space-y-4 rounded-[16px] border border-[var(--hairline)] bg-[var(--fill-quaternary)] p-4">
                <label className="flex items-center gap-2 text-[12.5px] text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={customCommandEnabled}
                    onChange={(event) =>
                      setCustomCommandEnabled(
                        event.target.checked,
                      )
                    }
                    className="h-4 w-4 accent-accent"
                  />
                  Run this project with a custom command instead of the
                  detected framework recipe
                </label>

                {customCommandEnabled && (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-[11.5px] font-medium text-[var(--text-tertiary)]">
                        Executable
                      </label>

                      <input
                        value={customExecutable}
                        onChange={(event) =>
                          setCustomExecutable(
                            event.target.value,
                          )
                        }
                        placeholder="mvn"
                        className="w-full rounded-[10px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-2 font-mono text-[11.5px] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[11.5px] font-medium text-[var(--text-tertiary)]">
                        Arguments
                      </label>

                      <input
                        value={customArguments}
                        onChange={(event) =>
                          setCustomArguments(
                            event.target.value,
                          )
                        }
                        placeholder="test -Dkarate.env=qa"
                        className="w-full rounded-[10px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-2 font-mono text-[11.5px] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-[11.5px] font-medium text-[var(--text-tertiary)]">
                          Working directory
                        </label>

                        <input
                          value={customWorkingDirectory}
                          onChange={(event) =>
                            setCustomWorkingDirectory(
                              event.target.value,
                            )
                          }
                          placeholder={
                            activeProject.source.location
                          }
                          className="w-full rounded-[10px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-2 font-mono text-[11.5px] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[11.5px] font-medium text-[var(--text-tertiary)]">
                          Timeout (minutes)
                        </label>

                        <input
                          value={customTimeoutMinutes}
                          onChange={(event) =>
                            setCustomTimeoutMinutes(
                              event.target.value,
                            )
                          }
                          type="number"
                          min="1"
                          className="w-full rounded-[10px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-2 text-[11.5px] outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
                        />
                      </div>
                    </div>

                    <p className="text-[11.5px] leading-5 text-[var(--text-quaternary)]">
                      Use this for frameworks Qualnexa does not know yet
                      (Cypress, custom scripts, etc). The command runs from
                      the working directory above with the selected JVM
                      applied if this project requires Java.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>
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
            disabled={
              !canPrepare
            }
            onClick={
              confirm
            }
            className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-accent/30 transition hover:bg-accent-dark active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-[var(--fill-secondary)] disabled:text-[var(--text-quinary)] disabled:shadow-none"
          >
            <Play size={15} />
            Prepare execution
          </button>
        </footer>
      </div>
    </div>
  );
}

function resolveLabelVocabulary(
  project: ProjectManifest,
  selection: ExecutionSelection,
): string {
  if (
    selection.type ===
      "LABELS" &&
    selection.containerId
  ) {
    const container =
      project.testCatalog.containers.find(
        (item) =>
          item.id ===
          selection.containerId,
      );

    if (container) {
      return (
        container.vocabulary.label
      );
    }
  }

  return (
    project.frameworks[0]
      ?.vocabulary.label ??
    "Labels"
  );
}

function describeSelection(
  project: ProjectManifest,
  selection: ExecutionSelection,
): string {
  if (
    selection.type ===
    "ALL"
  ) {
    return "All";
  }

  if (
    selection.type ===
    "CONTAINER"
  ) {
    return (
      project.testCatalog.containers.find(
        (container) =>
          container.id ===
          selection.containerId,
      )?.name ??
      "Container"
    );
  }

  if (
    selection.type ===
    "TESTS"
  ) {
    if (
      selection.testIds.length ===
      1
    ) {
      for (
        const container
        of project.testCatalog.containers
      ) {
        const test =
          container.tests.find(
            (item) =>
              item.id ===
              selection.testIds[0],
          );

        if (test) {
          return test.name;
        }
      }
    }

    return `${selection.testIds.length} selected`;
  }

  if (
    selection.type ===
      "LABELS" &&
    selection.containerId
  ) {
    return (
      project.testCatalog.containers.find(
        (container) =>
          container.id ===
          selection.containerId,
      )?.name ??
      "Label selection"
    );
  }

  return "Label selection";
}

function EnvironmentSource({
  project,
  environment,
}: {
  project: ProjectManifest;
  environment: string;
}) {
  if (!environment) {
    return null;
  }

  const selected =
    project.environments.find(
      (item) =>
        item.id ===
        environment,
    );

  if (!selected?.source) {
    return null;
  }

  return (
    <div className="mt-2 text-[11.5px] text-[var(--text-quaternary)]">
      Discovered from:{" "}
      <span className="font-medium text-[var(--text-secondary)]">
        {selected.source}
      </span>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[16px] border border-[var(--hairline)] bg-[var(--fill-quaternary)] p-4">
      <div className="text-[11.5px] font-medium text-[var(--text-quaternary)]">
        {label}
      </div>

      <div className="mt-1 break-words text-[13px] font-semibold">
        {value}
      </div>
    </div>
  );
}
