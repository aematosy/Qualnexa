import {
  ChevronLeft,
  FolderGit2,
  Play,
  ShieldCheck,
  Tags,
  TestTube2,
  Wrench,
  Zap,
  History,
  ChevronRight,
  Search,
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

import type {
  ExecutionJob,
} from "../types/execution-job";

import {
  useMemo,
  useState,
} from "react";

type Props = {
  project: ProjectManifest;
  runs: ExecutionJob[];
  initialTab?: ProjectTab;
  onBack: () => void;
  onExecute: (selection: ExecutionSelection) => void;
  onOpenReport: (jobId: string) => void;
};

type ProjectTab = "OVERVIEW" | "RUNS";

export function ProjectDetailsPage({ project, runs, initialTab = "OVERVIEW", onBack, onExecute, onOpenReport }: Props) {
  const [activeTab, setActiveTab] = useState<ProjectTab>(initialTab);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [environmentFilter, setEnvironmentFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "STATUS" | "DURATION" | "PASS_RATE">("NEWEST");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const projectRuns = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = runs
      .filter((run) => run.projectId === project.id)
      .filter((run) => statusFilter === "ALL" || run.status === statusFilter)
      .filter((run) => environmentFilter === "ALL" || (run.environment ?? "Default") === environmentFilter)
      .filter((run) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          run.id,
          run.projectName,
          run.environment ?? "",
          run.frameworks.join(", "),
          run.status,
          run.command ?? "",
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      });

    const sorted = [...filtered].sort((left, right) => {
      if (sortBy === "OLDEST") {
        return new Date(left.finishedAt ?? left.startedAt ?? 0).getTime() - new Date(right.finishedAt ?? right.startedAt ?? 0).getTime();
      }

      if (sortBy === "STATUS") {
        return left.status.localeCompare(right.status);
      }

      if (sortBy === "DURATION") {
        return (right.durationMs ?? 0) - (left.durationMs ?? 0);
      }

      if (sortBy === "PASS_RATE") {
        const leftRate = left.result?.total ? left.result.passed / left.result.total : 0;
        const rightRate = right.result?.total ? right.result.passed / right.result.total : 0;
        return rightRate - leftRate;
      }

      return new Date(right.finishedAt ?? right.startedAt ?? 0).getTime() - new Date(left.finishedAt ?? left.startedAt ?? 0).getTime();
    });

    return sorted;
  }, [runs, project.id, search, statusFilter, environmentFilter, sortBy]);

  const paginatedRuns = useMemo(() => projectRuns.slice((page - 1) * pageSize, page * pageSize), [projectRuns, page]);
  const totalPages = Math.max(1, Math.ceil(projectRuns.length / pageSize));
  const summary = useMemo(() => ({
    totalRuns: projectRuns.length,
    failedRuns: projectRuns.filter((run) => run.testResultStatus === "FAILED" || run.lifecycleStatus === "ERROR" || run.status === "ERROR").length,
    lastRun: projectRuns[0] ?? null,
    passRate: (() => {
      const total = projectRuns.reduce((sum, run) => sum + (run.result?.total ?? 0), 0);
      const passed = projectRuns.reduce((sum, run) => sum + (run.result?.passed ?? 0), 0);
      return total > 0 ? ((passed / total) * 100).toFixed(1) : "0.0";
    })(),
  }), [projectRuns]);

  const environmentOptions = [...new Set(runs.filter((run) => run.projectId === project.id).map((run) => run.environment ?? "Default"))];

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
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-soft-border)] bg-[var(--accent-soft-surface)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-strong)]">
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
                className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent-strong)] px-5 py-3 text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(10,132,255,0.24)] transition hover:bg-[var(--accent-strong-hover)] active:scale-[0.98]"
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

        <div className="mb-6 flex flex-wrap gap-2">
          <ProjectTabButton label="Overview" active={activeTab === "OVERVIEW"} onClick={() => setActiveTab("OVERVIEW")} icon={<Wrench size={14} />} />
          <ProjectTabButton label="Runs" active={activeTab === "RUNS"} onClick={() => { setActiveTab("RUNS"); setPage(1); }} icon={<History size={14} />} />
        </div>

        {activeTab === "OVERVIEW" ? (
          <div className="grid flex-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="space-y-6">
              <PanelCard
                title="Execution shortcuts"
                subtitle="Launch the project with common selections"
                icon={<Zap size={16} className="text-[var(--accent-strong)]" />}
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
                icon={<Tags size={16} className="text-[var(--accent-strong)]" />}
              >
                {project.testCatalog.labels.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {project.testCatalog.labels.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => onExecute({ type: "LABELS", labels: [label], labelMatch: "ANY" })}
                        className="rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-strong)] hover:text-white"
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
                    <TestTube2 size={18} className="text-[var(--accent-strong)]" />
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
        ) : (
          <ProjectRunsSection
            project={project}
            runs={paginatedRuns}
            totalRuns={summary.totalRuns}
            failedRuns={summary.failedRuns}
            passRate={summary.passRate}
            lastRun={summary.lastRun}
            page={page}
            totalPages={totalPages}
            search={search}
            statusFilter={statusFilter}
            environmentFilter={environmentFilter}
            sortBy={sortBy}
            environmentOptions={environmentOptions}
            onSearchChange={(value) => { setSearch(value); setPage(1); }}
            onStatusChange={(value) => { setStatusFilter(value); setPage(1); }}
            onEnvironmentChange={(value) => { setEnvironmentFilter(value); setPage(1); }}
            onSortChange={(value) => { setSortBy(value); setPage(1); }}
            onPageChange={setPage}
            onRunProject={() => onExecute({ type: "ALL" })}
            onOpenReport={onOpenReport}
          />
        )}
      </div>
    </div>
  );
}

