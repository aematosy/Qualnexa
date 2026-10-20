import {
  readFile,
} from "node:fs/promises";

import {
  relative,
} from "node:path";

import type {
  CatalogVocabulary,
  TestCatalog,
  TestCaseDescriptor,
  TestContainerDescriptor,
  TestSelectorDescriptor,
} from "../../core/project/model.js";

import {
  findFiles,
} from "../../core/inspection/file-finder.js";

export interface GherkinDiscoveryOptions {
  frameworkId: string;

  vocabulary: CatalogVocabulary;

  selectors: TestSelectorDescriptor[];
}

export async function discoverGherkinTests(
  root: string,
  options: GherkinDiscoveryOptions,
): Promise<TestCatalog> {

  const featureFiles =
    await findFiles(
      root,
      (_path, name) =>
        name.endsWith(".feature"),
    );

  const containers:
    TestContainerDescriptor[] = [];

  const allLabels =
    new Set<string>();

  let testCount = 0;

  for (const file of featureFiles) {
    const content =
      await readFile(
        file,
        "utf8",
      );

    const lines =
      content.split(/\r?\n/);

    let containerName =
      relative(
        root,
        file,
      );

    let pendingLabels:
      string[] = [];

    let containerLabels:
      string[] = [];

    const tests:
      TestCaseDescriptor[] = [];

    for (
      let index = 0;
      index < lines.length;
      index++
    ) {
      const line =
        lines[index]?.trim() ?? "";

      if (line.startsWith("@")) {
        pendingLabels =
          line
            .split(/\s+/)
            .filter(
              (value) =>
                value.startsWith("@"),
            );

        continue;
      }

      if (
        /^Feature:/i.test(line)
      ) {
        containerName =
          line.replace(
            /^Feature:\s*/i,
            "",
          );

        containerLabels =
          [...pendingLabels];

        containerLabels.forEach(
          (label) =>
            allLabels.add(label),
        );

        pendingLabels = [];

        continue;
      }

      if (
        /^(Scenario|Scenario Outline|Scenario Template):/i.test(
          line,
        )
      ) {
        const name =
          line.substring(
            line.indexOf(":") + 1,
          ).trim();

        pendingLabels.forEach(
          (label) =>
            allLabels.add(label),
        );

        tests.push({
          id:
            `${relative(root, file)}:${index + 1}`,

          name,

          path:
            relative(
              root,
              file,
            ),

          line:
            index + 1,

          labels:
            [...pendingLabels],
        });

        pendingLabels = [];

        testCount++;

        continue;
      }

      if (
        line.length > 0 &&
        !line.startsWith("#")
      ) {
        pendingLabels = [];
      }
    }

    containers.push({
      id:
        relative(
          root,
          file,
        ),

      frameworkId:
        options.frameworkId,

      name:
        containerName,

      path:
        relative(
          root,
          file,
        ),

      vocabulary:
        options.vocabulary,

      labels:
        containerLabels,

      tests,
    });
  }

  return {
    containers,

    labels:
      [...allLabels].sort(),

    selectors:
      options.selectors,

    testCount,
  };
}