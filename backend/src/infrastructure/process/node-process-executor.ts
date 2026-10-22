import {
  exec,
  spawn,
} from "node:child_process";

import type {
  ProcessExecutor,
} from "../../core/execution/contracts.js";

import type {
  ProcessOutputListener,
  ProcessResult,
  ProcessSpawnListener,
  ProcessSpecification,
} from "../../core/execution/model.js";

const DEFAULT_TIMEOUT_MS =
  30 * 60 * 1000;

const KILL_ESCALATION_MS = 5000;

const isWindows =
  process.platform === "win32";

function killProcessTree(
  pid: number,
  signal:
    "SIGTERM" | "SIGKILL",
): void {

  if (isWindows) {
    exec(
      `taskkill /pid ${pid} /T /F`,
    );

    return;
  }

  try {
    process.kill(
      -pid,
      signal,
    );
  } catch {
    try {
      process.kill(
        pid,
        signal,
      );
    } catch {
      // Process already gone.
    }
  }
}

export class NodeProcessExecutor
implements ProcessExecutor {

  async execute(
    specification:
      ProcessSpecification,

    onOutput?:
      ProcessOutputListener,

    onSpawn?:
      ProcessSpawnListener,
  ): Promise<ProcessResult> {

    const startedAt =
      new Date().toISOString();

    const timeoutMs =
      specification.timeoutMs ??
      DEFAULT_TIMEOUT_MS;

    return new Promise(
      (
        resolve,
        reject,
      ) => {
        const processHandle =
          spawn(
            specification.executable,
            specification.arguments,
            {
              cwd:
                specification.workingDirectory,

              env: {
                ...process.env,
                ...specification.environment,
              },

              shell: false,

              detached:
                !isWindows,
            },
          );

        let stdout = "";
        let stderr = "";
        let timedOut = false;
        let killEscalationTimer:
          NodeJS.Timeout | undefined;

        onSpawn?.({
          kill: (
            signal = "SIGTERM",
          ) => {
            if (processHandle.pid) {
              killProcessTree(
                processHandle.pid,
                signal,
              );
            }
          },
        });

        const timeoutTimer =
          setTimeout(
            () => {
              timedOut = true;

              if (processHandle.pid) {
                killProcessTree(
                  processHandle.pid,
                  "SIGTERM",
                );
              }

              killEscalationTimer =
                setTimeout(
                  () => {
                    if (processHandle.pid) {
                      killProcessTree(
                        processHandle.pid,
                        "SIGKILL",
                      );
                    }
                  },
                  KILL_ESCALATION_MS,
                );
            },
            timeoutMs,
          );

        processHandle.stdout.on(
          "data",
          (chunk) => {
            const text =
              chunk.toString();

            stdout += text;

            onOutput?.({
              stream: "stdout",
              text,
            });
          },
        );

        processHandle.stderr.on(
          "data",
          (chunk) => {
            const text =
              chunk.toString();

            stderr += text;

            onOutput?.({
              stream: "stderr",
              text,
            });
          },
        );

        processHandle.on(
          "error",
          (error) => {
            clearTimeout(
              timeoutTimer,
            );

            if (killEscalationTimer) {
              clearTimeout(
                killEscalationTimer,
              );
            }

            reject(error);
          },
        );

        processHandle.on(
          "close",
          (code) => {
            clearTimeout(
              timeoutTimer,
            );

            if (killEscalationTimer) {
              clearTimeout(
                killEscalationTimer,
              );
            }

            resolve({
              exitCode:
                code ?? -1,

              stdout,

              stderr,

              startedAt,

              finishedAt:
                new Date().toISOString(),

              timedOut,
            });
          },
        );
      },
    );
  }
}
