import {
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

    onConfirm(
      activeProject.id,
      resolvedSelection,
      environment ||
        undefined,
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-5">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Execution configuration
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Configure the execution before preparing the plan.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
          >
            <X size={19} />
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

          {requiresLabelSelection && (
            <section className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Tags size={16} />
                    {labelVocabulary}
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Select one or more values discovered from this execution scope.
                  </p>
                </div>

                <div className="flex shrink-0 rounded-lg border border-slate-300 bg-white p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setLabelMatch(
                        "ANY",
                      )
                    }
                    className={[
                      "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                      labelMatch ===
                      "ANY"
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:bg-slate-100",
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
                      "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                      labelMatch ===
                      "ALL"
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:bg-slate-100",
                    ].join(" ")}
                  >
                    ALL
                  </button>
                </div>
              </div>

              {availableLabels.length >
              0 ? (
                <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
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
                              "rounded-full border px-3 py-2 text-xs font-medium transition",
                              selected
                                ? "border-slate-950 bg-slate-950 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100",
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
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="text-sm font-medium text-amber-900">
                    No labels were discovered
                  </div>

                  <p className="mt-1 text-xs text-amber-700">
                    The selected execution scope does not expose any labels.
                  </p>
                </div>
              )}

              <div className="text-xs text-slate-500">
                {selectedLabels.length} selected
              </div>
            </section>
          )}

          <section>
            <label className="mb-2 block text-sm font-semibold text-slate-900">
              Environment
            </label>

            {activeProject.environments.length >
            0 ? (
              <>
                <select
                  value={
                    environment
                  }
                  onChange={(
                    event,
                  ) =>
                    setEnvironment(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                >
                  {activeProject.environments.map(
                    (item) => (
                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
                      >
                        {
                          item.displayName
                        }
                      </option>
                    ),
                  )}
                </select>

                <EnvironmentSource
                  project={
                    activeProject
                  }
                  environment={
                    environment
                  }
                />
              </>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="text-sm font-medium text-amber-900">
                  No environments were discovered
                </div>

                <p className="mt-1 text-xs leading-5 text-amber-700">
                  The active framework plugin did not expose environments for this project.
                </p>
              </div>
            )}
          </section>

          <section>
            <div className="mb-2 text-sm font-semibold text-slate-900">
              Runtime requirements
            </div>

            <div className="flex flex-wrap gap-2">
              {activeProject.runtimes.map(
                (runtime) => (
                  <span
                    key={`${runtime.type}:${runtime.versionConstraint ?? ""}`}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
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
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
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
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
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
            className="flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Play size={16} />
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
    <div className="mt-2 text-xs text-slate-500">
      Discovered from:{" "}
      <span className="font-medium text-slate-700">
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-medium text-slate-500">
        {label}
      </div>

      <div className="mt-1 break-words text-sm font-semibold text-slate-950">
        {value}
      </div>
    </div>
  );
}