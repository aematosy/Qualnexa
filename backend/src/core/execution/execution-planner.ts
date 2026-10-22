import {
  randomUUID,
} from "node:crypto";

import type {
  ProjectManifest,
  TestContainerDescriptor,
} from "../project/model.js";

import type {
  ExecutionPlan,
  ExecutionRequest,
  ReadinessCheck,
  SelectedTest,
} from "./model.js";

export class ExecutionPlanner {

  createPlan(
    project: ProjectManifest,
    request: ExecutionRequest,
    options?: {
      hasCustomCommand?: boolean;
    },
  ): ExecutionPlan {

    const hasCustomCommand =
      options?.hasCustomCommand ??
      false;

    const selectedTests =
      resolveSelection(
        project,
        request,
      );

    const containerIds =
      new Set(
        selectedTests.map(
          (test) =>
            test.containerId,
        ),
      );

    const readiness:
      ReadinessCheck[] = [];

    readiness.push({
      id: "framework",
      label: "Framework",
      status:
        project.frameworks.length > 0
          ? "PASS"
          : hasCustomCommand
            ? "WARNING"
            : "BLOCKED",
      message:
        project.frameworks.length > 0
          ? project.frameworks
              .map(
                (framework) =>
                  framework.displayName,
              )
              .join(", ")
          : hasCustomCommand
            ? "No supported framework detected, but a custom command is configured."
            : "No supported framework detected.",
    });

    readiness.push({
      id: "runtime",
      label: "Runtime",
      status:
        project.runtimes.length > 0
          ? "PASS"
          : hasCustomCommand
            ? "WARNING"
            : "BLOCKED",
      message:
        project.runtimes.length > 0
          ? project.runtimes
              .map(
                (runtime) =>
                  runtime.versionConstraint
                    ? `${runtime.type} ${runtime.versionConstraint}`
                    : runtime.type,
              )
              .join(", ")
          : hasCustomCommand
            ? "No runtime requirement detected, but a custom command is configured."
            : "No runtime requirement detected.",
    });

    readiness.push({
      id: "build-tool",
      label: "Build tool",
      status:
        project.buildTools.length > 0
          ? "PASS"
          : hasCustomCommand
            ? "WARNING"
            : "BLOCKED",
      message:
        project.buildTools.length > 0
          ? project.buildTools
              .map(
                (build) =>
                  build.versionConstraint
                    ? `${build.type} ${build.versionConstraint}`
                    : build.type,
              )
              .join(", ")
          : hasCustomCommand
            ? "No build tool detected, but a custom command is configured."
            : "No build tool detected.",
    });

    readiness.push({
      id: "selection",
      label: "Test selection",
      status:
        selectedTests.length > 0
          ? "PASS"
          : hasCustomCommand
            ? "WARNING"
            : "BLOCKED",
      message:
        selectedTests.length > 0
          ? `${selectedTests.length} test(s) selected.`
          : hasCustomCommand
            ? "No discovered tests matched this selection, but a custom command is configured and will run regardless."
            : "Selection did not match any tests.",
    });

    const blocked =
      readiness.some(
        (check) =>
          check.status === "BLOCKED",
      );

    return {
      id:
        randomUUID(),

      projectId:
        project.id,

      projectName:
        project.name,

      selection:
        request.selection,

      environment:
        request.environment,

      selectedTests,

      containerCount:
        containerIds.size,

      testCount:
        selectedTests.length,

      frameworks:
        project.frameworks.map(
          (framework) =>
            framework.displayName,
        ),

      runtimes:
        project.runtimes.map(
          (runtime) =>
            runtime.versionConstraint
              ? `${runtime.type} ${runtime.versionConstraint}`
              : runtime.type,
        ),

      buildTools:
        project.buildTools.map(
          (build) =>
            build.versionConstraint
              ? `${build.type} ${build.versionConstraint}`
              : build.type,
        ),

      readiness,

      status:
        blocked
          ? "BLOCKED"
          : "READY",
    };
  }
}

function resolveSelection(
  project: ProjectManifest,
  request: ExecutionRequest,
): SelectedTest[] {

  const containers =
    project.testCatalog.containers;

  switch (
    request.selection.type
  ) {

    case "ALL":
      return flattenTests(
        containers,
      );

    case "CONTAINER": {
      const containerId =
        request.selection.containerId;

      if (!containerId) {
        throw new Error(
          "containerId is required for CONTAINER selection.",
        );
      }

      const container =
        containers.find(
          (candidate) =>
            candidate.id ===
            containerId,
        );

      if (!container) {
        throw new Error(
          `Test container not found: ${containerId}`,
        );
      }

      return flattenTests([
        container,
      ]);
    }

    case "TESTS": {
      const requestedIds =
        new Set(
          request.selection.testIds ??
          [],
        );

      return flattenTests(
        containers,
      ).filter(
        (test) =>
          requestedIds.has(
            test.id,
          ),
      );
    }

    case "LABELS": {
      const labels =
        request.selection.labels ??
        [];

      if (labels.length === 0) {
        throw new Error(
          "At least one label is required.",
        );
      }

      const mode =
        request.selection.labelMatch ??
        "ANY";

      const scopedContainers =
        request.selection.containerId
          ? containers.filter(
              (container) =>
                container.id ===
                request.selection.containerId,
            )
          : containers;

      return flattenTests(
        scopedContainers,
      ).filter(
        (test) => {
          const available =
            new Set(
              test.labels,
            );

          if (mode === "ALL") {
            return labels.every(
              (label) =>
                available.has(label),
            );
          }

          return labels.some(
            (label) =>
              available.has(label),
          );
        },
      );
    }

  }
}

function flattenTests(
  containers:
    TestContainerDescriptor[],
): SelectedTest[] {

  return containers.flatMap(
    (container) =>
      container.tests.map(
        (test) => ({
          id:
            test.id,

          name:
            test.name,

          containerId:
            container.id,

          containerName:
            container.name,

          containerType:
            container.vocabulary.container,

          path:
            test.path,

          line:
            test.line,

          labels: [
            ...new Set([
              ...container.labels,
              ...test.labels,
            ]),
          ],
        }),
      ),
  );
}
