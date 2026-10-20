export type ExecutionSelectionType =
  | "ALL"
  | "CONTAINER"
  | "TESTS"
  | "LABELS";

export type LabelMatchMode =
  | "ANY"
  | "ALL";

export interface ExecutionSelection {
  type: ExecutionSelectionType;

  containerId?: string | undefined;

  testIds?: string[] | undefined;

  labels?: string[] | undefined;

  labelMatch?: LabelMatchMode | undefined;
}

export interface ExecutionRequest {
  projectId: string;

  selection: ExecutionSelection;

  environment?: string | undefined;

  parameters?: Record<
    string,
    string | number | boolean
  > | undefined;
}

export interface SelectedTest {
  id: string;
  name: string;

  containerId: string;
  containerName: string;
  containerType: string;

  path: string;
  line?: number | undefined;

  labels: string[];
}

export type ReadinessStatus =
  | "PASS"
  | "WARNING"
  | "BLOCKED";

export interface ReadinessCheck {
  id: string;
  label: string;
  status: ReadinessStatus;
  message: string;
}

export interface ExecutionPlan {
  id: string;

  projectId: string;
  projectName: string;

  selection: ExecutionSelection;

  environment?: string | undefined;

  selectedTests: SelectedTest[];

  containerCount: number;
  testCount: number;

  frameworks: string[];
  runtimes: string[];
  buildTools: string[];

  readiness: ReadinessCheck[];

  status:
    | "READY"
    | "BLOCKED";
}