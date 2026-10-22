import type {
  BuildToolDescriptor,
  EnvironmentDescriptor,
  ExecutionProfileDescriptor,
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

  discoverEnvironments?(
    workspace: ProjectWorkspace,
  ): Promise<EnvironmentDescriptor[]>;
}

export interface ProjectInspectionSnapshot {
  workspace: ProjectWorkspace;

  runtimes: RuntimeRequirement[];

  buildTools: BuildToolDescriptor[];

  frameworks: FrameworkDescriptor[];

  testCatalog: TestCatalog;

  environments: EnvironmentDescriptor[];
}

export interface ExecutionProfileDetector {
  detect(
    snapshot: ProjectInspectionSnapshot,
  ): Promise<ExecutionProfileDescriptor[]>;
}
