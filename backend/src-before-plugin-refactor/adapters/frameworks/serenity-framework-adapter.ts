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

export class SerenityFrameworkAdapter
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
            .includes("serenity"),
      );
  }

  async inspect(
    workspace: ProjectWorkspace,
  ): Promise<FrameworkDescriptor> {

    const sources = [
      await readTextIfExists(
        resolve(
          workspace.root,
          "pom.xml",
        ),
      ),
      await readTextIfExists(
        resolve(
          workspace.root,
          "build.gradle",
        ),
      ),
      await readTextIfExists(
        resolve(
          workspace.root,
          "build.gradle.kts",
        ),
      ),
    ]
      .filter(
        (
          value,
        ): value is string =>
          Boolean(value),
      )
      .join("\n");

    const match =
      sources.match(
        /serenity(?:\.core)?\.version[^0-9]*([0-9]+(?:\.[0-9]+){1,3})/i,
      );

    return {
      type: "SERENITY",
      version:
        match?.[1],
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
