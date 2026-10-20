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
} from "./model.js";

import {
  saveExecutionJob,
} from "./execution-store.js";

export class ExecutionService {
  constructor(
    private readonly recipeProviders:
      ExecutionRecipeProvider[],

    private readonly commandAdapters:
      BuildCommandAdapter[],

    private readonly processExecutor:
      ProcessExecutor,
  ) {}

  async start(
    project: ProjectManifest,
    plan: ExecutionPlan,
  ): Promise<ExecutionJob> {

    if (
      plan.status !== "READY"
    ) {
      throw new Error(
        "Execution plan is not ready.",
      );
    }

    const recipeProvider =
      this.recipeProviders.find(
        (provider) =>
          provider.supports(
            project,
          ),
      );

    if (!recipeProvider) {
      throw new Error(
        "No execution recipe is available for this project.",
      );
    }

    const invocation =
      recipeProvider.createInvocation(
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

    const specification =
      commandAdapter.createProcessSpecification(
        project,
        invocation,
      );

    const job:
      ExecutionJob = {
        id:
          randomUUID(),

        planId:
          plan.id,

        projectId:
          project.id,

        status:
          "RUNNING",

        startedAt:
          new Date().toISOString(),

        stdout:
          "",

        stderr:
          "",
      };

    saveExecutionJob(
      job,
    );

    try {
      const result =
        await this.processExecutor.execute(
          specification,
        );

      const completed:
        ExecutionJob = {
        ...job,

        status:
          result.exitCode === 0
            ? "PASSED"
            : "FAILED",

        startedAt:
          result.startedAt,

        finishedAt:
          result.finishedAt,

        exitCode:
          result.exitCode,

        stdout:
          result.stdout,

        stderr:
          result.stderr,
      };

      saveExecutionJob(
        completed,
      );

      return completed;

    } catch (error) {
      const failed:
        ExecutionJob = {
        ...job,

        status:
          "FAILED",

        finishedAt:
          new Date().toISOString(),

        error:
          error instanceof Error
            ? error.message
            : "Execution failed.",
      };

      saveExecutionJob(
        failed,
      );

      return failed;
    }
  }
}