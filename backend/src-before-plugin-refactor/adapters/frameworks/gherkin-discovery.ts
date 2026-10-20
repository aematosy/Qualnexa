import {
  readFile,
} from "node:fs/promises";

import {
  relative,
} from "node:path";

import type {
  TestCatalog,
  TestCaseDescriptor,
  TestContainerDescriptor,
} from "../../core/project/model.js";

import {
  findFiles,
} from "../../core/inspection/file-finder.js";

export async function discoverGherkinTests(
  root: string,
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

    let featureName =
      relative(
        root,
        file,
      );

    let pendingLabels:
      string[] = [];

    let featureLabels:
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
        featureName =
          line.replace(
            /^Feature:\s*/i,
            "",
          );

        featureLabels =
          [...pendingLabels];

        featureLabels.forEach(
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
      name:
        featureName,
      type:
        "FEATURE",
      path:
        relative(
          root,
          file,
        ),
      labels:
        featureLabels,
      tests,
    });
  }

  return {
    containers,
    labels:
      [...allLabels].sort(),
    selectors: [
      {
        type: "ALL",
        label: "All",
      },
      {
        type: "CONTAINER",
        label: "Feature",
      },
      {
        type: "TEST",
        label: "Scenario",
      },
      {
        type: "LABEL",
        label: "Tags",
      },
    ],
    testCount,
  };
}
