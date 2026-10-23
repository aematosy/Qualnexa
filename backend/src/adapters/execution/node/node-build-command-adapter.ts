import type {
  BuildCommandAdapter,
} from "../../../core/execution/contracts.js";

import type {
  BuildInvocation,
  ProcessSpecification,
} from "../../../core/execution/model.js";

import type {
  ProjectManifest,
} from "../../../core/project/model.js";

const NODE_PACKAGE_MANAGERS = [
  "NPM",
  "PNPM",
  "YARN",
] as const;

export class NodeBuildCommandAdapter
implements BuildCommandAdapter {

  supports(
    project: ProjectManifest,
  ): boolean {

    return project.buildTools.some(
      (buildTool) =>
        NODE_PACKAGE_MANAGERS.includes(
          buildTool.type.toUpperCase() as typeof NODE_PACKAGE_MANAGERS[number],
        ),
    );
  }

  createProcessSpecification(
    project: ProjectManifest,
    invocation: BuildInvocation,
  ): ProcessSpecification {

    const manager =
      resolvePackageManager(project);

    return {
      executable:
        manager.executable,

      arguments: [
        ...manager.baseArguments,
        ...invocation.arguments,
      ],

      workingDirectory:
        project.source.location,

      environment: {},
    };
  }
}

function resolvePackageManager(
  project: ProjectManifest,
): {
  executable: string;
  baseArguments: string[];
} {

  const buildTool =
    project.buildTools.find(
      (candidate) =>
        NODE_PACKAGE_MANAGERS.includes(
          candidate.type.toUpperCase() as typeof NODE_PACKAGE_MANAGERS[number],
        ),
    );

  switch (
    buildTool?.type.toUpperCase()
  ) {
    case "PNPM":
      return {
        executable: "pnpm",
        baseArguments: [
          "exec",
        ],
      };

    case "YARN":
      return {
        executable: "yarn",
        baseArguments: [
          "exec",
        ],
      };

    default:
      return {
        executable: "npx",
        baseArguments: [
          "--no-install",
        ],
      };
  }
}
