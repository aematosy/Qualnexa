import type {
  CustomCommandConfig,
  ProcessSpecification,
} from "../../../core/execution/model.js";

import type {
  ProjectManifest,
} from "../../../core/project/model.js";

const DEFAULT_TIMEOUT_MINUTES = 30;

export function buildCustomCommandSpecification(
  project: ProjectManifest,
  customCommand: CustomCommandConfig,
): ProcessSpecification {

  return {
    executable:
      customCommand.executable,

    arguments:
      customCommand.arguments,

    workingDirectory:
      customCommand.workingDirectory ||
      project.source.location,

    environment:
      customCommand.environment ?? {},

    timeoutMs:
      (
        customCommand.timeoutMinutes ??
        DEFAULT_TIMEOUT_MINUTES
      ) * 60 * 1000,
  };
}
