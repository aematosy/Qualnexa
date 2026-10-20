import {
  readFile,
} from "node:fs/promises";

import {
  resolve,
} from "node:path";

import {
  XMLParser,
} from "fast-xml-parser";

import type {
  ExecutionProfileDetector,
  ProjectInspectionSnapshot,
} from "../../../core/inspection/contracts.js";

import type {
  ExecutionParameterBinding,
  ExecutionProfileDescriptor,
} from "../../../core/project/model.js";

import type {
  ExecutionParameterSemanticResolver,
} from "../contracts/execution-parameter-semantic-resolver.js";

export class MavenExecutionProfileDetector
implements ExecutionProfileDetector {

  constructor(
    private readonly semanticResolvers:
      ExecutionParameterSemanticResolver[],
  ) {}

  async detect(
    snapshot:
      ProjectInspectionSnapshot,
  ): Promise<ExecutionProfileDescriptor[]> {

    const mavenBuild =
      snapshot.buildTools.find(
        (buildTool) =>
          buildTool.type.toUpperCase() ===
          "MAVEN",
      );

    if (!mavenBuild) {
      return [];
    }

    const pomPath =
      resolve(
        snapshot.workspace.root,
        "pom.xml",
      );

    let xml: string;

    try {
      xml =
        await readFile(
          pomPath,
          "utf8",
        );
    } catch {
      return [];
    }

    const parser =
      new XMLParser({
        ignoreAttributes: false,
        parseTagValue: false,
        trimValues: true,
      });

    const document =
      parser.parse(xml) as unknown;

    const project =
      asRecord(
        asRecord(document)
          ?.project,
      );

    if (!project) {
      return [];
    }

    const build =
      asRecord(
        project.build,
      );

    const pluginsNode =
      asRecord(
        build?.plugins,
      );

    const plugins =
      toArray(
        pluginsNode?.plugin,
      )
        .map(asRecord)
        .filter(
          isRecord,
        );

    const profiles:
      ExecutionProfileDescriptor[] =
      [];

    for (
      const plugin
      of plugins
    ) {
      const artifactId =
        asString(
          plugin.artifactId,
        );

      if (!artifactId) {
        continue;
      }

      const executionsNode =
        asRecord(
          plugin.executions,
        );

      const executions =
        toArray(
          executionsNode?.execution,
        )
          .map(asRecord)
          .filter(
            isRecord,
          );

      for (
        const execution
        of executions
      ) {
        const goals =
          readGoals(
            execution,
          );

        if (
          goals.length === 0
        ) {
          continue;
        }

        const bindings =
          readParameterBindings(
            plugin,
            this.semanticResolvers,
          );

        if (
          bindings.length === 0
        ) {
          continue;
        }

        const executionId =
          asString(
            execution.id,
          ) ??
          artifactId;

        profiles.push({
          id:
            `maven:${artifactId}:${executionId}`,

          providerId:
            artifactId,

          buildToolId:
            mavenBuild.type,

          tasks:
            goals,

          fixedArguments: [],

          parameterBindings:
            bindings,

          source:
            pomPath,
        });
      }
    }

    return profiles;
  }
}

function readGoals(
  execution:
    Record<string, unknown>,
): string[] {

  const goalsNode =
    asRecord(
      execution.goals,
    );

  return toArray(
    goalsNode?.goal,
  )
    .map(asString)
    .filter(
      (
        value,
      ): value is string =>
        Boolean(value),
    );
}

function readParameterBindings(
  plugin:
    Record<string, unknown>,

  semanticResolvers:
    ExecutionParameterSemanticResolver[],
): ExecutionParameterBinding[] {

  const configuration =
    asRecord(
      plugin.configuration,
    );

  const systemProperties =
    asRecord(
      configuration
        ?.systemPropertyVariables,
    );

  if (!systemProperties) {
    return [];
  }

  const bindings:
    ExecutionParameterBinding[] =
    [];

  for (
    const [
      propertyName,
      propertyValue,
    ]
    of Object.entries(
      systemProperties,
    )
  ) {
    const value =
      asString(
        propertyValue,
      );

    const semantic =
      semanticResolvers
        .map(
          (resolver) =>
            resolver.resolve(
              propertyName,
              value,
            ),
        )
        .find(
          (
            candidate,
          ) =>
            candidate !==
            undefined,
        );

    if (!semantic) {
      continue;
    }

    bindings.push({
      parameterId:
        semantic.parameterId,

      target:
        "PROPERTY",

      targetName:
        resolvePropertyTarget(
          propertyName,
          value,
        ),
    });
  }

  return deduplicateBindings(
    bindings,
  );
}

function resolvePropertyTarget(
  propertyName: string,
  propertyValue:
    string | undefined,
): string {

  const reference =
    propertyValue?.match(
      /^\$\{([^}]+)\}$/,
    );

  return (
    reference?.[1] ??
    propertyName
  );
}

function deduplicateBindings(
  bindings:
    ExecutionParameterBinding[],
): ExecutionParameterBinding[] {

  return [
    ...new Map(
      bindings.map(
        (binding) => [
          `${binding.parameterId}:${binding.target}:${binding.targetName ?? ""}`,
          binding,
        ],
      ),
    ).values(),
  ];
}

function asRecord(
  value: unknown,
): Record<string, unknown> | undefined {

  if (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    return value as
      Record<string, unknown>;
  }

  return undefined;
}

function isRecord(
  value:
    Record<string, unknown> |
    undefined,
): value is Record<string, unknown> {

  return value !== undefined;
}

function asString(
  value: unknown,
): string | undefined {

  if (
    typeof value === "string"
  ) {
    return value;
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  return undefined;
}

function toArray(
  value: unknown,
): unknown[] {

  if (
    value === undefined ||
    value === null
  ) {
    return [];
  }

  return Array.isArray(value)
    ? value
    : [value];
}