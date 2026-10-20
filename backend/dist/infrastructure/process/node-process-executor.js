import { spawn, } from "node:child_process";
export class NodeProcessExecutor {
    async execute(specification) {
        const startedAt = new Date().toISOString();
        return new Promise((resolve, reject) => {
            const processHandle = spawn(specification.executable, specification.arguments, {
                cwd: specification.workingDirectory,
                env: {
                    ...process.env,
                    ...specification.environment,
                },
                shell: false,
            });
            let stdout = "";
            let stderr = "";
            processHandle.stdout.on("data", (chunk) => {
                stdout +=
                    chunk.toString();
            });
            processHandle.stderr.on("data", (chunk) => {
                stderr +=
                    chunk.toString();
            });
            processHandle.on("error", reject);
            processHandle.on("close", (code) => {
                resolve({
                    exitCode: code ?? -1,
                    stdout,
                    stderr,
                    startedAt,
                    finishedAt: new Date().toISOString(),
                });
            });
        });
    }
}
