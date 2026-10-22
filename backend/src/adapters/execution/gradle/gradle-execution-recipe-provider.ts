import type {
  ProjectManifest,
} from "../../../core/project/model.js";

import type {
  ExecutionRecipeProvider,
} from "../../../core/execution/contracts.js";

import type {
  BuildInvocation,
  ExecutionPlan,
} from "../../../core/execution/model.js";

import type {
  FrameworkSelectionStrategy,
} from "../contracts/framework-selection-strategy.js";

import {
  buildTagExpression,
} from "../shared/tag-expression.js";

import {
  resolveFrameworkEnvironmentProperty,
  resolveFrameworkTagStrategy,
} from "../shared/framework-tag-strategy.js";

const DEFAULT_ENVIRONMENT_PROPERTY =
  "karate.env";

export class GradleExecutionRecipeProvider
implements ExecutionRecipeProvider {

  constructor(
    private readonly selectionStrategies:
      FrameworkSelectionStrategy[] = [],
  ) {}

  supports(
    project: ProjectManifest,
  ): boolean {

    return project.buildTools.some(
      (buildTool) =>
        buildTool.type.toUpperCase() ===
        "GRADLE",
    );
  }

  async createInvocation(
    project: ProjectManifest,
    plan: ExecutionPlan,
  ): Promise<BuildInvocation> {

    const properties:
      Record<string, string> = {};

    let testClassFilter:
      string[] | undefined;

    const frameworkIds =
      project.frameworks.map(
        (framework) => framework.id,
      );

    if (plan.environment) {
      properties[
        resolveFrameworkEnvironmentProperty(
          frameworkIds,
        ) ??
          DEFAULT_ENVIRONMENT_PROPERTY
      ] = plan.environment;
    }

    if (plan.selection.type !== "ALL") {
      const matchingStrategy =
        this.selectionStrategies.find(
          (strategy) =>
            frameworkIds.includes(
              strategy.frameworkId,
            ),
        );

      const override =
        await matchingStrategy?.resolve(
          project.source.location,
          plan,
          plan.selectedTests,
        );

      if (override) {
        Object.assign(
          properties,
          override.properties,
        );

        testClassFilter =
          override.testClassFilter;
      } else if (
        plan.selection.type === "LABELS"
      ) {
        const expression =
          buildTagExpression(
            plan.selection.labels ?? [],
            plan.selection.labelMatch ??
              "ANY",
          );

        if (expression) {
          const strategy =
            resolveFrameworkTagStrategy(
              frameworkIds,
            );

          properties[
            strategy?.propertyName ??
              "cucumber.filter.tags"
          ] =
            strategy
              ? strategy.formatValue(
                  expression,
                )
              : expression;
        }
      }
    }

    return {
      tasks: ["test"],
      properties,
      arguments: [],
      testClassFilter,
    };
  }
}
