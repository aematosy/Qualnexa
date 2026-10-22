import {
  join,
} from "node:path";

import type {
  ProjectManifest,
} from "../../../core/project/model.js";

import type {
  BuildCommandAdapter,
} from "../../../core/execution/contracts.js";

import type {
  BuildInvocation,
  ProcessSpecification,
} from "../../../core/execution/model.js";

export class GradleBuildCommandAdapter
implements BuildCommandAdapter {

  supports(
    project: ProjectManifest,
  ): boolean {

    return project.buildTools.some(
      (buildTool) =>
        buildTool.type.toUpperCase() ===
        "GRADLE",
    );
  }

  createProcessSpecification(
    project: ProjectManifest,
    invocation: BuildInvocation,
  ): ProcessSpecification {

    const root =
      project.source.location;

    const gradleBuild =
      project.buildTools.find(
        (buildTool) =>
          buildTool.type.toUpperCase() ===
          "GRADLE",
      );

    const isWindows =
      process.platform === "win32";

    const executable =
      gradleBuild?.wrapperAvailable
        ? join(
            root,
            isWindows
              ? "gradlew.bat"
              : "gradlew",
          )
        : isWindows
          ? "gradle.bat"
          : "gradle";

    const propertyArguments =
      Object.entries(
        invocation.properties,
      ).map(
        ([key, value]) =>
          `-D${key}=${value}`,
      );

    const testClassArguments =
      (
        invocation.testClassFilter ?? []
      ).flatMap(
        (className) => [
          "--tests",
          `*${className}`,
        ],
      );

    return {
      executable,

      arguments: [
        ...invocation.tasks,
        ...propertyArguments,
        ...testClassArguments,
        ...invocation.arguments,
      ],

      workingDirectory:
        root,

      environment: {},
    };
  }
}
