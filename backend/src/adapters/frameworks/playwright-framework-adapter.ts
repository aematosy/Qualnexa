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
  EnvironmentDescriptor,
  FrameworkDescriptor,
  TestCatalog,
  TestContainerDescriptor,
} from "../../core/project/model.js";

import {
  findFiles,
} from "../../core/inspection/file-finder.js";

import {
  readJsonIfExists,
  readTextIfExists,
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

  scripts?: Record<
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
    "SELECT_LABEL",
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
        "label",

      displayName:
        "Tags",

      kind:
        "LABEL",
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

  async discoverEnvironments(
    workspace: ProjectWorkspace,
  ): Promise<EnvironmentDescriptor[]> {

    const configCandidates = [
      resolve(
        workspace.root,
        "playwright.config.ts",
      ),
      resolve(
        workspace.root,
        "playwright.config.js",
      ),
      resolve(
        workspace.root,
        "playwright.config.mjs",
      ),
      resolve(
        workspace.root,
        "playwright.config.cjs",
      ),
    ];

    const environments =
      new Map<string, EnvironmentDescriptor>();

    for (const candidate of configCandidates) {
      const content =
        await readTextIfExists(candidate);

      if (!content) {
        continue;
      }

      for (const projectName of extractPlaywrightProjects(content)) {
        environments.set(
          projectName,
          {
            id: projectName,
            displayName: projectName,
            source: candidate,
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

    const files =
      await findFiles(
        workspace.root,
        (_path, name) =>
          /\.(spec|test)\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(
            name,
          ),
      );

    const containers:
      TestContainerDescriptor[] = [];

    const labels =
      new Set<string>();

    let testCount = 0;

    for (const file of files) {
      const content =
        await readFile(
          file,
          "utf8",
        );

      const relativePath =
        relative(
          workspace.root,
          file,
        );

      const fileLabels =
        extractPlaywrightTags(content);

      fileLabels.forEach(
        (label) => labels.add(label),
      );

      const tests = [
        ...content.matchAll(
          /\btest(?:\.\w+)?\s*\(\s*["'`]([^"'`]+)["'`]/g,
        ),
      ].map(
        (match, index) => {
          const name =
            match[1] ??
            `Test ${index + 1}`;

          const testLabels =
            extractTagsFromTitle(name);

          testLabels.forEach(
            (label) => labels.add(label),
          );

          return {
            id:
              `${relativePath}:${index + 1}`,

            name,

            path:
              relativePath,

            labels: testLabels,
          };
        },
      );

      testCount +=
        tests.length;

      containers.push({
        id: relativePath,
        frameworkId:
          baseDescriptor.id,
        name: relativePath,
        path: relativePath,
        vocabulary:
          baseDescriptor.vocabulary,
        labels: fileLabels,
        tests,
      });
    }

    return {
      containers,
      labels:
        [...labels].sort(),
      selectors:
        baseDescriptor.selectors,
      testCount,
    };
  }
}

function extractPlaywrightProjects(
  source: string,
): string[] {

  const projectNames = [
    ...source.matchAll(
      /name\s*:\s*["'`]([^"'`]+)["'`]/g,
    ),
  ].map(
    (match) =>
      match[1]?.trim() ?? "",
  ).filter(Boolean);

  return [
    ...new Set(projectNames),
  ];
}

function extractPlaywrightTags(
  source: string,
): string[] {

  const discovered = new Set<string>();

  for (const match of source.matchAll(/@([A-Za-z0-9_-]+)/g)) {
    const label = match[1]?.trim();

    if (label) {
      discovered.add(label);
    }
  }

  return [
    ...discovered,
  ].sort();
}

function extractTagsFromTitle(
  value: string,
): string[] {

  return [
    ...new Set(
      [...value.matchAll(/@([A-Za-z0-9_-]+)/g)]
        .map((match) => match[1]?.trim() ?? "")
        .filter(Boolean),
    ),
  ];
}
