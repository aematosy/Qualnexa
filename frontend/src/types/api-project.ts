export type InspectionStatus =
  | "INSPECTED"
  | "PARTIAL"
  | "UNSUPPORTED"
  | "FAILED";

export interface EnvironmentDescriptor {
  id: string;
  displayName: string;
  source?: string;
  isDefault?: boolean;
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

export interface RuntimeRequirement {
  type: string;
  versionConstraint?: string;
  source?: string;
}

export interface BuildToolDescriptor {
  type: string;
  versionConstraint?: string;
  wrapperAvailable: boolean;
}

export interface FrameworkDescriptor {
  id: string;
  displayName: string;
  version?: string;

  capabilities: string[];

  vocabulary: CatalogVocabulary;

  selectors: TestSelectorDescriptor[];
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

export interface ProjectManifest {
  id: string;
  name: string;

  source: {
    type: string;
    location: string;
    provider?: string;
    branch?: string;
    commit?: string;
  };

  runtimes: RuntimeRequirement[];

  buildTools: BuildToolDescriptor[];

  frameworks: FrameworkDescriptor[];

  testCatalog: TestCatalog;

  environments: EnvironmentDescriptor[];

  inspectionStatus:
    InspectionStatus;
}