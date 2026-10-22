import {
  resolve,
} from "node:path";

import type {
  BuildToolDetector,
  ProjectWorkspace,
} from "../../core/inspection/contracts.js";

import type {
  BuildToolDescriptor,
} from "../../core/project/model.js";

import {
  fileExists,
  readTextIfExists,
} from "../../core/inspection/file-utils.js";

export class GradleBuildToolDetector
  implements BuildToolDetector {

  async detect(
    workspace: ProjectWorkspace,
  ): Promise<BuildToolDescriptor[]> {

    const buildGradle =
      resolve(
        workspace.root,
        "build.gradle",
      );

    const buildGradleKts =
      resolve(
        workspace.root,
        "build.gradle.kts",
      );

    const hasGradle =
      await fileExists(
        buildGradle,
      ) ||
      await fileExists(
        buildGradleKts,
      );

    if (!hasGradle) {
      return [];
    }

    const wrapperProperties =
      resolve(
        workspace.root,
        "gradle",
        "wrapper",
        "gradle-wrapper.properties",
      );

    const wrapperAvailable =
      await fileExists(
        wrapperProperties,
      );

    let version:
      | string
      | undefined;

    if (wrapperAvailable) {
      const content =
        await readTextIfExists(
          wrapperProperties,
        );

      const match =
        content?.match(
          /gradle-([0-9.]+)-(?:bin|all)\.zip/i,
        );

      version =
        match?.[1];
    }

    return [
      {
        type: "GRADLE",
        versionConstraint:
          version,
        wrapperAvailable,
      },
    ];
  }
}
