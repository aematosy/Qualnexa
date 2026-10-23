import {
  randomUUID,
} from "node:crypto";

import type {
  ProjectManifest,
} from "../project/model.js";

import type {
  BuildCommandAdapter,
  ExecutionRecipeProvider,
  ProcessExecutor,
} from "./contracts.js";

import type {
  ExecutionJob,
  ExecutionPlan,
  ExecutionPreferences,
  ProcessHandle,
  ProcessSpecification,
} from "./model.js";

import {
  getExecutionJob,
  saveExecutionJob,
} from "./execution-store.js";

import {
  buildCustomCommandSpecification,
} from "../../adapters/execution/generic/custom-command-builder.js";

import {
  applyJdkOverride,
} from "../../environment/jdk-override.js";

import {
  artifactsDirectoryFor,
} from "../../config/artifacts-dir.js";

import {
  harvestArtifacts,
} from "../../results/artifact-harvester.js";

import {
  parseJunitXmlResults,
} from "../../results/junit-xml-results-parser.js";

import {
  parseNativeReport,
} from "../../results/native-report-parser.js";

const DEFAULT_TIMEOUT_MS =
  30 * 60 * 1000;

const CANCEL_KILL_ESCALATION_MS = 5000;

export class ExecutionService {

  private readonly activeProcesses =
    new Map<string, ProcessHandle>();

  private readonly cancelledJobIds =
    new Set<string>();

  constructor(
    private readonly recipeProviders:
      ExecutionRecipeProvider[],

    private readonly commandAdapters:
      BuildCommandAdapter[],

    private readonly processExecutor:
      ProcessExecutor,
  ) {}

  requestCancellation(
    jobId: string,
  ): boolean {

    const handle =
      this.activeProcesses.get(
        jobId,
      );

    if (!handle) {
      return false;
    }

    this.cancelledJobIds.add(
      jobId,
    );

    handle.kill("SIGTERM");

    setTimeout(
      () => {
        if (
          this.activeProcesses.has(
            jobId,
          )
        ) {
          handle.kill("SIGKILL");
        }
      },
      CANCEL_KILL_ESCALATION_MS,
    );

    return true;
  }

  createJob(
    project: ProjectManifest,
    plan: ExecutionPlan,
  ): ExecutionJob {

    const job: ExecutionJob = {
      id:
        randomUUID(),

      planId:
        plan.id,

      projectId:
        project.id,

      projectName:
        project.name,

      frameworks:
        project.frameworks.map(
          (framework) =>
            framework.displayName,
        ),

      environment:
        plan.environment,

      lifecycleStatus:
        "QUEUED",

      status:
        "QUEUED",

      stdout:
        "",

      stderr:
        "",

      artifacts:
        [],
    };

    saveExecutionJob(job);

    return job;
  }

