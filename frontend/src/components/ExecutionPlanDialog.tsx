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
};

export function ExecutionPlanDialog({
  plan,
  loading,
  error,
  onClose,
}: Props) {
  if (
    !plan &&
    !loading &&
    !error
  ) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-5">
      <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold">
              Execution plan
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Validate the resolved test selection before execution.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={19} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="py-10 text-center text-sm text-slate-500">
              Preparing execution plan...
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
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
                <h3 className="mb-3 text-sm font-semibold">
                  Readiness
                </h3>

                <div className="space-y-2">
                  {plan.readiness.map(
                    (check) => (
                      <div
                        key={check.id}
                        className="flex items-start justify-between gap-5 rounded-lg border border-slate-200 px-4 py-3"
                      >
                        <div>
                          <div className="text-sm font-medium">
                            {check.label}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {check.message}
                          </div>
                        </div>

                        <div
                          className={[
                            "flex shrink-0 items-center gap-1.5 text-xs font-semibold",
                            check.status ===
                            "PASS"
                              ? "text-emerald-700"
                              : "text-amber-700",
                          ].join(" ")}
                        >
                          {check.status ===
                          "PASS" ? (
                            <CheckCircle2
                              size={15}
                            />
                          ) : (
                            <TriangleAlert
                              size={15}
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
                <h3 className="mb-3 text-sm font-semibold">
                  Selected tests
                </h3>

                <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
                  {plan.selectedTests.map(
                    (test) => (
                      <div
                        key={test.id}
                        className="border-b border-slate-100 px-4 py-3 last:border-b-0"
                      >
                        <div className="text-sm font-medium">
                          {test.name}
                        </div>

                        <div className="mt-1 font-mono text-[11px] text-slate-400">
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

        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="text-xs text-slate-500">
            Physical runner execution is the next platform layer.
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium"
            >
              Close
            </button>

            <button
              type="button"
              disabled={
                !plan ||
                plan.status !== "READY"
              }
              className="flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Play size={16} />
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
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-xl font-semibold">
        {value}
      </div>
    </div>
  );
}