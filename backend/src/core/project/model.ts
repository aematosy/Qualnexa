export type ProjectSourceType =
  | "LOCAL_PATH"
  | "LOCAL_UPLOAD"
  | "GIT";

export interface ProjectSourceDescriptor {
  type: ProjectSourceType;
  location: string;
  provider?: string | undefined;
  branch?: string | undefined;
  commit?: string | undefined;
}

export type RuntimeType =
  | "JAVA"
  | "NODE"
  | "PYTHON"
  | "DOTNET"
  | "OTHER";

export interface RuntimeRequirement {
  type: RuntimeType;
  versionConstraint?: string | undefined;
  source?: string | undefined;
}

export interface BuildToolDescriptor {
  type: string;
  versionConstraint?: string | undefined;
  wrapperAvailable: boolean;
}

export interface CatalogVocabulary {
  container: string;
  test: string;
  label: string;
}

export interface TestSelectorDescriptor {
  id: string;
  displayName: string;
  kind: string;
}

export interface EnvironmentDescriptor {
  id: string;
  displayName: string;

  source?: string | undefined;

  isDefault?: boolean | undefined;
}

export interface FrameworkDescriptor {
  id: string;
  displayName: string;
  version?: string | undefined;

  capabilities: string[];

  vocabulary: CatalogVocabulary;

  selectors: TestSelectorDescriptor[];
}

export interface TestCaseDescriptor {
  id: string;
  name: string;
  path: string;

  line?: number | undefined;

  labels: string[];
}

export interface TestContainerDescriptor {
  id: string;

  frameworkId: string;

  name: string;
  path: string;

  vocabulary: CatalogVocabulary;

  labels: string[];

  tests: TestCaseDescriptor[];
}

export interface TestCatalog {
  containers: TestContainerDescriptor[];

  labels: string[];

  selectors: TestSelectorDescriptor[];

  testCount: number;
}


export interface ExecutionParameterBinding {
  parameterId: string;

  target:
    | "PROPERTY"
    | "ENVIRONMENT_VARIABLE"
    | "ARGUMENT";

  targetName?: string | undefined;
}

export interface ExecutionProfileDescriptor {
  id: string;

  providerId: string;

  buildToolId: string;

  tasks: string[];

  fixedArguments: string[];

  parameterBindings:
    ExecutionParameterBinding[];

  source?: string | undefined;
}
export interface ProjectManifest {
  id: string;
  name: string;

  source: ProjectSourceDescriptor;

  runtimes: RuntimeRequirement[];

  buildTools: BuildToolDescriptor[];

  frameworks: FrameworkDescriptor[];

  testCatalog: TestCatalog;

  environments: EnvironmentDescriptor[];

  executionProfiles:
    ExecutionProfileDescriptor[];

  inspectionStatus:
    | "INSPECTED"
    | "PARTIAL"
    | "UNSUPPORTED"
    | "FAILED";
}