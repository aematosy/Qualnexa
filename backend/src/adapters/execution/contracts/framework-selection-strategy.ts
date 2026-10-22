import type {
  ExecutionPlan,
  SelectedTest,
} from "../../../core/execution/model.js";

export interface FrameworkSelectionOverride {
  properties: Record<string, string>;

  testClassFilter?: string[] | undefined;
}

export interface FrameworkSelectionStrategy {
  frameworkId: string;

  resolve(
    workspaceRoot: string,
    plan: ExecutionPlan,
    selectedTests: SelectedTest[],
  ): Promise<FrameworkSelectionOverride | undefined>;
}
