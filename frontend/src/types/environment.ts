export interface ToolStatus {
  id: string;
  displayName: string;
  found: boolean;
  version?: string;
  error?: string;
}

export interface JdkCandidate {
  path: string;
  version?: string;
  vendor?: string;
  isSystemDefault: boolean;
}

export interface DoctorReport {
  tools: ToolStatus[];
  jdks: JdkCandidate[];
  generatedAt: string;
}
