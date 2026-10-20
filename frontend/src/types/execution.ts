export type ExecutionSelection =
  | {
      type: "ALL";
    }
  | {
      type: "CONTAINER";
      containerId: string;
    }
  | {
      type: "TESTS";
      testIds: string[];
    }
  | {
      type: "LABELS";
      labels: string[];
      labelMatch: "ANY" | "ALL";
      containerId?: string;
    };

export interface SelectedTest {
  id: string;
  name: string;

  containerId: string;
  containerName: string;
  containerType: string;

  path: string;
  line?: number;

  labels: string[];
}

export interface ReadinessCheck {
  id: string;
  label: string;

  status:
    | "PASS"
    | "WARNING"
    | "BLOCKED";

  message: string;
}

export interface ExecutionPlan {
  id: string;

  projectId: string;
  projectName: string;

  selection: ExecutionSelection;

  environment?: string;

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