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

export type ExecutionJobStatus =
  | "QUEUED"
  | "RUNNING"
  | "PASSED"
  | "FAILED"
  | "TIMED_OUT"
  | "CANCELLED";

export interface BuildInvocation {
  tasks: string[];

  properties: Record<
    string,
    string
  >;

  arguments: string[];

  testClassFilter?: string[] | undefined;
}

export interface ProcessSpecification {
  executable: string;

  arguments: string[];

  workingDirectory: string;

  environment: Record<
    string,
    string
  >;

  timeoutMs?: number | undefined;
}

export interface ProcessOutputChunk {
  stream: "stdout" | "stderr";
  text: string;
}

export type ProcessOutputListener = (
  chunk: ProcessOutputChunk,
) => void;

export interface ProcessHandle {
  kill(
    signal?: "SIGTERM" | "SIGKILL",
  ): void;
}

export type ProcessSpawnListener = (
  handle: ProcessHandle,
) => void;

export interface ProcessResult {
  exitCode: number;

  stdout: string;

  stderr: string;

  startedAt: string;

  finishedAt: string;

  timedOut: boolean;
}

export interface ExecutionResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;

  durationMs?: number | undefined;

  source: string;
}

export interface ExecutionArtifact {
  name: string;
  relativePath: string;
  sizeBytes: number;
}

export interface CustomCommandConfig {
  executable: string;

  arguments: string[];

  workingDirectory?: string | undefined;

  environment?: Record<string, string> | undefined;

  timeoutMinutes?: number | undefined;
}

export interface ExecutionPreferences {
  projectId: string;

  jdkPath?: string | undefined;

  customCommand?: CustomCommandConfig | undefined;
}

export interface ExecutionJob {
  id: string;

  planId: string;

  projectId: string;

  projectName: string;

  frameworks: string[];

  environment?: string | undefined;

  status: ExecutionJobStatus;

  startedAt?: string | undefined;

  finishedAt?: string | undefined;

  durationMs?: number | undefined;

  exitCode?: number | undefined;

  stdout: string;

  stderr: string;

  error?: string | undefined;

  command?: string | undefined;

  result?: ExecutionResult | undefined;

  artifacts: ExecutionArtifact[];
}
