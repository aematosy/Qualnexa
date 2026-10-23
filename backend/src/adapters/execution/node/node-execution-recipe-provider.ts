
import type {
  ExecutionRecipeProvider,
} from "../../../core/execution/contracts.js";

import type {
  BuildInvocation,
  ExecutionPlan,
} from "../../../core/execution/model.js";

import type {
  ProjectManifest,
} from "../../../core/project/model.js";

const PLAYWRIGHT_FRAMEWORK_ID =
  "playwright";

export class NodeExecutionRecipeProvider
implements ExecutionRecipeProvider {

  supports(
    project: ProjectManifest,
  ): boolean {

    return project.buildTools.some(
      (buildTool) =>
        [
          "NPM",
          "PNPM",
          "YARN",
        ].includes(
          buildTool.type.toUpperCase(),
        ),
    );
  }

  async createInvocation(
    project: ProjectManifest,
    plan: ExecutionPlan,
  ): Promise<BuildInvocation> {

    const playwrightFramework =
      project.frameworks.find(
        (framework) =>
          framework.id ===
          PLAYWRIGHT_FRAMEWORK_ID,
      );

    if (!playwrightFramework) {
      throw new Error(
        "No supported Node.js execution framework was detected for this project.",
      );
    }

    return buildPlaywrightInvocation(
      project,
      plan,
    );
  }
}

function buildPlaywrightInvocation(
  _project: ProjectManifest,
  plan: ExecutionPlan,
): BuildInvocation {

  const commandArguments = [
    "playwright",
    "test",
  ];

  const selectedTests =
    plan.selectedTests.filter(
      (test) =>
        test.path.trim().length > 0,
    );

  if (plan.selection.type === "CONTAINER") {
    const path =
      selectedTests[0]?.path;

    if (path) {
      commandArguments.push(path);
    }
  } else if (
    plan.selection.type === "TESTS"
  ) {
    const distinctPaths = [
      ...new Set(
        selectedTests.map(
          (test) => test.path,
        ),
      ),
    ];

    commandArguments.push(
      ...distinctPaths,
    );

    const grepPattern =
      buildRegexAlternation(
        selectedTests.map(
          (test) => test.name,
        ),
      );

    if (grepPattern) {
      commandArguments.push(
        "--grep",
        grepPattern,
      );
    }
  } else if (
    plan.selection.type === "LABELS"
  ) {
    const labels =
      plan.selection.labels ?? [];

    const grepPattern =
      buildLabelPattern(
        labels,
        plan.selection.labelMatch ?? "ANY",
      );

    if (grepPattern) {
      commandArguments.push(
        "--grep",
        grepPattern,
      );
    }

    if (plan.selection.containerId) {
      const distinctPaths = [
        ...new Set(
          selectedTests.map(
            (test) => test.path,
          ),
        ),
      ];

      commandArguments.push(
        ...distinctPaths,
      );
    }
  }

  if (plan.environment) {
    commandArguments.push(
      "--project",
      plan.environment,
    );
  }

  return {
    tasks: [],
    properties: {},
    arguments: commandArguments,
  };
}

function buildLabelPattern(
  labels: string[],
  mode: "ANY" | "ALL",
): string | undefined {

  if (labels.length === 0) {
    return undefined;
  }

  const escapedLabels =
    labels.map(
      (label) =>
        escapeRegex(
          normalizeLabel(label),
        ),
    );

  if (mode === "ALL") {
    return escapedLabels
      .map(
        (label) =>
          `(?=.*(?:^|[^A-Za-z0-9_])@${label}(?:$|[^A-Za-z0-9_]))`,
      )
      .join("");
  }

  return escapedLabels.length === 1
    ? `(?:^|[^A-Za-z0-9_])@${escapedLabels[0]}(?:$|[^A-Za-z0-9_])`
    : `(?:^|[^A-Za-z0-9_])@(?:${escapedLabels.join("|")})(?:$|[^A-Za-z0-9_])`;
}

function buildRegexAlternation(
  values: string[],
): string | undefined {

  const unique = [
    ...new Set(
      values
        .map(
          (value) => value.trim(),
        )
        .filter(Boolean),
    ),
  ];

  if (unique.length === 0) {
    return undefined;
  }

  if (unique.length === 1) {
    return escapeRegex(
      unique[0] ?? "",
    );
  }

  return unique
    .map(
      (value) =>
        escapeRegex(value),
    )
    .join("|");
}

function normalizeLabel(
  value: string,
): string {

  return value.startsWith("@")
    ? value.slice(1)
    : value;
}

function escapeRegex(
  value: string,
): string {

  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );
}
