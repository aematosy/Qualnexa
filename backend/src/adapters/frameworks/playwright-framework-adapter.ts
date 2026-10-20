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
  readJsonIfExists,
} from "../../core/inspection/file-utils.js";

type PackageJson = {
  dependencies?: Record<
    string,
    string
  >;

  devDependencies?: Record<
    string,
    string
  >;
};

const baseDescriptor: FrameworkDescriptor = {
  id:
    "playwright",

  displayName:
    "Playwright",

  capabilities: [
    "DISCOVER_TESTS",
    "SELECT_ALL",
    "SELECT_CONTAINER",
    "SELECT_TEST",
    "SELECT_EXPRESSION",
  ],

  vocabulary: {
    container:
      "Spec",

    test:
      "Test",

    label:
      "Label",
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
        "Spec",

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
        "expression",

      displayName:
        "Grep",

      kind:
        "EXPRESSION",
    },
  ],
};

export class PlaywrightFrameworkAdapter
  implements FrameworkAdapter {

  async supports(
    workspace: ProjectWorkspace,
  ): Promise<boolean> {

    const packageJson =
      await readJsonIfExists<PackageJson>(
        resolve(
          workspace.root,
          "package.json",
        ),
      );

    const dependencies = {
      ...packageJson?.dependencies,
      ...packageJson?.devDependencies,
    };

    return Boolean(
      dependencies[
        "@playwright/test"
      ] ||
      dependencies[
        "playwright"
      ],
    );
  }

  async inspect(
    workspace: ProjectWorkspace,
  ): Promise<FrameworkDescriptor> {

    const packageJson =
      await readJsonIfExists<PackageJson>(
        resolve(
          workspace.root,
          "package.json",
        ),
      );

    const dependencies = {
      ...packageJson?.dependencies,
      ...packageJson?.devDependencies,
    };

    return {
      ...baseDescriptor,

      version:
        dependencies[
          "@playwright/test"
        ] ??
        dependencies[
          "playwright"
        ],
    };
  }

  async discoverTests(
    workspace: ProjectWorkspace,
  ): Promise<TestCatalog> {

    const files =
      await findFiles(
        workspace.root,
        (_path, name) =>
          /\.(spec|test)\.(ts|tsx|js|jsx)$/i.test(
            name,
          ),
      );

    const containers:
      TestContainerDescriptor[] = [];

    let testCount = 0;

    for (const file of files) {
      const content =
        await readFile(
          file,
          "utf8",
        );

      const tests = [
        ...content.matchAll(
          /\btest(?:\.\w+)?\s*\(\s*["'`]([^"'`]+)["'`]/g,
        ),
      ].map(
        (match, index) => ({
          id:
            `${relative(workspace.root, file)}:${index + 1}`,

          name:
            match[1] ??
            `Test ${index + 1}`,

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
          baseDescriptor.id,

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
          baseDescriptor.vocabulary,

        labels: [],

        tests,
      });
    }

    return {
      containers,

      labels: [],

      selectors:
        baseDescriptor.selectors,

      testCount,
    };
  }
}