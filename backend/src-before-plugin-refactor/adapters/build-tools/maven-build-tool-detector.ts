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

export class MavenBuildToolDetector
  implements BuildToolDetector {

  async detect(
    workspace: ProjectWorkspace,
  ): Promise<BuildToolDescriptor[]> {

    const pom =
      resolve(
        workspace.root,
        "pom.xml",
      );

    if (!(await fileExists(pom))) {
      return [];
    }

    const wrapperProperties =
      resolve(
        workspace.root,
        ".mvn",
        "wrapper",
        "maven-wrapper.properties",
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
          /apache-maven-([0-9.]+)-bin/i,
        );

      version =
        match?.[1];
    }

    return [
      {
        type: "MAVEN",
        versionConstraint:
          version,
        wrapperAvailable,
      },
    ];
  }
}
