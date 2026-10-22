import {
  ChevronDown,
  ChevronRight,
  Play,
  Sparkles,
} from "lucide-react";

import type {
  ProjectManifest,
} from "../types/api-project";

import type {
  ExecutionSelection,
} from "../types/execution";

import {
  useMemo,
  useState,
} from "react";

type Props = {
  project: ProjectManifest;
  onSelectTest: (selection: ExecutionSelection) => void;
};

export function TestTreePanel({ project, onSelectTest }: Props) {
  const [expandedContainers, setExpandedContainers] = useState<string[]>(
    () => project.testCatalog.containers.slice(0, 1).map((container) => container.id),
  );

  const totalScenarios = useMemo(
    () => project.testCatalog.containers.reduce((sum, container) => sum + container.tests.length, 0),
    [project.testCatalog.containers],
  );

  function toggleContainer(containerId: string) {
    setExpandedContainers((prev) =>
      prev.includes(containerId)
        ? prev.filter((id) => id !== containerId)
        : [...prev, containerId],
    );
  }

  if (project.testCatalog.containers.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-[var(--hairline-strong)] bg-[var(--fill-quinary)] p-8 text-center text-[12.5px] text-[var(--text-quaternary)]">
        No tests found
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[var(--hairline)] bg-[var(--fill-quinary)] px-4 py-3">
        <div>
          <div className="text-[13px] font-semibold">Discovered test tree</div>
          <div className="mt-1 text-[11.5px] text-[var(--text-quaternary)]">
            {project.testCatalog.containers.length} features · {totalScenarios} scenarios
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSelectTest({ type: "ALL" })}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#0a84ff] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#0074e8]"
        >
          <Sparkles size={14} />
          Run full tree
        </button>
      </div>

      <div className="space-y-3">
        {project.testCatalog.containers.map((container, index) => {
          const isExpanded = expandedContainers.includes(container.id);
          const scenarioCount = container.tests.length;

          return (
            <div
              key={container.id}
              className="overflow-hidden rounded-[24px] border border-[var(--hairline)] bg-[var(--surface)] shadow-[0_8px_22px_rgba(0,0,0,0.05)]"
            >
              <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() => toggleContainer(container.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--fill-quinary)] text-[var(--text-secondary)] transition hover:bg-[var(--fill-tertiary)]"
                >
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#0a84ff]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0a84ff]">
                      Feature {index + 1}
                    </span>
                    <span className="rounded-full bg-[var(--fill-quinary)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-quaternary)]">
                      {scenarioCount} scenarios
                    </span>
                  </div>
                  <div className="mt-2 truncate text-[14px] font-semibold tracking-tight text-[var(--text-primary)]">
                    {container.name}
                  </div>
                  <div className="mt-1 truncate text-[11.5px] text-[var(--text-quaternary)]">
                    {container.path}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTest({ type: "CONTAINER", containerId: container.id })}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#0a84ff]/20 bg-[#0a84ff]/10 px-4 py-2 text-[12px] font-semibold text-[#0a84ff] transition hover:bg-[#0a84ff] hover:text-white"
                  title="Run all scenarios in this feature"
                >
                  <Play size={14} />
                  Run feature
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-[var(--hairline)] bg-[var(--fill-quinary)]/45 px-4 py-3">
                  <div className="space-y-2">
                    {container.tests.map((test, testIndex) => (
                      <div
                        key={test.id}
                        className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] px-4 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.03)] sm:flex-nowrap"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--fill-quinary)] text-[11px] font-semibold text-[var(--text-secondary)]">
                          {testIndex + 1}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium text-[var(--text-primary)]">
                            {test.name}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {test.labels.slice(0, 4).map((label) => (
                              <span
                                key={label}
                                className="rounded-full bg-[var(--fill-quinary)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-quaternary)]"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectTest({ type: "TESTS", testIds: [test.id] })}
                          className="inline-flex items-center gap-2 rounded-2xl border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-2 text-[12px] font-semibold text-[var(--text-primary)] transition hover:border-[#0a84ff]/35 hover:bg-[#0a84ff] hover:text-white"
                          title="Run this scenario"
                        >
                          <Play size={14} />
                          Run scenario
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
