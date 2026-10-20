import {
  readFile,
} from "node:fs/promises";

import {
  relative,
  resolve,
} from "node:path";

import type {
  FrameworkAdapter,
  ProjectWorkspace,
} from "../../core/inspection/contracts.js";

import type {
  FrameworkDescriptor,
  TestCatalog,
  TestContainerDescriptor,
} from "../../core/project/model.js";

import {
  findFiles,
} from "../../core/inspection/file-finder.js";

import {
  readTextIfExists,
} from "../../core/inspection/file-utils.js";

const descriptor: FrameworkDescriptor = {
  id:
    "pytest",

  displayName:
    "Pytest",

  capabilities: [
    "DISCOVER_TESTS",
    "SELECT_ALL",
    "SELECT_CONTAINER",
    "SELECT_TEST",
    "SELECT_LABEL",
  ],

  vocabulary: {
    container:
      "Module",

    test:
      "Test",

    label:
      "Marker",
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
        "Module",

      kind:
        "CONTAINER",
    },

    {
      id:
        "test",

      displayName:
        "Test",

      kind:
        "TEST",
    },

    {
      id:
        "label",

      displayName:
        "Markers",

      kind:
        "LABEL",
    },
  ],
};

export class PytestFrameworkAdapter
  implements FrameworkAdapter {

  async supports(
    workspace: ProjectWorkspace,
  ): Promise<boolean> {

    const pyproject =
      await readTextIfExists(
        resolve(
          workspace.root,
          "pyproject.toml",
        ),
      );

    const requirements =
      await readTextIfExists(
        resolve(
          workspace.root,
          "requirements.txt",
        ),
      );

    return Boolean(
      pyproject
        ?.toLowerCase()
        .includes("pytest") ||
      requirements
        ?.toLowerCase()
        .includes("pytest"),
    );
  }

  async inspect(
    _workspace: ProjectWorkspace,
  ): Promise<FrameworkDescriptor> {

    return descriptor;
  }

  async discoverTests(
    workspace: ProjectWorkspace,
  ): Promise<TestCatalog> {

    const files =
      await findFiles(
        workspace.root,
        (_path, name) =>
          /^test_.*\.py$/i.test(name) ||
          /_test\.py$/i.test(name),
      );

    const containers:
      TestContainerDescriptor[] = [];

    const markers =
      new Set<string>();

    let testCount = 0;

    for (const file of files) {
      const content =
        await readFile(
          file,
          "utf8",
        );

      const markerMatches = [
        ...content.matchAll(
          /@pytest\.mark\.([A-Za-z0-9_]+)/g,
        ),
      ];

      markerMatches.forEach(
        (match) => {
          if (match[1]) {
            markers.add(
              match[1],
            );
          }
        },
      );

      const tests = [
        ...content.matchAll(
          /^def\s+(test_[A-Za-z0-9_]+)\s*\(/gm,
        ),
      ].map(
        (match, index) => ({
          id:
            `${relative(workspace.root, file)}:${index + 1}`,

          name:
            match[1] ??
            `test_${index + 1}`,

          path:
            relative(
              workspace.root,
              file,
            ),

          labels: [],
        }),
      );

      testCount +=
        tests.length;

      containers.push({
        id:
          relative(
            workspace.root,
            file,
          ),

        frameworkId:
          descriptor.id,

        name:
          relative(
            workspace.root,
            file,
          ),

        path:
          relative(
            workspace.root,
            file,
          ),

        vocabulary:
          descriptor.vocabulary,

        labels: [],

        tests,
      });
    }

    return {
      containers,

      labels:
        [...markers].sort(),

      selectors:
        descriptor.selectors,

      testCount,
    };
  }
}