  async run(
    job: ExecutionJob,
    project: ProjectManifest,
    plan: ExecutionPlan,
    preferences?:
      ExecutionPreferences,
  ): Promise<void> {

    let specification:
      ProcessSpecification;

    try {
      specification =
        await this.buildSpecification(
          project,
          plan,
          preferences,
        );
    } catch (error) {
      saveExecutionJob({
        ...job,

        lifecycleStatus:
          "ERROR",

        testResultStatus:
          "NO_RESULTS",

        status:
          "ERROR",

        finishedAt:
          new Date().toISOString(),

        error:
          error instanceof Error
            ? error.message
            : "Unable to prepare execution command.",
      });

      return;
    }

    const running: ExecutionJob = {
      ...job,

      lifecycleStatus:
        "RUNNING",

      status:
        "RUNNING",

      startedAt:
        new Date().toISOString(),

      command:
        `${specification.executable} ${specification.arguments.join(" ")}`,
    };

    saveExecutionJob(running);

    try {
      const result =
        await this.processExecutor.execute(
          specification,
          (chunk) => {
            const current =
              getExecutionJob(
                job.id,
              );

            if (!current) {
              return;
            }

            saveExecutionJob({
              ...current,

              stdout:
                chunk.stream === "stdout"
                  ? current.stdout + chunk.text
                  : current.stdout,

              stderr:
                chunk.stream === "stderr"
                  ? current.stderr + chunk.text
                  : current.stderr,
            });
          },

          (handle) => {
            this.activeProcesses.set(
              job.id,
              handle,
            );
          },
        );

      this.activeProcesses.delete(
        job.id,
      );

      const wasCancelled =
        this.cancelledJobIds.delete(
          job.id,
        );

      const startedAt =
        result.startedAt;

      const finishedAt =
        result.finishedAt;

      const durationMs =
        new Date(finishedAt).getTime() -
        new Date(startedAt).getTime();

      // Some filesystems only have 1-second mtime resolution, so give a
      // small buffer before the recorded start time to avoid excluding a
      // report file that was actually produced by this execution.
      const resultsSince =
        new Date(
          new Date(startedAt).getTime() -
          5000,
        );

      const executionResult =
        wasCancelled
          ? undefined
          : await parseJunitXmlResults(
              project.source.location,
              resultsSince,
            ).catch(
              () => undefined,
            );

      const nativeReport =
        wasCancelled
          ? undefined
          : await parseNativeReport(
              project.source.location,
              project.frameworks.map(
                (framework) => framework.id,
              ),
            ).catch(
              () => undefined,
            );

      const artifacts =
        await harvestArtifacts(
          project.source.location,
          artifactsDirectoryFor(
            job.id,
          ),

          project.frameworks.map(
            (framework) =>
              framework.id,
          ),

          project.buildTools[0]?.type,
        ).catch(
          () => [],
        );

      const lifecycleStatus =
        wasCancelled
          ? "CANCELLED"
          : result.exitCode === 0 || result.timedOut
            ? "COMPLETED"
            : "ERROR";

      const testResultStatus =
        wasCancelled
          ? "NO_RESULTS"
          : result.timedOut
            ? "FAILED"
            : executionResult
              ? executionResult.total === 0
                ? "NO_RESULTS"
                : executionResult.failed > 0
                  ? "FAILED"
                  : "PASSED"
              : result.exitCode === 0
                ? "NO_RESULTS"
                : "FAILED";

      const status = lifecycleStatus === "COMPLETED"
        ? testResultStatus === "FAILED"
          ? "ERROR"
          : testResultStatus === "NO_RESULTS"
            ? "COMPLETED"
            : "COMPLETED"
        : lifecycleStatus;

      saveExecutionJob({
        ...running,

        lifecycleStatus,

        testResultStatus,

        status,

        startedAt,
        finishedAt,
        durationMs,

        exitCode:
          result.exitCode,

        stdout:
          result.stdout,

        stderr:
          result.stderr,

        result:
          executionResult,

        artifacts,

        nativeReport:
          nativeReport
            ? {
                framework:
                  nativeReport.framework,
                reportPath:
                  nativeReport.reportPath,
                featurePath:
                  nativeReport.relativePath ??
                  nativeReport.path,
              }
            : undefined,

        error:
          wasCancelled
            ? "Execution was stopped by the user."
            : result.timedOut
              ? `Execution timed out after ${Math.round((specification.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 60000)} minute(s).`
              : undefined,
      });

    } catch (error) {
      this.activeProcesses.delete(
        job.id,
      );

      this.cancelledJobIds.delete(
        job.id,
      );

      saveExecutionJob({
        ...running,

        lifecycleStatus:
          "ERROR",

        testResultStatus:
          "NO_RESULTS",

        status:
          "ERROR",

        finishedAt:
          new Date().toISOString(),

        error:
          error instanceof Error
            ? error.message
            : "Execution failed.",
      });
    }
  }

  private async buildSpecification(
    project: ProjectManifest,
    plan: ExecutionPlan,
    preferences?:
      ExecutionPreferences,
  ): Promise<ProcessSpecification> {

    let specification:
      ProcessSpecification;

    if (preferences?.customCommand) {
      specification =
        buildCustomCommandSpecification(
          project,
          preferences.customCommand,
        );
    } else {

      const recipeProvider =
        this.recipeProviders.find(
          (provider) =>
            provider.supports(
              project,
            ),
        );

      if (!recipeProvider) {
        throw new Error(
          "No execution recipe is available for this project. " +
          "Configure a custom command for it instead.",
        );
      }

      const invocation =
        await recipeProvider.createInvocation(
          project,
          plan,
        );

      const commandAdapter =
        this.commandAdapters.find(
          (adapter) =>
            adapter.supports(
              project,
            ),
        );

      if (!commandAdapter) {
        throw new Error(
          "No build command adapter is available for this project.",
        );
      }

      specification =
        commandAdapter.createProcessSpecification(
          project,
          invocation,
        );

      specification.timeoutMs ??=
        DEFAULT_TIMEOUT_MS;
    }

    const hasJavaRuntime =
      project.runtimes.some(
        (runtime) =>
          runtime.type === "JAVA",
      );

    if (
      preferences?.jdkPath &&
      hasJavaRuntime
    ) {
      specification =
        applyJdkOverride(
          specification,
          preferences.jdkPath,
        );
    }

    return specification;
  }
}
