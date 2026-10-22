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

export class MavenBuildCommandAdapter
implements BuildCommandAdapter {

  supports(
    project: ProjectManifest,
  ): boolean {

    return project.buildTools.some(
      (buildTool) =>
        buildTool.type.toUpperCase() ===
        "MAVEN",
    );
  }

  createProcessSpecification(
    project: ProjectManifest,
    invocation: BuildInvocation,
  ): ProcessSpecification {

    const root =
      project.source.location;

    const mavenBuild =
      project.buildTools.find(
        (buildTool) =>
          buildTool.type.toUpperCase() ===
          "MAVEN",
      );

    const isWindows =
      process.platform === "win32";

    const executable =
      mavenBuild?.wrapperAvailable
        ? join(
            root,
            isWindows
              ? "mvnw.cmd"
              : "mvnw",
          )
        : isWindows
          ? "mvn.cmd"
          : "mvn";

    const propertyArguments =
      Object.entries(
        invocation.properties,
      ).map(
        ([key, value]) =>
          `-D${key}=${value}`,
      );

    const testClassArgument =
      invocation.testClassFilter &&
      invocation.testClassFilter.length > 0
        ? [
            `-Dtest=${invocation.testClassFilter.join(",")}`,
          ]
        : [];

    return {
      executable,

      arguments: [
        "-B",
        ...invocation.tasks,
        ...propertyArguments,
        ...testClassArgument,
        ...invocation.arguments,
      ],

      workingDirectory:
        root,

      environment: {},
    };
  }
}