function MetricTile({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="glass-panel rounded-[24px] border border-[var(--hairline)] px-5 py-4 shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--hairline)] bg-[var(--fill-quinary)] ${accent}`}>
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
      className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] px-4 py-3 text-left transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-soft-surface)]"
    >
      <div className="text-[12.5px] font-semibold text-[var(--text-primary)]">{label}</div>
      <div className="mt-1 text-[11.5px] text-[var(--text-quaternary)]">{hint}</div>
    </button>
  );
}

function ProjectTabButton({ label, active, onClick, icon }: { label: string; active: boolean; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-semibold transition ${active ? "bg-[var(--accent-soft-surface)] text-[var(--accent-strong)] shadow-[inset_0_0_0_1px_var(--accent-soft-border)]" : "border border-[var(--hairline-strong)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--accent-soft-border)] hover:bg-[var(--fill-quinary)]"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function ProjectRunsSection({ project, runs, totalRuns, failedRuns, passRate, lastRun, page, totalPages, search, statusFilter, environmentFilter, sortBy, environmentOptions, onSearchChange, onStatusChange, onEnvironmentChange, onSortChange, onPageChange, onRunProject, onOpenReport }: { project: ProjectManifest; runs: ExecutionJob[]; totalRuns: number; failedRuns: number; passRate: string; lastRun: ExecutionJob | null; page: number; totalPages: number; search: string; statusFilter: string; environmentFilter: string; sortBy: "NEWEST" | "OLDEST" | "STATUS" | "DURATION" | "PASS_RATE"; environmentOptions: string[]; onSearchChange: (value: string) => void; onStatusChange: (value: string) => void; onEnvironmentChange: (value: string) => void; onSortChange: (value: "NEWEST" | "OLDEST" | "STATUS" | "DURATION" | "PASS_RATE") => void; onPageChange: (value: number) => void; onRunProject: () => void; onOpenReport: (jobId: string) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-quaternary)]">Projects / {project.name} / Runs</div>
        <h2 className="mt-2 text-[28px] font-semibold tracking-tight">Runs</h2>
        <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">Execution history for this project.</p>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <RunSummaryCard title="Total Runs" value={String(totalRuns)} detail="Project executions" tone="neutral" />
        <RunSummaryCard title="Pass Rate" value={`${passRate}%`} detail="Across project tests" tone="accent" />
        <RunSummaryCard title="Failed Runs" value={String(failedRuns)} detail="Need attention" tone="danger" />
        <RunSummaryCard title="Last Run" value={lastRun ? formatRunDate(lastRun.finishedAt ?? lastRun.startedAt) : "—"} detail={lastRun ? lastRun.status : "No runs yet"} tone="success" />
      </section>

      <section className="glass-panel rounded-[24px] border border-[var(--hairline)] p-5 shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_180px_180px_180px]">
            <label className="relative block">
              <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-quaternary)]" />
              <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search" className="w-full rounded-[14px] border border-[var(--hairline-strong)] bg-[var(--surface)] py-3 pl-11 pr-4 text-[13px] outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[var(--accent-soft-border)]" />
            </label>
            <select value={statusFilter} onChange={(event) => onStatusChange(event.target.value)} className="rounded-[14px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-3 text-[13px] outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[var(--accent-soft-border)]">
              <option value="ALL">Status</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="ERROR">ERROR</option>
              <option value="RUNNING">RUNNING</option>
              <option value="QUEUED">QUEUED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <select value={environmentFilter} onChange={(event) => onEnvironmentChange(event.target.value)} className="rounded-[14px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-3 text-[13px] outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[var(--accent-soft-border)]">
              <option value="ALL">Environment</option>
              {environmentOptions.map((environment) => <option key={environment} value={environment}>{environment}</option>)}
            </select>
            <select value={sortBy} onChange={(event) => onSortChange(event.target.value as "NEWEST" | "OLDEST" | "STATUS" | "DURATION" | "PASS_RATE")} className="rounded-[14px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-3 text-[13px] outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[var(--accent-soft-border)]">
              <option value="NEWEST">Modified</option>
              <option value="OLDEST">Oldest</option>
              <option value="STATUS">Status</option>
              <option value="DURATION">Duration</option>
              <option value="PASS_RATE">Pass rate</option>
            </select>
          </div>
          <button type="button" onClick={onRunProject} className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[var(--accent-strong)] px-5 py-3 text-[13px] font-semibold text-white transition hover:bg-[var(--accent-strong-hover)]">
            <Play size={15} />
            New Run
          </button>
        </div>
      </section>

      <section className="glass-panel overflow-hidden rounded-[24px] border border-[var(--hairline)] shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
        <div className="hidden grid-cols-[110px_minmax(260px,1fr)_90px_80px_150px_110px_90px_150px_44px] gap-3 border-b border-[var(--hairline)] bg-[var(--fill-quinary)]/60 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-quaternary)] xl:grid">
          <div>Run</div>
          <div>Scope</div>
          <div>Env</div>
          <div>Tests</div>
          <div>Result</div>
          <div>Status</div>
          <div>Duration</div>
          <div>Finished</div>
          <div>Action</div>
        </div>

        {runs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <History size={30} className="mx-auto text-[var(--text-quinary)]" />
            <div className="mt-4 text-[15px] font-semibold">No runs yet</div>
            <div className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">Run this project to start building execution history.</div>
            <button type="button" onClick={onRunProject} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--accent-strong)] px-4 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-[var(--accent-strong-hover)]">
              <Play size={14} />Run Tests
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--hairline)]">
            {runs.map((run) => {
              const summary = buildRunPresentation(run, project);
              return (
                <button key={run.id} type="button" onClick={() => onOpenReport(run.id)} className="group grid min-h-[68px] w-full cursor-pointer grid-cols-1 gap-3 px-6 py-4 text-left transition duration-150 hover:bg-[var(--fill-quinary)] hover:shadow-[inset_3px_0_0_0_var(--accent-soft-border)] focus-visible:bg-[var(--fill-quinary)] focus-visible:shadow-[inset_3px_0_0_0_var(--accent-soft-border)] xl:grid-cols-[110px_minmax(260px,1fr)_90px_80px_150px_110px_90px_150px_44px] xl:items-center" aria-label={`Open ${summary.runLabel} for ${project.name}`} title={`Execution ID: ${run.id}`}>
                  <div className="min-w-0 text-[14px] font-semibold text-[var(--text-primary)]" title={`Execution ID: ${summary.fullExecutionId}`}>{summary.runLabel}</div>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-[var(--text-primary)]" title={summary.nameLabel}>{summary.nameLabel}</div>
                    <div className="truncate text-[11px] text-[var(--text-quaternary)]">{summary.frameworkLabel}</div>
                  </div>
                  <RunDesktopCell label="Env" value={summary.environmentLabel} subdued={summary.environmentLabel === "—"} />
                  <RunDesktopCell label="Tests" value={summary.scenariosLabel} subdued={summary.scenariosLabel === "—"} />
                  <div className="flex items-center justify-between xl:justify-start">
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text-quaternary)] xl:hidden">Result</span>
                    <RunResultSummary result={summary.result} />
                  </div>
                  <div className="flex items-center justify-between xl:block">
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text-quaternary)] xl:hidden">Status</span>
                    <RunStatusBadge status={summary.lifecycleStatus} />
                  </div>
                  <RunDesktopCell label="Duration" value={formatRunDuration(run.durationMs)} subdued={run.durationMs === undefined} />
                  <RunDesktopCell label="Finished" value={formatRunDateTime(run.finishedAt ?? run.startedAt)} subdued={!run.finishedAt && !run.startedAt} />
                  <div className="flex items-center justify-between xl:justify-center">
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text-quaternary)] xl:hidden">Action</span>
                    <ChevronRight size={16} className="text-[var(--text-quaternary)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent-strong)] group-focus-visible:translate-x-0.5 group-focus-visible:text-[var(--accent-strong)]" aria-label="View report" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {runs.length > 0 && (
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="rounded-[12px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-2 text-[12px] font-medium transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-soft-surface)] disabled:cursor-not-allowed disabled:opacity-50">Prev</button>
          <div className="rounded-[12px] border border-[var(--hairline)] bg-[var(--fill-quinary)] px-4 py-2 text-[12px] font-medium text-[var(--text-secondary)]">{page} / {totalPages}</div>
          <button type="button" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded-[12px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-2 text-[12px] font-medium transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-soft-surface)] disabled:cursor-not-allowed disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}

