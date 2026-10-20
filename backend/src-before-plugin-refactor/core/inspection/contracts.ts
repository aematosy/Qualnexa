import type {
  BuildToolDescriptor,
  FrameworkDescriptor,
  RuntimeRequirement,
  TestCatalog,
} from "../project/model.js";

export interface ProjectWorkspace {
  root: string;
}

export interface RuntimeDetector {
  detect(
    workspace: ProjectWorkspace,
  ): Promise<RuntimeRequirement[]>;
}

export interface BuildToolDetector {
  detect(
    workspace: ProjectWorkspace,
  ): Promise<BuildToolDescriptor[]>;
}

export interface FrameworkAdapter {
  supports(
    workspace: ProjectWorkspace,
  ): Promise<boolean>;

  inspect(
    workspace: ProjectWorkspace,
  ): Promise<FrameworkDescriptor>;

  discoverTests(
    workspace: ProjectWorkspace,
  ): Promise<TestCatalog>;
}
