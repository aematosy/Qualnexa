import {
  resolve,
} from "node:path";

import type {
  FrameworkAdapter,
  ProjectWorkspace,
} from "../../core/inspection/contracts.js";

import type {
  FrameworkDescriptor,
  TestCatalog,
} from "../../core/project/model.js";

import {
  readTextIfExists,
} from "../../core/inspection/file-utils.js";

import {
  discoverGherkinTests,
} from "./gherkin-discovery.js";

export class KarateFrameworkAdapter
  implements FrameworkAdapter {

  async supports(
    workspace: ProjectWorkspace,
  ): Promise<boolean> {

    const pom =
      await readTextIfExists(
        resolve(
          workspace.root,
          "pom.xml",
        ),
      );

    const gradle =
      await readTextIfExists(
        resolve(
          workspace.root,
          "build.gradle",
        ),
      );

    const gradleKts =
      await readTextIfExists(
        resolve(
          workspace.root,
          "build.gradle.kts",
        ),
      );

    return [
      pom,
      gradle,
      gradleKts,
    ]
      .filter(Boolean)
      .some(
        (content) =>
          content
            ?.toLowerCase()
            .includes("karate"),
      );
  }

  async inspect(
    workspace: ProjectWorkspace,
  ): Promise<FrameworkDescriptor> {

    return {
      type: "KARATE",
      capabilities: [
        "TEST_DISCOVERY",
        "LABEL_FILTERING",
        "CONTAINER_EXECUTION",
        "TEST_EXECUTION",
      ],
    };
  }

  async discoverTests(
    workspace: ProjectWorkspace,
  ): Promise<TestCatalog> {
    return discoverGherkinTests(
      workspace.root,
    );
  }
}
