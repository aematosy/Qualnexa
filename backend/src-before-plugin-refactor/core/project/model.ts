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

export interface FrameworkDescriptor {
  type: string;
  version?: string | undefined;
  capabilities: string[];
}

export interface TestSelectorDescriptor {
  type: string;
  label: string;
}

export interface TestCaseDescriptor {
  id: string;
  name: string;
  path: string;
  line?: number;
  labels: string[];
}

export interface TestContainerDescriptor {
  id: string;
  name: string;
  type: string;
  path: string;
  labels: string[];
  tests: TestCaseDescriptor[];
}

export interface TestCatalog {
  containers: TestContainerDescriptor[];
  labels: string[];
  selectors: TestSelectorDescriptor[];
  testCount: number;
}

export interface ProjectManifest {
  id: string;
  name: string;
  source: ProjectSourceDescriptor;

  runtimes: RuntimeRequirement[];
  buildTools: BuildToolDescriptor[];
  frameworks: FrameworkDescriptor[];

  testCatalog: TestCatalog;

  environments: string[];

  inspectionStatus:
    | "INSPECTED"
    | "PARTIAL"
    | "UNSUPPORTED"
    | "FAILED";
}


