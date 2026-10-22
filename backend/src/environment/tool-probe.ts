import {
  spawn,
} from "node:child_process";

export interface ToolProbeResult {
  found: boolean;
  version?: string | undefined;
  rawOutput?: string | undefined;
  error?: string | undefined;
}

export function extractVersion(
  output: string,
  pattern: RegExp,
): string | undefined {

  const match =
    output.match(pattern);

  const candidate =
    match?.[1]?.trim();

  return candidate && /^\d/.test(candidate)
    ? candidate
    : undefined;
}

export async function probeCommand(
  executable: string,
  args: string[],
  versionPattern?: RegExp,
  options?: {
    env?: Record<string, string>;
    cwd?: string;
    timeoutMs?: number;
  },
): Promise<ToolProbeResult> {

  const timeoutMs =
    options?.timeoutMs ??
    6000;

  return new Promise(
    (resolve) => {

      let settled = false;

      const processHandle =
        spawn(
          executable,
          args,
          {
            cwd:
              options?.cwd,

            env: {
              ...process.env,
              ...options?.env,
            },

            shell: false,
          },
        );

      let stdout = "";
      let stderr = "";

      const timer =
        setTimeout(
          () => {
            if (settled) {
              return;
            }

            settled = true;

            processHandle.kill(
              "SIGKILL",
            );

            resolve({
              found: false,
              error:
                "Command timed out.",
            });
          },
          timeoutMs,
        );

      processHandle.stdout?.on(
        "data",
        (chunk) => {
          stdout +=
            chunk.toString();
        },
      );

      processHandle.stderr?.on(
        "data",
        (chunk) => {
          stderr +=
            chunk.toString();
        },
      );

      processHandle.on(
        "error",
        (error) => {
          if (settled) {
            return;
          }

          settled = true;

          clearTimeout(timer);

          resolve({
            found: false,
            error:
              error instanceof Error
                ? error.message
                : "Command failed to start.",
          });
        },
      );

      processHandle.on(
        "close",
        () => {
          if (settled) {
            return;
          }

          settled = true;

          clearTimeout(timer);

          const combined =
            `${stdout}\n${stderr}`;

          const version =
            versionPattern
              ? extractVersion(
                  combined,
                  versionPattern,
                )
              : undefined;

          resolve({
            found: true,
            version,
            rawOutput:
              combined.trim(),
          });
        },
      );
    },
  );
}
