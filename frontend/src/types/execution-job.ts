export interface ExecutionResult {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  flaky: number;
  durationMs?: number;
  source: string;
}

export interface ExecutionArtifact {
  name: string;
  relativePath: string;
  sizeBytes: number;
}

export type ExecutionJobStatus =
  | "QUEUED"
  | "RUNNING"
  | "PASSED"
  | "FAILED"
  | "TIMED_OUT"
  | "CANCELLED";

export interface ExecutionJob {
  id: string;

  planId: string;

  projectId: string;
  projectName: string;

  frameworks: string[];

  environment?: string;

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
}

export interface CustomCommandConfig {
  executable: string;
  arguments: string[];
  workingDirectory?: string;
  environment?: Record<string, string>;
  timeoutMinutes?: number;
}

export interface ExecutionPreferences {
  projectId: string;
  jdkPath?: string;
  customCommand?: CustomCommandConfig;
}
