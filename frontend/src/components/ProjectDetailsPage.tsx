import {
  ChevronLeft,
  FolderGit2,
  Play,
  ShieldCheck,
  Tags,
  TestTube2,
  Wrench,
  Zap,
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
    <div className="min-h-screen bg-[var(--app-bg,var(--surface))] text-[var(--text-primary)]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-6 py-6 lg:px-8">
        <header className="glass-panel mb-6 rounded-[28px] border border-[var(--hairline)] px-6 py-5 shadow-[0_18px_48px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={onBack}
                className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--hairline-strong)] bg-[var(--surface)] transition hover:bg-[var(--fill-quinary)]"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#0a84ff]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0a84ff]">
                    <FolderGit2 size={13} />
                    Project workspace
                  </span>
                  <span className="rounded-full border border-[var(--hairline)] bg-[var(--fill-quinary)] px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                    {project.inspectionStatus}
                  </span>
                </div>

                <h1 className="truncate text-[28px] font-semibold tracking-tight">
                  {project.name}
                </h1>
                <p className="mt-2 max-w-3xl break-all text-[13px] text-[var(--text-quaternary)]">
                  {project.source.location}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onExecute({ type: "ALL" })}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0a84ff] px-5 py-3 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(10,132,255,0.28)] transition hover:bg-[#0074e8] active:scale-[0.98]"
              >
                <Play size={16} />
                Run all tests
              </button>
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            icon={<TestTube2 size={18} />}
            label="Features"
            value={String(project.testCatalog.containers.length)}
            accent="text-[#0a84ff]"
          />
          <MetricTile
            icon={<Play size={18} />}
            label="Scenarios"
            value={String(project.testCatalog.testCount)}
            accent="text-[#34c759]"
          />
          <MetricTile
            icon={<Tags size={18} />}
            label="Tags"
            value={String(project.testCatalog.labels.length)}
            accent="text-[#ff9500]"
          />
          <MetricTile
            icon={<ShieldCheck size={18} />}
            label="Frameworks"
            value={String(project.frameworks.length)}
            accent="text-[#5e5ce6]"
          />
        </section>

        <div className="grid flex-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <PanelCard
              title="Execution shortcuts"
              subtitle="Launch the project with common selections"
              icon={<Zap size={16} className="text-[#0a84ff]" />}
            >
              <div className="grid gap-2">
                <ActionButton
                  label="Run complete project"
                  hint="Prepare and execute every discovered test"
                  onClick={() => onExecute({ type: "ALL" })}
                />
                {project.testCatalog.labels.slice(0, 6).map((label) => (
                  <ActionButton
                    key={label}
                    label={`Run tag ${label}`}
                    hint="Execute tests matching this tag"
                    onClick={() => onExecute({ type: "LABELS", labels: [label], labelMatch: "ANY" })}
                  />
                ))}
              </div>
            </PanelCard>

            <PanelCard
              title="Project overview"
              subtitle="Detected stack and tooling"
              icon={<Wrench size={16} className="text-[#5e5ce6]" />}
            >
              <DetailGroup label="Frameworks">
                <TagList values={project.frameworks.map((item) => item.displayName)} empty="No frameworks detected" />
              </DetailGroup>
              <DetailGroup label="Runtimes">
                <TagList
                  values={project.runtimes.map((item) =>
                    item.versionConstraint ? `${item.type} ${item.versionConstraint}` : item.type,
                  )}
                  empty="No runtimes detected"
                />
              </DetailGroup>
              <DetailGroup label="Build tools">
                <TagList
                  values={project.buildTools.map((item) =>
                    item.versionConstraint ? `${item.type} ${item.versionConstraint}` : item.type,
                  )}
                  empty="No build tools detected"
                />
              </DetailGroup>
            </PanelCard>

            <PanelCard
              title="Available tags"
              subtitle="Click a tag to run matching tests"
              icon={<Tags size={16} className="text-[#ff9500]" />}
            >
              {project.testCatalog.labels.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {project.testCatalog.labels.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => onExecute({ type: "LABELS", labels: [label], labelMatch: "ANY" })}
                      className="rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--text-secondary)] transition hover:border-[#0a84ff]/35 hover:bg-[#0a84ff] hover:text-white"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyHint message="No tags discovered for this project." />
              )}
            </PanelCard>
          </aside>

          <section className="glass-panel min-h-[720px] rounded-[28px] border border-[var(--hairline)] p-6 shadow-[0_18px_48px_rgba(0,0,0,0.08)]">
            <div className="mb-5 flex flex-col gap-3 border-b border-[var(--hairline)] pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
                  <TestTube2 size={18} className="text-[#0a84ff]" />
                  Features & scenarios
                </div>
                <p className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">
                  Explore the discovered test tree and run the full project, a feature, a scenario or a tag.
                </p>
              </div>
              <div className="rounded-full bg-[var(--fill-quinary)] px-3 py-1 text-[11.5px] font-medium text-[var(--text-secondary)]">
                {project.testCatalog.containers.length} features · {project.testCatalog.testCount} scenarios
              </div>
            </div>

            {project.testCatalog.containers.length > 0 ? (
              <TestTreePanel project={project} onSelectTest={onExecute} />
            ) : (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--hairline-strong)] bg-[var(--fill-quinary)] px-8 text-center">
                <TestTube2 size={36} className="mb-4 text-[var(--text-quaternary)]" />
                <div className="text-[14px] font-semibold">No test tree available</div>
                <p className="mt-2 max-w-md text-[12.5px] text-[var(--text-quaternary)]">
                  Qualnexa did not discover feature or scenario files for this project yet.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="glass-panel rounded-[24px] border border-[var(--hairline)] px-5 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--fill-quinary)] ${accent}`}>
        {icon}
      </div>
      <div className="text-[24px] font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-[12px] text-[var(--text-quaternary)]">{label}</div>
    </div>
  );
}

function PanelCard({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-[24px] border border-[var(--hairline)] p-5 shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
      <div className="mb-4 flex items-start gap-3">
        <div className="mt-0.5 rounded-2xl bg-[var(--fill-quinary)] p-2">{icon}</div>
        <div>
          <div className="text-[14px] font-semibold tracking-tight">{title}</div>
          <div className="mt-1 text-[12px] text-[var(--text-quaternary)]">{subtitle}</div>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function DetailGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-quaternary)]">
        {label}
      </div>
      {children}
    </div>
  );
}

function TagList({ values, empty }: { values: string[]; empty: string }) {
  return values.length > 0 ? (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span key={value} className="rounded-full bg-[var(--fill-quinary)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--text-secondary)]">
          {value}
        </span>
      ))}
    </div>
  ) : (
    <EmptyHint message={empty} />
  );
}

function EmptyHint({ message }: { message: string }) {
  return <div className="text-[12px] text-[var(--text-quaternary)]">{message}</div>;
}

function ActionButton({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] px-4 py-3 text-left transition hover:border-[#0a84ff]/35 hover:bg-[var(--fill-quinary)]"
    >
      <div className="text-[12.5px] font-semibold text-[var(--text-primary)]">{label}</div>
      <div className="mt-1 text-[11.5px] text-[var(--text-quaternary)]">{hint}</div>
    </button>
  );
}
