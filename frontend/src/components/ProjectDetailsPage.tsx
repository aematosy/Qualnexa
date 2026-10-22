import {
  ChevronLeft,
  Play,
  Tags,
  TestTube2,
} from "lucide-react";

import type {
  ProjectManifest,
} from "../types/api-project";

import type {
  ExecutionSelection,
} from "../types/execution";

import {
  TestTreePanel,
} from "./TestTreePanel";

type Props = {
  project: ProjectManifest;
  onBack: () => void;
  onExecute: (selection: ExecutionSelection) => void;
};

export function ProjectDetailsPage({ project, onBack, onExecute }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--surface)]">
      {/* Header */}
      <header className="border-b border-[var(--hairline)] bg-[var(--surface)] px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg p-2 hover:bg-[var(--fill-quinary)] transition"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-[18px] font-semibold">{project.name}</h1>
              <p className="text-[12.5px] text-[var(--text-quaternary)]">{project.source.location}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onExecute({ type: "ALL" })}
              className="flex items-center gap-2 rounded-lg bg-[#0a84ff] hover:bg-[#0074e8] px-4 py-2 text-[12.5px] font-semibold text-white transition"
            >
              <Play size={16} />
              Run All
            </button>
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Configuration */}
        <aside className="w-80 border-r border-[var(--hairline)] overflow-y-auto bg-[var(--fill-quinary)]">
          <div className="p-6 space-y-6">
            {/* Project Info */}
            <section className="space-y-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text-quaternary)]">
                Project Info
              </h2>

              <div className="space-y-2 text-[12px]">
                <div>
                  <div className="text-[var(--text-quaternary)]">Status</div>
                  <div className="mt-1 inline-block rounded-full bg-[var(--fill-tertiary)] px-2.5 py-1 font-medium">
                    {project.inspectionStatus}
                  </div>
                </div>

                <div>
                  <div className="text-[var(--text-quaternary)]">Frameworks</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {project.frameworks.map((fw) => (
                      <span key={fw.id} className="rounded-full bg-[var(--fill-quaternary)] px-2.5 py-1">
                        {fw.displayName}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[var(--text-quaternary)]">Runtimes</div>
                  <div className="mt-1">
                    {project.runtimes.map((rt) => (
                      <div key={rt.type} className="text-[11px]">
                        {rt.type} {rt.versionConstraint && `(${rt.versionConstraint})`}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[var(--text-quaternary)]">Build Tools</div>
                  <div className="mt-1">
                    {project.buildTools.map((bt) => (
                      <div key={bt.type} className="text-[11px]">
                        {bt.type} {bt.versionConstraint && `(${bt.versionConstraint})`}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Test Statistics */}
            <section className="space-y-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text-quaternary)]">
                Test Statistics
              </h2>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-[var(--fill-quaternary)] p-3">
                  <div className="text-[18px] font-bold text-[#0a84ff]">
                    {project.testCatalog.containers.length}
                  </div>
                  <div className="text-[11px] text-[var(--text-quaternary)]">Features</div>
                </div>

                <div className="rounded-lg bg-[var(--fill-quaternary)] p-3">
                  <div className="text-[18px] font-bold text-[#34c759]">
                    {project.testCatalog.testCount}
                  </div>
                  <div className="text-[11px] text-[var(--text-quaternary)]">Scenarios</div>
                </div>
              </div>
            </section>

            {/* Available Tags */}
            {project.testCatalog.labels.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--text-quaternary)] flex items-center gap-2">
                  <Tags size={14} />
                  Available Tags
                </h2>

                <div className="flex flex-wrap gap-1">
                  {project.testCatalog.labels.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => onExecute({ type: "LABELS", labels: [label], labelMatch: "ANY" })}
                      className="rounded-full bg-[var(--fill-quaternary)] hover:bg-[#0a84ff] hover:text-white px-2.5 py-1 text-[11px] font-medium transition"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        </aside>

        {/* Right Content - Features Tree */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 mb-6">
              <TestTube2 size={18} className="text-[#0a84ff]" />
              <h2 className="text-[16px] font-semibold">Features & Scenarios</h2>
            </div>

            {project.testCatalog.containers.length > 0 ? (
              <div className="rounded-lg border border-[var(--hairline)] bg-[var(--fill-quinary)] p-4">
                <TestTreePanel
                  project={project}
                  onSelectTest={onExecute}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-[var(--hairline-weak)] bg-[var(--fill-quinary)] p-8 text-center text-[12.5px] text-[var(--text-quaternary)]">
                <TestTube2 size={32} className="mx-auto mb-3 opacity-50" />
                <p>No test features found in this project</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
