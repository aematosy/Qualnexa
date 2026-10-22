export interface FrameworkTagStrategy {
  propertyName: string;
  formatValue: (expression: string) => string;
}

export function resolveFrameworkTagStrategy(
  frameworkIds: string[],
): FrameworkTagStrategy | undefined {

  if (frameworkIds.includes("karate")) {
    return {
      propertyName: "karate.options",

      formatValue: (expression) =>
        `--tags "${expression}"`,
    };
  }

  if (
    frameworkIds.includes("serenity") ||
    frameworkIds.includes("cucumber")
  ) {
    return {
      propertyName:
        "cucumber.filter.tags",

      formatValue: (expression) =>
        expression,
    };
  }

  return undefined;
}

export function resolveFrameworkEnvironmentProperty(
  frameworkIds: string[],
): string | undefined {

  if (frameworkIds.includes("karate")) {
    return "karate.env";
  }

  if (
    frameworkIds.includes("serenity") ||
    frameworkIds.includes("cucumber")
  ) {
    return "serenity.environment";
  }

  return undefined;
}
