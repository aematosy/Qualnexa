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
  | "COMPLETED"
  | "ERROR"
  | "CANCELLED";

export type ExecutionTestResultStatus =
  | "PASSED"
  | "FAILED"
  | "PARTIAL"
  | "NO_RESULTS";

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

export interface ExecutionStepLogSegment {
  text?: string | undefined;
  lang?: string | undefined;
  code?: string | undefined;
}

export interface ExecutionStepResult {
  prefix?: string | undefined;
  keyword?: string | undefined;
  text?: string | undefined;
  status?: "PASSED" | "FAILED" | "SKIPPED" | "FLAKY" | undefined;
  durationMs?: number | undefined;
  logSegments?: ExecutionStepLogSegment[] | undefined;
}

export interface ExecutionTestResult {
  id: string;
  name: string;
  suite: string;
  status:
    | "PASSED"
    | "FAILED"
    | "SKIPPED"
    | "FLAKY";
  durationMs?: number | undefined;
  retries?: number | undefined;
  failureType?: string | undefined;
  tags: string[];
  failureMessage?: string | undefined;
  stacktrace?: string | undefined;
  steps?: ExecutionStepResult[] | undefined;
}

export interface ExecutionFailure {
  testId: string;
  testName: string;
  suite: string;
  category:
    | "ASSERTION"
    | "TIMEOUT"
    | "HTTP_ERROR"
    | "NETWORK"
    | "ELEMENT_NOT_FOUND"
    | "ENVIRONMENT"
    | "CONFIGURATION"
    | "TEST_DATA"
    | "RUNTIME"
    | "BUILD"
    | "UNKNOWN";
  message: string;
  stacktrace?: string | undefined;
}

export interface ExecutionResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;

  durationMs?: number | undefined;

  source: string;
  tests: ExecutionTestResult[];
  failures: ExecutionFailure[];
}

export interface ExecutionArtifact {
  name: string;
  relativePath: string;
  sizeBytes: number;
}

export interface NativeReportReference {
  framework: string;
  reportPath: string;
  featurePath?: string | undefined;
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

  lifecycleStatus: ExecutionJobStatus;

  testResultStatus?: ExecutionTestResultStatus | undefined;

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

  nativeReport?: NativeReportReference | undefined;
}
