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
  stacktrace?: string;
}

export interface ExecutionStepLogSegment {
  text?: string;
  lang?: string;
  code?: string;
}

export interface ExecutionStepResult {
  prefix?: string;
  keyword?: string;
  text?: string;
  status?: "PASSED" | "FAILED" | "SKIPPED" | "FLAKY";
  durationMs?: number;
  logSegments?: ExecutionStepLogSegment[];
}

export interface ExecutionTestResult {
  id: string;
  name: string;
  suite: string;
  status: "PASSED" | "FAILED" | "SKIPPED" | "FLAKY";
  durationMs?: number;
  retries?: number;
  failureType?: string;
  tags: string[];
  failureMessage?: string;
  stacktrace?: string;
  steps?: ExecutionStepResult[];
}

export interface ExecutionResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  durationMs?: number;
  source: string;
  tests: ExecutionTestResult[];
  failures: ExecutionFailure[];
}

export interface ExecutionArtifact {
  name: string;
  relativePath: string;
  sizeBytes: number;
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

export interface NativeReportReference {
  framework: string;
  reportPath: string;
  featurePath?: string;
}

export interface ExecutionJob {
  id: string;

  planId: string;

  projectId: string;
  projectName: string;

  frameworks: string[];

  environment?: string;

  lifecycleStatus?: ExecutionJobStatus;
  testResultStatus?: ExecutionTestResultStatus;

  status: ExecutionJobStatus;

  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;

  exitCode?: number;

  stdout: string;
  stderr: string;

  error?: string;

  command?: string;

  result?: ExecutionResult;

  artifacts: ExecutionArtifact[];
  nativeReport?: NativeReportReference;
}

export interface CustomCommandConfig {
  executable: string;
  arguments: string[];
  workingDirectory?: string;
  environment?: Record<string, string>;
  timeoutMinutes?: number;
}

export interface ExecutionHistoricalPlan {
  id: string;
  projectId: string;
  projectName: string;
  selection: {
    type: "ALL" | "CONTAINER" | "TESTS" | "LABELS";
    containerId?: string;
    testIds?: string[];
    labels?: string[];
    labelMatch?: "ANY" | "ALL";
  };
  environment?: string;
  selectedTests: Array<{
    id: string;
    name: string;
    containerId: string;
    containerName: string;
    containerType: string;
    path: string;
    line?: number;
    labels: string[];
  }>;
  containerCount: number;
  testCount: number;
  frameworks: string[];
  runtimes: string[];
  buildTools: string[];
  status: "READY" | "BLOCKED";
}

export interface ExecutionPreferences {
  projectId: string;
  jdkPath?: string;
  customCommand?: CustomCommandConfig;
}
