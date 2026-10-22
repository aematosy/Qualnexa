import {
  CheckCircle2,
  Play,
  TriangleAlert,
  X,
} from "lucide-react";

import type {
  ExecutionPlan,
} from "../types/execution";

type Props = {
  plan: ExecutionPlan | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onExecute: () => void;
};

export function ExecutionPlanDialog({
  plan,
  loading,
  error,
  onClose,
  onExecute,
}: Props) {
  if (
    !plan &&
    !loading &&
    !error
  ) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-5 backdrop-blur-md">
      <div className="glass-panel animate-pop-in flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-[22px] border border-[var(--hairline)] shadow-[0_24px_64px_rgba(0,0,0,0.25)]">
        <header className="flex items-center justify-between border-b border-[var(--hairline)] px-6 py-5">
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight">
              Execution plan
            </h2>

            <p className="mt-1 text-[11.5px] text-[var(--text-quaternary)]">
              Validate the resolved test selection before execution.
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

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="py-10 text-center text-[12.5px] text-[var(--text-quaternary)]">
              Preparing execution plan...
            </div>
          )}

          {error && (
            <div className="rounded-[16px] border border-[#ff3b30]/25 bg-[#ff3b30]/10 px-4 py-4 text-[12.5px] text-[var(--badge-red-text)]">
              {error}
            </div>
          )}

          {plan && (
            <div className="space-y-6">
              <section className="grid grid-cols-3 gap-4">
                <Metric
                  label="Containers"
                  value={String(
                    plan.containerCount,
                  )}
                />

                <Metric
                  label="Tests"
                  value={String(
                    plan.testCount,
                  )}
                />

                <Metric
                  label="Status"
                  value={plan.status}
                />
              </section>

              <section>
                <h3 className="mb-3 text-[13px] font-semibold">
                  Readiness
                </h3>

                <div className="space-y-2">
                  {plan.readiness.map(
                    (check) => (
                      <div
                        key={check.id}
                        className="flex items-start justify-between gap-5 rounded-[14px] border border-[var(--hairline)] bg-[var(--surface)]/60 px-4 py-3"
                      >
                        <div>
                          <div className="text-[12.5px] font-medium">
                            {check.label}
                          </div>

                          <div className="mt-1 text-[11.5px] text-[var(--text-quaternary)]">
                            {check.message}
                          </div>
                        </div>

                        <div
                          className={[
                            "flex shrink-0 items-center gap-1.5 text-[11px] font-semibold",
                            check.status ===
                            "PASS"
                              ? "text-[var(--badge-green-text)]"
                              : "text-[var(--badge-orange-text)]",
                          ].join(" ")}
                        >
                          {check.status ===
                          "PASS" ? (
                            <CheckCircle2
                              size={14}
                            />
                          ) : (
                            <TriangleAlert
                              size={14}
                            />
                          )}

                          {check.status}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-[13px] font-semibold">
                  Selected tests
                </h3>

                <div className="max-h-72 overflow-y-auto rounded-[16px] border border-[var(--hairline)]">
                  {plan.selectedTests.map(
                    (test) => (
                      <div
                        key={test.id}
                        className="border-b border-[var(--hairline)] px-4 py-3 last:border-b-0"
                      >
                        <div className="text-[12.5px] font-medium">
                          {test.name}
                        </div>

                        <div className="mt-1 font-mono text-[10.5px] text-[var(--text-quinary)]">
                          {test.path}
                          {test.line
                            ? `:${test.line}`
                            : ""}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-[var(--hairline)] bg-[var(--fill-quinary)] px-6 py-4">
          <div className="text-[11.5px] text-[var(--text-quaternary)]">
            Execution runs the project's detected build command (or your custom command).
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-medium transition hover:bg-[var(--fill-tertiary)] active:scale-[0.97]"
            >
              Close
            </button>

            <button
              type="button"
              disabled={
                !plan ||
                plan.status !== "READY"
              }
              onClick={onExecute}
              className="flex items-center gap-2 rounded-full bg-[#0a84ff] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(10,132,255,0.4)] transition hover:bg-[#0074e8] active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-[var(--fill-secondary)] disabled:text-[var(--text-quinary)] disabled:shadow-none"
            >
              <Play size={15} />
              Execute
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[16px] border border-[var(--hairline)] bg-[var(--fill-quaternary)] p-4">
      <div className="text-[11.5px] text-[var(--text-quaternary)]">
        {label}
      </div>

      <div className="mt-1 text-[19px] font-semibold tracking-tight">
        {value}
      </div>
    </div>
  );
}
