import type {
  ProjectManifest,
} from "../project/model.js";

import type {
  BuildInvocation,
  ExecutionPlan,
  ProcessOutputListener,
  ProcessResult,
  ProcessSpawnListener,
  ProcessSpecification,
} from "./model.js";

export interface ExecutionRecipeProvider {
  supports(
    project: ProjectManifest,
  ): boolean;

  createInvocation(
    project: ProjectManifest,
    plan: ExecutionPlan,
  ): Promise<BuildInvocation>;
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
    onOutput?: ProcessOutputListener,
    onSpawn?: ProcessSpawnListener,
  ): Promise<ProcessResult>;
}