function RunSummaryCard({ title, value, detail, tone }: { title: string; value: string; detail: string; tone: "neutral" | "accent" | "success" | "danger" }) {
  const toneStyles = tone === "accent"
    ? "border-[var(--accent-soft-border)] bg-[var(--accent-soft-surface)]/65"
    : tone === "success"
      ? "border-[var(--success-soft-border)] bg-[var(--success-soft-surface)]/65"
      : tone === "danger"
        ? "border-[var(--danger-soft-border)] bg-[var(--danger-soft-surface)]/65"
        : "border-[var(--hairline)]";

  return (
    <div className={`glass-panel rounded-[22px] border p-5 shadow-[0_12px_28px_rgba(0,0,0,0.06)] ${toneStyles}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-quaternary)]">{title}</div>
      <div className="mt-3 text-[28px] font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-[12px] text-[var(--text-quaternary)]">{detail}</div>
    </div>
  );
}

function RunResultSummary({ result }: { result: ReturnType<typeof buildRunPresentation>["result"] }) {
  if (result.kind === "pending") {
    return <span className="text-[12px] font-medium text-[var(--text-quaternary)]">{result.label}</span>;
  }

  if (result.kind === "empty") {
    return <span className="text-[12px] font-medium text-[var(--text-quaternary)]">{result.label}</span>;
  }

  const safeRate = Math.max(0, Math.min(100, result.passRate));

  return (
    <div className="min-w-0" title={`Passed ${result.passed} · Failed ${result.failed} · Skipped ${result.skipped}`}>
      <div className="text-[12px] font-semibold text-[var(--text-primary)]">{safeRate}% · {result.passed}/{result.total}</div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--fill-quinary)]">
        <div className="h-full rounded-full bg-[var(--badge-green-text)]" style={{ width: `${safeRate}%` }} />
      </div>
    </div>
  );
}

function RunStatusBadge({ status }: { status: ExecutionJob["status"] | ExecutionJob["lifecycleStatus"] }) {
  const tone = status === "COMPLETED"
    ? "border-[var(--success-soft-border)] bg-[var(--success-soft-surface)] text-[var(--badge-green-text)]"
    : status === "ERROR"
      ? "border-[var(--danger-soft-border)] bg-[var(--danger-soft-surface)] text-[var(--badge-red-text)]"
      : status === "RUNNING" || status === "QUEUED"
        ? "border-[var(--warning-soft-border)] bg-[var(--warning-soft-surface)] text-[var(--badge-orange-text)]"
        : "border-[var(--hairline-strong)] bg-[var(--fill-quinary)] text-[var(--text-secondary)]";

  return <span className={`inline-flex rounded-full border px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] ${tone}`}>{status ?? "UNKNOWN"}</span>;
}

function RunDesktopCell({ label, value, subdued = false }: { label: string; value: string; subdued?: boolean }) {
  return (
    <div className="flex min-w-0 items-center justify-between xl:block" title={value}>
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[var(--text-quaternary)] xl:hidden">{label}</span>
      <span className={`block truncate text-[12px] ${subdued ? "text-[var(--text-quaternary)]" : "text-[var(--text-secondary)]"}`}>{value}</span>
    </div>
  );
}

function buildRunPresentation(run: ExecutionJob, project: ProjectManifest) {
  const shortId = run.id.slice(0, 8);
  const firstTest = run.result?.tests[0];
  const frameworkLabel = run.frameworks.join(", ") || "Custom command";
  const derivedSuite = firstTest?.suite?.includes("] ")
    ? firstTest.suite.split("] ").slice(-1)[0] ?? firstTest.suite
    : firstTest?.suite;
  const nameLabel = derivedSuite || firstTest?.name || "Execution";
  const hasResults = Boolean(run.result);
  const hasTestCount = (run.result?.total ?? 0) > 0;
  const lifecycleStatus = run.lifecycleStatus ?? run.status;
  const testResultStatus = run.testResultStatus;
  const isPending = lifecycleStatus === "QUEUED" || lifecycleStatus === "RUNNING";

  const result = !hasResults
    ? isPending
      ? { kind: "pending" as const, label: lifecycleStatus === "RUNNING" ? "In progress" : "Pending" }
      : { kind: "empty" as const, label: testResultStatus === "NO_RESULTS" ? "No results" : "No results" }
    : !hasTestCount
      ? { kind: "empty" as const, label: "No results" }
      : {
          kind: "scored" as const,
          passRate: Math.round(((run.result?.passed ?? 0) / (run.result?.total ?? 1)) * 100),
          total: run.result?.total ?? 0,
          passed: run.result?.passed ?? 0,
          failed: run.result?.failed ?? 0,
          skipped: run.result?.skipped ?? 0,
        };

  const rerunnable = isTerminalRun(lifecycleStatus) && run.planId.trim().length > 0;

  return {
    runLabel: `Run ${shortId}`,
    fullExecutionId: run.id,
    nameLabel,
    frameworkLabel,
    branchLabel: project.source.branch ?? "—",
    environmentLabel: run.environment ?? "—",
    scenariosLabel: hasResults && hasTestCount
      ? `${run.result?.total ?? 0}`
      : "—",
    result,
    lifecycleStatus,
    testResultStatus,
    rerunnable,
    rerunUnavailableReason: rerunnable
      ? undefined
      : "Rerun unavailable for non-terminal or incomplete runs.",
  };
}

function isTerminalRun(status: ExecutionJob["status"] | ExecutionJob["lifecycleStatus"]) {
  return status === "COMPLETED" || status === "ERROR" || status === "CANCELLED";
}

function formatRunDate(value?: string) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRunDateTime(value?: string) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRunDuration(value?: number) {
  if (value === undefined) {
    return "—";
  }

  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`;
}
