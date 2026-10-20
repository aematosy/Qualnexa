import type {
  ProjectManifest,
} from "../project/model.js";

import type {
  BuildInvocation,
  ExecutionPlan,
  ProcessResult,
  ProcessSpecification,
} from "./model.js";

export interface ExecutionRecipeProvider {
  supports(
    project: ProjectManifest,
  ): boolean;

  createInvocation(
    project: ProjectManifest,
    plan: ExecutionPlan,
  ): BuildInvocation;
}

export interface BuildCommandAdapter {
  supports(
    project: ProjectManifest,
  ): boolean;

  createProcessSpecification(
    project: ProjectManifest,
    invocation: BuildInvocation,
  ): ProcessSpecification;
}

export interface ProcessExecutor {
  execute(
    specification: ProcessSpecification,
  ): Promise<ProcessResult>;
}