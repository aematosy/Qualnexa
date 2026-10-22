import type {
  ExecutionParameterSemantic,
  ExecutionParameterSemanticResolver,
} from "../contracts/execution-parameter-semantic-resolver.js";

export class KarateExecutionParameterResolver
implements ExecutionParameterSemanticResolver {

  resolve(
    propertyName: string,
  ): ExecutionParameterSemantic | undefined {

    const normalized =
      propertyName.trim();

    if (
      normalized === "karate.env" ||
      normalized === "env"
    ) {
      return {
        parameterId:
          "environment",
      };
    }

    if (
      normalized === "karate.options" ||
      normalized === "cucumber.filter.tags" ||
      normalized === "tags"
    ) {
      return {
        parameterId:
          "labels",
      };
    }

    return undefined;
  }
}
