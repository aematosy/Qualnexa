import {
  CheckCircle2,
  Download,
  Loader2,
  Square,
  TriangleAlert,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  ExecutionJob,
} from "../types/execution-job";

type Props = {
  jobId: string | null;
  onClose: () => void;
};

const POLL_INTERVAL_MS = 1200;

const TERMINAL_STATUSES =
  new Set([
    "PASSED",
    "FAILED",
    "TIMED_OUT",
    "CANCELLED",
  ]);

export function ExecutionJobDialog({
  jobId,
  onClose,
}: Props) {
  const [
    job,
    setJob,
  ] = useState<ExecutionJob | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    stopping,
    setStopping,
  ] = useState(false);

  const logsRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      return;
    }

    setStopping(false);

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      try {
        const response =
          await fetch(
            `/api/executions/jobs/${jobId}`,
          );

        if (!response.ok) {
          throw new Error(
            "Unable to load execution job.",
          );
        }

        const data =
          (await response.json()) as ExecutionJob;

        if (cancelled) {
          return;
        }

        setJob(data);
        setError(null);

        if (
          !TERMINAL_STATUSES.has(
            data.status,
          )
        ) {
          timer =
            setTimeout(
              poll,
              POLL_INTERVAL_MS,
            );
        }
      } catch (exception) {
        if (cancelled) {
          return;
        }

        setError(
          exception instanceof Error
            ? exception.message
            : "Unable to load execution job.",
        );

        timer =
          setTimeout(
            poll,
            POLL_INTERVAL_MS,
          );
      }
    }

    void poll();

    return () => {
      cancelled = true;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [jobId]);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop =
        logsRef.current.scrollHeight;
    }
  }, [job?.stdout, job?.stderr]);

  async function stopExecution() {
    if (!jobId) {
      return;
    }

    setStopping(true);

    try {
      const response =
        await fetch(
          `/api/executions/jobs/${jobId}/cancel`,
          {
            method: "POST",
          },
        );

      if (!response.ok) {
        const body =
          await response.json().catch(
            () => undefined,
          );

        throw new Error(
          body?.message ??
            "Unable to stop execution.",
        );
      }
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : "Unable to stop execution.",
      );

      setStopping(false);
    }
  }

  if (!jobId) {
    return null;
  }

  const running =
    !job ||
    !TERMINAL_STATUSES.has(
      job.status,
    );

  const canStop =
    running &&
    !stopping &&
    (job?.status === "QUEUED" ||
      job?.status === "RUNNING");

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/30 p-5 backdrop-blur-md">
      <div className="glass-panel animate-pop-in flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[22px] border border-[var(--hairline)] shadow-[0_24px_64px_rgba(0,0,0,0.25)]">
        <header className="flex items-center justify-between border-b border-[var(--hairline)] px-6 py-5">
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight">
              Execution
            </h2>

            <p className="mt-1 text-[11.5px] text-[var(--text-quaternary)]">
              {job?.projectName ?? "Loading..."}
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
          {error && (
            <div className="rounded-[14px] border border-[#ff3b30]/25 bg-[#ff3b30]/10 px-4 py-3 text-[12.5px] text-[var(--badge-red-text)]">
              {error}
            </div>
          )}

          {job && (
            <>
              <section className="flex items-center gap-3">
                <StatusBadge
                  status={job.status}
                />

                {job.command && (
                  <code className="min-w-0 flex-1 truncate rounded-[12px] bg-[#1c1c1e] px-3 py-2 text-[11.5px] text-[#e5e5e7]">
                    {job.command}
                  </code>
                )}
              </section>

              <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <InfoCard
                  label="Framework"
                  value={
                    job.frameworks.join(", ") ||
                    "Custom command"
                  }
                />

                <InfoCard
                  label="Environment"
                  value={
                    job.environment ??
                    "-"
                  }
                />

                <InfoCard
                  label="Started"
                  value={
                    job.startedAt
                      ? new Date(
                          job.startedAt,
                        ).toLocaleTimeString()
                      : "-"
                  }
                />

                <InfoCard
                  label="Duration"
                  value={
                    job.durationMs !== undefined
                      ? `${(job.durationMs / 1000).toFixed(1)}s`
                      : running
                        ? "running..."
                        : "-"
                  }
                />
              </section>

              {job.result && (
                <section className="grid grid-cols-5 gap-2.5">
                  <Metric
                    label="Total"
                    value={job.result.total}
                  />

                  <Metric
                    label="Passed"
                    value={job.result.passed}
                    tone="green"
                  />

                  <Metric
                    label="Failed"
                    value={job.result.failed}
                    tone="red"
                  />

                  <Metric
                    label="Skipped"
                    value={job.result.skipped}
                    tone="orange"
                  />

                  <Metric
                    label="Flaky"
                    value={job.result.flaky}
                    tone="orange"
                  />
                </section>
              )}

              {job.error && (
                <div className="flex items-start gap-3 rounded-[14px] border border-[#ff9f0a]/30 bg-[#ff9f0a]/10 px-4 py-3 text-[12.5px] text-[var(--badge-orange-text)]">
                  <TriangleAlert
                    size={15}
                    className="mt-0.5 shrink-0"
                  />
                  {job.error}
                </div>
              )}

              <section>
                <h3 className="mb-2 text-[13px] font-semibold">
                  Logs
                </h3>

                <div
                  ref={logsRef}
                  className="max-h-72 overflow-y-auto rounded-[16px] bg-[#1c1c1e] p-4 font-mono text-[11.5px] leading-5 text-[#d1d1d6]"
                >
                  <pre className="whitespace-pre-wrap">
                    {job.stdout || "(no output yet)"}
                  </pre>

                  {job.stderr && (
                    <pre className="mt-2 whitespace-pre-wrap text-[#ff6961]">
                      {job.stderr}
                    </pre>
                  )}
                </div>
              </section>

              {job.artifacts.length > 0 && (
                <section>
                  <h3 className="mb-2 text-[13px] font-semibold">
                    Artifacts
                  </h3>

                  <div className="divide-y divide-black/5 rounded-[16px] border border-[var(--hairline)]">
                    {job.artifacts.map(
                      (artifact, index) => (
                        <a
                          key={artifact.relativePath}
                          href={`/api/executions/jobs/${job.id}/artifacts/${index}/download`}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 text-[12.5px] transition hover:bg-[var(--fill-quaternary)]"
                        >
                          <span className="min-w-0 truncate text-[var(--text-primary)]">
                            {artifact.relativePath}
                          </span>

                          <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-[var(--text-quaternary)]">
                            {formatBytes(
                              artifact.sizeBytes,
                            )}
                            <Download
                              size={12}
                            />
                          </span>
                        </a>
                      ),
                    )}
                  </div>
                </section>
              )}
            </>
          )}

          {!job && !error && (
            <div className="py-10 text-center text-[12.5px] text-[var(--text-quaternary)]">
              Loading execution...
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-[var(--hairline)] bg-[var(--fill-quinary)] px-6 py-4">
          {canStop && (
            <button
              type="button"
              onClick={stopExecution}
              disabled={stopping}
              className="flex items-center gap-2 rounded-full border border-[#ff3b30]/25 bg-[#ff3b30]/10 px-4 py-2.5 text-[13px] font-medium text-[var(--badge-red-text)] transition hover:bg-[#ff3b30]/18 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Square size={13} />
              {stopping
                ? "Stopping..."
                : "Stop"}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-medium transition hover:bg-[var(--fill-tertiary)] active:scale-[0.97]"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: ExecutionJob["status"];
}) {
  if (status === "PASSED") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-[#34c759]/12 px-3 py-1.5 text-[11px] font-semibold text-[var(--badge-green-text)]">
        <CheckCircle2 size={13} />
        Passed
      </span>
    );
  }

  if (
    status === "FAILED" ||
    status === "TIMED_OUT"
  ) {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-[#ff3b30]/12 px-3 py-1.5 text-[11px] font-semibold text-[var(--badge-red-text)]">
        <TriangleAlert size={13} />
        {status === "TIMED_OUT"
          ? "Timed out"
          : "Failed"}
      </span>
    );
  }

  if (status === "CANCELLED") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-[var(--fill-secondary)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-tertiary)]">
        <Square size={12} />
        Stopped
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5 rounded-full bg-accent/12 px-3 py-1.5 text-[11px] font-semibold text-accent">
      <Loader2
        size={13}
        className="animate-spin"
      />
      {status === "QUEUED"
        ? "Queued"
        : "Running"}
    </span>
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
    <div className="rounded-[14px] border border-[var(--hairline)] bg-[var(--fill-quaternary)] p-3">
      <div className="text-[10.5px] font-medium text-[var(--text-quaternary)]">
        {label}
      </div>

      <div className="mt-0.5 truncate text-[13px] font-semibold">
        {value}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "green" | "red" | "orange";
}) {
  const toneClass =
    tone === "green"
      ? "text-[var(--badge-green-text)]"
      : tone === "red"
        ? "text-[var(--badge-red-text)]"
        : tone === "orange"
          ? "text-[var(--badge-orange-text)]"
          : "text-[var(--text-primary)]";

  return (
    <div className="rounded-[14px] border border-[var(--hairline)] bg-[var(--fill-quaternary)] p-3 text-center">
      <div
        className={`text-[19px] font-semibold ${toneClass}`}
      >
        {value}
      </div>

      <div className="mt-0.5 text-[10.5px] text-[var(--text-quaternary)]">
        {label}
      </div>
    </div>
  );
}

function formatBytes(
  bytes: number,
): string {

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
