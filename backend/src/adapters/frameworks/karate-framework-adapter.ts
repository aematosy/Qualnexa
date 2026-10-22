import {
  resolve,
} from "node:path";

import type {
  FrameworkAdapter,
  ProjectWorkspace,
} from "../../core/inspection/contracts.js";

import type {
  EnvironmentDescriptor,
  FrameworkDescriptor,
  TestCatalog,
} from "../../core/project/model.js";

import {
  readTextIfExists,
} from "../../core/inspection/file-utils.js";

import {
  discoverGherkinTests,
} from "./gherkin-discovery.js";

const descriptor: FrameworkDescriptor = {
  id:
    "karate",

  displayName:
    "Karate",

  capabilities: [
    "DISCOVER_TESTS",
    "SELECT_ALL",
    "SELECT_CONTAINER",
    "SELECT_TEST",
    "SELECT_LABEL",
  ],

  vocabulary: {
    container:
      "Feature",

    test:
      "Scenario",

    label:
      "Tag",
  },

  selectors: [
    {
      id:
        "all",

      displayName:
        "All",

      kind:
        "ALL",
    },

    {
      id:
        "container",

      displayName:
        "Feature",

      kind:
        "CONTAINER",
    },

    {
      id:
        "test",

      displayName:
        "Scenario",

      kind:
        "TEST",
    },

    {
      id:
        "label",

      displayName:
        "Tags",

      kind:
        "LABEL",
    },
  ],
};

export class KarateFrameworkAdapter
  implements FrameworkAdapter {

  async supports(
    workspace: ProjectWorkspace,
  ): Promise<boolean> {

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
    ];

    return sources
      .filter(Boolean)
      .some(
        (content) =>
          content
            ?.toLowerCase()
            .includes(
              "karate",
            ),
      );
  }

  async inspect(
    _workspace: ProjectWorkspace,
  ): Promise<FrameworkDescriptor> {

    return descriptor;
  }

  async discoverEnvironments(
    workspace: ProjectWorkspace,
  ): Promise<EnvironmentDescriptor[]> {

    const candidates = [
      await readTextIfExists(
        resolve(
          workspace.root,
          "karate-config.js",
        ),
      ),

      await readTextIfExists(
        resolve(
          workspace.root,
          "src",
          "test",
          "java",
          "karate-config.js",
        ),
      ),

      await readTextIfExists(
        resolve(
          workspace.root,
          "src",
          "test",
          "resources",
          "karate-config.js",
        ),
      ),
    ];

    const environments =
      new Map<
        string,
        EnvironmentDescriptor
      >();

    for (const content of candidates) {
      if (!content) {
        continue;
      }

      const patterns = [
        /karate\.env\s*===?\s*["'`]([^"'`]+)["'`]/g,
        /env\s*===?\s*["'`]([^"'`]+)["'`]/g,
        /case\s+["'`]([^"'`]+)["'`]\s*:/g,
      ];

      for (const pattern of patterns) {
        for (
          const match
          of content.matchAll(pattern)
        ) {
          const id =
            match[1]?.trim();

          if (!id) {
            continue;
          }

          environments.set(
            id,
            {
              id,
              displayName: id,
              source:
                "Karate configuration",
            },
          );
        }
      }

      const defaultFallbackPatterns = [
        /karate\.env\s*\|\|\s*["'`]([^"'`]+)["'`]/,
        /\benv\s*=\s*karate\.env\s*\|\|\s*["'`]([^"'`]+)["'`]/,
      ];

      for (
        const pattern
        of defaultFallbackPatterns
      ) {
        const match =
          content.match(pattern);

        const id =
          match?.[1]?.trim();

        if (!id) {
          continue;
        }

        environments.set(
          id,
          {
            id,
            displayName: id,
            source:
              "Karate configuration (default fallback)",
            isDefault: true,
          },
        );
      }
    }

    return [
      ...environments.values(),
    ];
  }

  async discoverTests(
    workspace: ProjectWorkspace,
  ): Promise<TestCatalog> {

    return discoverGherkinTests(
      workspace.root,
      {
        frameworkId:
          descriptor.id,

        vocabulary:
          descriptor.vocabulary,

        selectors:
          descriptor.selectors,
      },
    );
  }
}