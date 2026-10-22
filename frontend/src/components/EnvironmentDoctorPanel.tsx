import {
  CheckCircle2,
  Cpu,
  RefreshCw,
  XCircle,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import type {
  DoctorReport,
} from "../types/environment";

export function EnvironmentDoctorPanel() {
  const [
    report,
    setReport,
  ] = useState<DoctorReport | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/environment/doctor",
        );

      if (!response.ok) {
        throw new Error(
          "Unable to load environment report.",
        );
      }

      setReport(
        (await response.json()) as DoctorReport,
      );
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : "Unable to load environment report.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass-panel rounded-[22px] border border-[var(--hairline)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_6px_16px_rgba(0,0,0,0.05)]">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-[14px] font-semibold tracking-tight">
            <Cpu size={15} className="text-[#0a84ff]" />
            Environment Doctor
          </h3>

          <p className="mt-1 text-[11.5px] text-[var(--text-quaternary)]">
            Tools detected on this machine
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load()}
          className="rounded-full p-1.5 text-[var(--text-quaternary)] transition hover:bg-[var(--fill-tertiary)] hover:text-[var(--text-primary)]"
          title="Refresh"
        >
          <RefreshCw
            size={13}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />
        </button>
      </div>

      {error && (
        <div className="rounded-[12px] border border-[#ff3b30]/25 bg-[#ff3b30]/10 px-3 py-2 text-[11.5px] text-[var(--badge-red-text)]">
          {error}
        </div>
      )}

      {!error && report && (
        <div className="space-y-2">
          {report.tools.map(
            (tool) => (
              <div
                key={tool.id}
                className="flex items-center justify-between text-[12.5px]"
              >
                <span className="text-[var(--text-secondary)]">
                  {tool.displayName}
                </span>

                {tool.found ? (
                  <span className="flex items-center gap-1.5 font-medium text-[var(--badge-green-text)]">
                    <CheckCircle2
                      size={13}
                    />
                    {tool.version ??
                      "detected"}
                  </span>
                ) : (
                  <span
                    className="flex items-center gap-1.5 font-medium text-[var(--text-quinary)]"
                    title={tool.error}
                  >
                    <XCircle
                      size={13}
                    />
                    Not found
                  </span>
                )}
              </div>
            ),
          )}

          {report.jdks.length > 0 && (
            <div className="mt-4 border-t border-[var(--hairline)] pt-3">
              <div className="mb-2 text-[11px] font-semibold text-[var(--text-quaternary)]">
                Installed JDKs
              </div>

              <div className="space-y-1.5">
                {report.jdks.map(
                  (jdk) => (
                    <div
                      key={jdk.path}
                      className="flex items-center justify-between text-[11px]"
                    >
                      <span
                        className="truncate text-[var(--text-quaternary)]"
                        title={jdk.path}
                      >
                        {jdk.path}
                      </span>

                      <span className="ml-2 shrink-0 font-medium text-[var(--text-secondary)]">
                        {jdk.version}
                        {jdk.isSystemDefault
                          ? " (default)"
                          : ""}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
