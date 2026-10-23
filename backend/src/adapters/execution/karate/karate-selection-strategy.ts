import type {
  FrameworkSelectionOverride,
  FrameworkSelectionStrategy,
} from "../contracts/framework-selection-strategy.js";

import type {
  ExecutionPlan,
  SelectedTest,
} from "../../../core/execution/model.js";

import {
  buildTagExpression,
} from "../shared/tag-expression.js";

import {
  buildKarateOptions,
  toKarateClasspathPath,
} from "./karate-path-utils.js";

import {
  discoverKarateRunners,
  findMostSpecificRunner,
} from "./karate-runner-discovery.js";

export class KarateSelectionStrategy
implements FrameworkSelectionStrategy {

  readonly frameworkId = "karate";

  async resolve(
    workspaceRoot: string,
    plan: ExecutionPlan,
    selectedTests: SelectedTest[],
  ): Promise<FrameworkSelectionOverride | undefined> {

    const selection = plan.selection;

    let karateOptions:
      string | undefined;

    if (selection.type === "CONTAINER") {
      const path =
        selectedTests[0]?.path;

      if (path) {
        const testsWithRealScenarios =
          selectedTests.filter(
            (test) =>
              Boolean(test.name?.trim()),
          );

        const scenarioPaths =
          testsWithRealScenarios
            .map((test) =>
              toKarateClasspathPath(
                test.path,
                test.line,
              ),
            );

        karateOptions =
          buildKarateOptions({
            paths:
              scenarioPaths.length > 0
                ? scenarioPaths
                : [
                    toKarateClasspathPath(
                      path,
                    ),
                  ],
          });
      }
    } else if (selection.type === "TESTS") {
      const uniqueScenarioPaths = [
        ...new Set(
          selectedTests.map(
            (test) =>
              toKarateClasspathPath(
                test.path,
                test.line,
              ),
          ),
        ),
      ];

      karateOptions =
        buildKarateOptions({
          paths: uniqueScenarioPaths,
        });
    } else if (selection.type === "LABELS") {
      const tagExpression =
        buildTagExpression(
          selection.labels ?? [],
          selection.labelMatch ??
            "ANY",
        );

      const uniquePaths =
        selection.containerId
          ? [
              ...new Set(
                selectedTests.map(
                  (test) => test.path,
                ),
              ),
            ]
          : undefined;

      karateOptions =
        buildKarateOptions({
          tagExpression,

          paths:
            uniquePaths?.map(
              (path) =>
                toKarateClasspathPath(
                  path,
                ),
            ),
        });
    }

    if (!karateOptions) {
      return undefined;
    }

    const testClassFilter =
      await this.resolveTestClassFilter(
        workspaceRoot,
        selectedTests,
      );

    return {
      properties: {
        "karate.options":
          karateOptions,
      },

      testClassFilter:
        testClassFilter.length > 0
          ? testClassFilter
          : undefined,
    };
  }

  private async resolveTestClassFilter(
    workspaceRoot: string,
    selectedTests: SelectedTest[],
  ): Promise<string[]> {

    if (selectedTests.length === 0) {
      return [];
    }

    const runners =
      await discoverKarateRunners(
        workspaceRoot,
      );

    if (runners.length === 0) {
      return [];
    }

    const distinctFeaturePaths = [
      ...new Set(
        selectedTests.map(
          (test) =>
            toKarateClasspathPath(
              test.path,
            ),
        ),
      ),
    ];

    const classNames =
      new Set<string>();

    for (
      const featurePath
      of distinctFeaturePaths
    ) {
      const match =
        findMostSpecificRunner(
          featurePath,
          runners,
        );

      if (!match) {
        // At least one selected feature is not covered by any
        // discovered runner: fall back to running every test class,
        // since restricting here could silently skip the selection.
        return [];
      }

      classNames.add(
        match.className,
      );
    }

    return [
      ...classNames,
    ];
  }
}
