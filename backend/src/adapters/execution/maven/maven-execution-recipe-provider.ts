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

export class MavenExecutionRecipeProvider
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
        "MAVEN",
    );
  }

  async createInvocation(
    project: ProjectManifest,
    plan: ExecutionPlan,
  ): Promise<BuildInvocation> {

    const mavenProfiles =
      project.executionProfiles.filter(
        (profile) =>
          profile.buildToolId.toUpperCase() ===
          "MAVEN",
      );

    const tasks =
      mavenProfiles
        .flatMap(
          (profile) => profile.tasks,
        )
        .filter(
          (task, index, all) =>
            all.indexOf(task) === index,
        );

    const properties:
      Record<string, string> = {};

    let testClassFilter:
      string[] | undefined;

    const frameworkIds =
      project.frameworks.map(
        (framework) => framework.id,
      );

    const environmentPropertyNames =
      resolveTargetNames(
        mavenProfiles,
        "environment",
      );

    const labelsPropertyNames =
      resolveTargetNames(
        mavenProfiles,
        "labels",
      );

    if (plan.environment) {
      const targets =
        environmentPropertyNames.length > 0
          ? environmentPropertyNames
          : [
              resolveFrameworkEnvironmentProperty(
                frameworkIds,
              ) ??
                DEFAULT_ENVIRONMENT_PROPERTY,
            ];

      for (const target of targets) {
        properties[target] =
          plan.environment;
      }
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

          const targets =
            labelsPropertyNames.length > 0
              ? labelsPropertyNames
              : strategy
                ? [strategy.propertyName]
                : [];

          for (const target of targets) {
            properties[target] =
              labelsPropertyNames.length > 0 &&
              labelsPropertyNames.includes(target)
                ? expression
                : strategy
                  ? strategy.formatValue(
                      expression,
                    )
                  : expression;
          }
        }
      }
    }

    return {
      tasks:
        tasks.length > 0
          ? tasks
          : ["test"],

      properties,

      arguments: [],

      testClassFilter,
    };
  }
}

function resolveTargetNames(
  profiles: ProjectManifest["executionProfiles"],
  parameterId: string,
): string[] {

  return [
    ...new Set(
      profiles
        .flatMap(
          (profile) =>
            profile.parameterBindings,
        )
        .filter(
          (binding) =>
            binding.parameterId ===
            parameterId,
        )
        .map(
          (binding) =>
            binding.targetName ??
            parameterId,
        ),
    ),
  ];
}
