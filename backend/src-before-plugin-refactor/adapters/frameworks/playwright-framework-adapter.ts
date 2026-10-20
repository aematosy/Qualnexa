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
      type: "PLAYWRIGHT",
      version:
        dependencies[
          "@playwright/test"
        ] ??
        dependencies[
          "playwright"
        ],
      capabilities: [
        "TEST_DISCOVERY",
        "CONTAINER_EXECUTION",
        "TEST_EXECUTION",
        "EXPRESSION_FILTERING",
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
        name:
          relative(
            workspace.root,
            file,
          ),
        type:
          "SPEC_FILE",
        path:
          relative(
            workspace.root,
            file,
          ),
        labels: [],
        tests,
      });
    }

    return {
      containers,
      labels: [],
      selectors: [
        {
          type: "ALL",
          label: "All",
        },
        {
          type: "CONTAINER",
          label: "Spec file",
        },
        {
          type: "TEST",
          label: "Test",
        },
        {
          type: "EXPRESSION",
          label: "Grep",
        },
      ],
      testCount,
    };
  }
}
