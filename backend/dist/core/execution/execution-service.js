import { randomUUID, } from "node:crypto";
import { saveExecutionJob, } from "./execution-store.js";
export class ExecutionService {
    recipeProviders;
    commandAdapters;
    processExecutor;
    constructor(recipeProviders, commandAdapters, processExecutor) {
        this.recipeProviders = recipeProviders;
        this.commandAdapters = commandAdapters;
        this.processExecutor = processExecutor;
    }
    async start(project, plan) {
        if (plan.status !== "READY") {
            throw new Error("Execution plan is not ready.");
        }
        const recipeProvider = this.recipeProviders.find((provider) => provider.supports(project));
        if (!recipeProvider) {
            throw new Error("No execution recipe is available for this project.");
        }
        const invocation = recipeProvider.createInvocation(project, plan);
        const commandAdapter = this.commandAdapters.find((adapter) => adapter.supports(project));
        if (!commandAdapter) {
            throw new Error("No build command adapter is available for this project.");
        }
        const specification = commandAdapter.createProcessSpecification(project, invocation);
        const job = {
            id: randomUUID(),
            planId: plan.id,
            projectId: project.id,
            status: "RUNNING",
            startedAt: new Date().toISOString(),
            stdout: "",
            stderr: "",
        };
        saveExecutionJob(job);
        try {
            const result = await this.processExecutor.execute(specification);
            const completed = {
                ...job,
                status: result.exitCode === 0
                    ? "PASSED"
                    : "FAILED",
                startedAt: result.startedAt,
                finishedAt: result.finishedAt,
                exitCode: result.exitCode,
                stdout: result.stdout,
                stderr: result.stderr,
            };
            saveExecutionJob(completed);
            return completed;
        }
        catch (error) {
            const failed = {
                ...job,
                status: "FAILED",
                finishedAt: new Date().toISOString(),
                error: error instanceof Error
                    ? error.message
                    : "Execution failed.",
            };
            saveExecutionJob(failed);
            return failed;
        }
    }
}
