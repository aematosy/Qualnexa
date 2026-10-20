import type {
  ExecutionParameterSemantic,
  ExecutionParameterSemanticResolver,
} from "../contracts/execution-parameter-semantic-resolver.js";

export class SerenityExecutionParameterResolver
implements ExecutionParameterSemanticResolver {

  resolve(
    propertyName: string,
  ): ExecutionParameterSemantic | undefined {

    const normalized =
      propertyName.trim();

    if (
      normalized ===
      "serenity.environment"
    ) {
      return {
        parameterId:
          "environment",
      };
    }

    if (
      normalized ===
        "cucumber.filter.tags" ||
      normalized ===
        "tags"
    ) {
      return {
        parameterId:
          "labels",
      };
    }

    return undefined;
  }
}