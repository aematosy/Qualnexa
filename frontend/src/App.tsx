import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  FolderGit2,
  Gauge,
  Globe,
  History,
  Info,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  Moon,
  Palette,
  Play,
  RefreshCw,
  Send,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Tags,
  TestTube2,
  TriangleAlert,
  User,
  UserCircle2,
  UserPlus,
  ArrowRight,
  Download,
} from "lucide-react";

import { useTheme } from "./theme";

import {
  AddProjectDialog,
} from "./components/AddProjectDialog";

import {
  ExecutionPlanDialog,
} from "./components/ExecutionPlanDialog";

import {
  ExecutionConfigurationDialog,
} from "./components/ExecutionConfigurationDialog";

import {
  ExecutionJobDialog,
} from "./components/ExecutionJobDialog";

import {
  EnvironmentDoctorPanel,
} from "./components/EnvironmentDoctorPanel";

import {
  ProjectDetailsPage,
} from "./components/ProjectDetailsPage";

import type {
  AddProjectRequest,
} from "./types/project";

import type {
  ProjectManifest,
} from "./types/api-project";

import type {
  ExecutionPlan,
  ExecutionSelection,
} from "./types/execution";

type SidebarSection = "DASHBOARD" | "PROJECTS" | "EXECUTIONS" | "ENVIRONMENTS" | "HISTORY" | "REPORTS" | "SETTINGS" | "REPORT_DETAIL";

type ReportOrigin =
  | { type: "REPORTS" }
  | { type: "PROJECT_RUNS"; projectId: string; projectName: string };

type HashRoute =
  | { type: "NONE" }
  | { type: "REPORT"; executionId: string }
  | { type: "PROJECT_RUN"; projectId: string; executionId: string };


type DoctorReport = {
  tools: Array<{
    id: string;
    displayName: string;
    found: boolean;
    version?: string;
    error?: string;
  }>;
  jdks: Array<{
    path: string;
    version?: string;
    vendor?: string;
    isSystemDefault: boolean;
  }>;
  generatedAt: string;
};

type ExecutionJob = {
  id: string;
  planId: string;
  projectId: string;
  projectName: string;
  frameworks: string[];
  environment?: string;
  lifecycleStatus?: "QUEUED" | "RUNNING" | "COMPLETED" | "ERROR" | "CANCELLED";
  testResultStatus?: "PASSED" | "FAILED" | "PARTIAL" | "NO_RESULTS";
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "ERROR" | "CANCELLED";
  startedAt?: string;
  finishedAt?: string;
  durationMs?: number;
  exitCode?: number;
  stdout: string;
  stderr: string;
  error?: string;
  command?: string;
  result?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    flaky: number;
    durationMs?: number;
    source: string;
    tests: Array<{
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
      steps?: Array<{
        prefix?: string;
        keyword?: string;
        text?: string;
        status?: "PASSED" | "FAILED" | "SKIPPED" | "FLAKY";
        durationMs?: number;
        logSegments?: Array<{ text?: string; lang?: string; code?: string }>;
      }>;
    }>;
    failures: Array<{
      testId: string;
      testName: string;
      suite: string;
      category: "ASSERTION" | "TIMEOUT" | "HTTP_ERROR" | "NETWORK" | "ELEMENT_NOT_FOUND" | "ENVIRONMENT" | "CONFIGURATION" | "TEST_DATA" | "RUNTIME" | "BUILD" | "UNKNOWN";
      message: string;
      stacktrace?: string;
    }>;
  };
  artifacts: Array<{
    name: string;
    relativePath: string;
    sizeBytes: number;
  }>;
  nativeReport?: {
    framework: string;
    reportPath: string;
    featurePath?: string;
  };
};

type SettingsSummary = {
  general: {
    workspaceName: string;
    description: string;
    timezone: string;
    language: string;
    dateTimeFormat: string;
    frontendUrl: string;
    backendUrl: string;
    backendStatus: string;
    version: string;
  };
  profile: {
    sessionDurationMinutes: number;
    emailVerificationRequired: boolean;
  };
  integrations: {
    google: { enabled: boolean; clientIdMasked: string | null; redirectUri: string | null; status: string };
    github: { enabled: boolean; clientIdMasked: string | null; redirectUri: string | null; status: string };
    email: { provider: string; fromAddress: string | null; status: string };
    local: { enabled: boolean; status: string };
  };
  execution: {
    defaultTimeoutMinutes: number;
    processKillGracePeriodSeconds: number;
    maximumConcurrentExecutions: number;
    maximumConcurrentProjects: number;
    retryPolicy: {
      enabled: boolean;
      maxRetries: number;
      onlyTechnicalFailures: boolean;
    };
  };
  projectAccess: {
    allowedRoots: Array<{ path: string; exists: boolean }>;
    unrestricted: boolean;
  };
  storage: {
    uploadDirectory: string;
    maxUploadZipBytes: number;
    maxUploadFileCount: number;
    artifactDirectory: string;
  };
  runtimes: DoctorReport;
  appearance: {
    supportedModes: string[];
    defaultMode: string;
  };
  diagnostics: {
    backendStatus: string;
    filesystemPermissions: string;
    storageAccess: string;
    runtimeCheckGeneratedAt: string;
  };
};

type SettingsTab = "GENERAL" | "PROFILE" | "INTEGRATIONS" | "EXECUTION" | "RUNTIMES" | "PROJECT_ACCESS" | "APPEARANCE" | "ABOUT";

function App() {
  const { theme, toggleTheme } = useTheme();

  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectManifest[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SidebarSection>("DASHBOARD");
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlan | null>(null);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [selectedReportJobId, setSelectedReportJobId] = useState<string | null>(null);
  const [reportOrigin, setReportOrigin] = useState<ReportOrigin>({ type: "REPORTS" });
  const [doctorReport, setDoctorReport] = useState<DoctorReport | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [doctorError, setDoctorError] = useState<string | null>(null);
  const [jobHistory, setJobHistory] = useState<ExecutionJob[]>([]);
  const [jobHistoryLoading, setJobHistoryLoading] = useState(false);
  const [jobHistoryError, setJobHistoryError] = useState<string | null>(null);
  const [settingsSummary, setSettingsSummary] = useState<SettingsSummary | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("GENERAL");
  const [testEmailMessage, setTestEmailMessage] = useState<string | null>(null);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"SIGN_IN" | "SIGN_UP">("SIGN_IN");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [currentUser, setCurrentUser] = useState<null | { name?: string; email: string; verified?: boolean }>(null);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");
  const [showVerificationReminder, setShowVerificationReminder] = useState(false);
  const [oauthConfig, setOAuthConfig] = useState<{ google: { enabled: boolean; clientId: string; redirectUri: string }; github: { enabled: boolean; clientId: string; redirectUri: string } } | null>(null);

  useEffect(() => {
    const verified = new URLSearchParams(window.location.search).get("verified");
    if (verified === "true") {
      setVerificationMessage("Email verificado correctamente.");
    }
  }, []);

  useEffect(() => {
    void loadOAuthConfig();
  }, []);

  async function loadOAuthConfig() {
    try {
      const response = await fetch("/api/auth/oauth-config");
      if (response.ok) {
        const config = await response.json() as typeof oauthConfig;
        setOAuthConfig(config);
      }
    } catch {
      // OAuth config loading failed, disable OAuth
    }
  }

  async function executeCurrentPlan() {
    if (!executionPlan) {
      return;
    }

    try {
      const response = await fetch(
        "/api/executions/jobs",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            planId:
              executionPlan.id,
          }),
        },
      );

      const body =
        await response.json();

      if (!response.ok) {
        throw new Error(
          body.message ??
            "Unable to start execution.",
        );
      }

      setExecutionPlan(null);
      setRunningJobId(body.id as string);
      void loadExecutionJobs();
    } catch (error) {
      setExecutionError(
        error instanceof Error
          ? error.message
          : "Unable to start execution.",
      );
    }
  }

  useEffect(() => {
    void loadSession();
    void loadProjects();
    void loadDoctorReport();
    void loadExecutionJobs();
    void loadSettingsSummary();
  }, []);

  useEffect(() => {
    syncStateFromHash(window.location.hash);

    function handleHashChange() {
      syncStateFromHash(window.location.hash);
    }

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [jobHistory, projects]);

  async function loadSession() {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (!response.ok) {
        setCurrentUser(null);
        return;
      }

      const data = await response.json() as { user?: { name?: string; email: string; verified?: boolean } };
      setCurrentUser(data.user ?? null);
    } catch {
      setCurrentUser(null);
    } finally {
      setSessionLoaded(true);
    }
  }

  async function loadProjects() {
    setLoadingProjects(true);
    setProjectError(null);

    try {
      const response = await fetch(
        "/api/projects",
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load projects.",
        );
      }

      const data =
        (await response.json()) as ProjectManifest[];

      setProjects(data);
      setProjectError(null);
    } catch (error) {
      setProjectError(
        error instanceof Error
          ? error.message
          : "Unable to load projects.",
      );
    } finally {
      setLoadingProjects(false);
    }
  }

  async function loadDoctorReport() {
    setDoctorLoading(true);
    setDoctorError(null);

    try {
      const response = await fetch("/api/environment/doctor");

      if (!response.ok) {
        throw new Error("Unable to load environment report.");
      }

      setDoctorReport((await response.json()) as DoctorReport);
    } catch (error) {
      setDoctorError(
        error instanceof Error
          ? error.message
          : "Unable to load environment report.",
      );
    } finally {
      setDoctorLoading(false);
    }
  }

  async function loadExecutionJobs() {
    setJobHistoryLoading(true);
    setJobHistoryError(null);

    try {
      const response = await fetch("/api/executions/jobs");

      if (!response.ok) {
        throw new Error("Unable to load execution history.");
      }

      setJobHistory((await response.json()) as ExecutionJob[]);
    } catch (error) {
      setJobHistoryError(
        error instanceof Error
          ? error.message
          : "Unable to load execution history.",
      );
    } finally {
      setJobHistoryLoading(false);
    }
  }

  async function loadSettingsSummary() {
    setSettingsLoading(true);
    setSettingsError(null);

    try {
      const response = await fetch("/api/settings/summary", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Unable to load settings summary.");
      }

      setSettingsSummary((await response.json()) as SettingsSummary);
    } catch (error) {
      setSettingsError(
        error instanceof Error
          ? error.message
          : "Unable to load settings summary.",
      );
    } finally {
      setSettingsLoading(false);
    }
  }

  function parseHashRoute(hash: string): HashRoute {
    const normalized = hash.startsWith("#") ? hash.slice(1) : hash;
    const segments = normalized.split("/").filter(Boolean);

    if (segments[0] === "reports" && segments[1]) {
      return {
        type: "REPORT",
        executionId: decodeURIComponent(segments[1]),
      };
    }

    if (segments[0] === "projects" && segments[1] && segments[2] === "runs" && segments[3]) {
      return {
        type: "PROJECT_RUN",
        projectId: decodeURIComponent(segments[1]),
        executionId: decodeURIComponent(segments[3]),
      };
    }

    return { type: "NONE" };
  }

  function navigateToProjectRun(projectId: string, executionId: string) {
    window.location.hash = `#/projects/${encodeURIComponent(projectId)}/runs/${encodeURIComponent(executionId)}`;
  }

  function navigateToReport(executionId: string) {
    window.location.hash = `#/reports/${encodeURIComponent(executionId)}`;
  }

  function clearHashRoute() {
    if (window.location.hash) {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }

  function syncStateFromHash(hash: string) {
    const route = parseHashRoute(hash);

    if (route.type === "NONE") {
      return;
    }

    if (route.type === "REPORT") {
      const job = jobHistory.find((item) => item.id === route.executionId);
      if (!job) {
        setSelectedReportJobId(route.executionId);
        setReportOrigin({ type: "REPORTS" });
        setActiveSection("REPORT_DETAIL");
        return;
      }

      setSelectedReportJobId(job.id);
      setReportOrigin({ type: "REPORTS" });
      setActiveSection("REPORT_DETAIL");
      return;
    }

    const project = projects.find((item) => item.id === route.projectId);
    const job = jobHistory.find((item) => item.id === route.executionId);

    if (project) {
      setSelectedProjectId(project.id);
    }

    setSelectedReportJobId(route.executionId);
    setReportOrigin({
      type: "PROJECT_RUNS",
      projectId: route.projectId,
      projectName: project?.name ?? job?.projectName ?? "Project",
    });
    setActiveSection("REPORT_DETAIL");
  }

  async function sendTestEmail() {
    setTestEmailLoading(true);
    setTestEmailMessage(null);

    try {
      const response = await fetch("/api/settings/integrations/email/test", {
        method: "POST",
        credentials: "include",
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.message ?? "Unable to validate email provider.");
      }

      setTestEmailMessage(body.message ?? "Email provider looks valid.");
    } catch (error) {
      setTestEmailMessage(
        error instanceof Error
          ? error.message
          : "Unable to validate email provider.",
      );
    } finally {
      setTestEmailLoading(false);
    }
  }

  async function handleAuth() {
    setAuthError(null);
    setAuthSuccess(null);

    if (authMode === "SIGN_UP" && passwordInput !== confirmPasswordInput) {
      setAuthError("Passwords do not match.");
      return;
    }

    if (!isValidEmail(emailInput)) {
      setAuthError("Enter a valid email address.");
      return;
    }

    setAuthLoading(true);
    try {
      const response = await fetch(
        authMode === "SIGN_UP" ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: nameInput.trim(),
            email: emailInput.trim(),
            password: passwordInput,
          }),
        },
      );

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.message ?? "Authentication failed.");
      }

      if (body.user) {
        setCurrentUser(body.user as { name?: string; email: string; verified?: boolean });
      }

      if (body.verificationRequired) {
        setShowVerificationReminder(true);
      }

      setAuthSuccess(
        authMode === "SIGN_UP"
          ? body.message ?? "Account created. Check your email to activate it."
          : "Session started successfully.",
      );

      if (authMode === "SIGN_IN") {
        setProfileOpen(false);
      }

      await loadSession();
      await loadProjects();
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Authentication failed.",
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "github") {
    if (provider === "google") {
      // Use clientId and redirectUri from config (server provides correct backend URL)
      const clientId = oauthConfig?.google.clientId || "YOUR_GOOGLE_CLIENT_ID";
      const redirectUri = oauthConfig?.google.redirectUri || `http://127.0.0.1:8080/api/auth/oauth/google/callback`;
      const scope = "openid email profile";
      const responseType = "code";

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope,
        response_type: responseType,
        state: Math.random().toString(36),
      }).toString()}`;

      window.location.assign(authUrl);
    } else if (provider === "github") {
      const clientId = oauthConfig?.github.clientId || "YOUR_GITHUB_CLIENT_ID";
      const redirectUri = oauthConfig?.github.redirectUri || `http://127.0.0.1:8080/api/auth/oauth/github/callback`;
      const scope = "user:email";

      const authUrl = `https://github.com/login/oauth/authorize?${new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope,
        state: Math.random().toString(36),
      }).toString()}`;

      window.location.assign(authUrl);
    }
  }

  function passwordScore(password: string) {
    let score = 0;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return score;
  }

  const passwordStrength = passwordScore(passwordInput);
  const passwordChecks = [
    { label: "10+ characters", ok: passwordInput.length >= 10 },
    { label: "Uppercase letter", ok: /[A-Z]/.test(passwordInput) },
    { label: "Lowercase letter", ok: /[a-z]/.test(passwordInput) },
    { label: "Number", ok: /[0-9]/.test(passwordInput) },
    { label: "Special character", ok: /[^A-Za-z0-9]/.test(passwordInput) },
  ];

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      setCurrentUser(null);
      setProfileOpen(false);
      await loadProjects();
    } catch {
      setAuthError("Unable to sign out.");
    }
  }

  async function handleAddProject(request: AddProjectRequest) {
    setProjectError(null);

    if (request.sourceType !== "LOCAL") {
      setProjectError(
        "Git sources (GitHub/Bitbucket) are not connected yet. Use Local project for now.",
      );

      return;
    }

    try {
      let manifest: ProjectManifest;

      if (request.localMode === "PATH") {
        if (!request.localPath) {
          setProjectError(
            "A local path is required.",
          );

          return;
        }

        manifest = await inspectLocalPath(
          request.name,
          request.localPath,
        );
      } else if (request.localMode === "ZIP") {
        if (!request.localArchive) {
          setProjectError(
            "Select a ZIP archive first.",
          );

          return;
        }

        manifest = await uploadLocalProject(
          request.name,
          "ZIP",
          [request.localArchive],
        );
      } else if (request.localMode === "FOLDER") {
        if (!request.localFiles || request.localFiles.length === 0) {
          setProjectError(
            "Select a project folder first.",
          );

          return;
        }

        manifest = await uploadLocalProject(
          request.name,
          "FOLDER",
          request.localFiles,
        );
      } else {
        setProjectError("Unsupported local source mode.");
        return;
      }

      setProjects((current) => {
        const withoutExisting = current.filter(
          (project) => project.source.location !== manifest.source.location,
        );

        return [...withoutExisting, manifest];
      });

      setAddProjectOpen(false);
    } catch (error) {
      setProjectError(
        error instanceof Error ? error.message : "Project inspection failed.",
      );
    }
  }

  async function inspectLocalPath(name: string, localPath: string): Promise<ProjectManifest> {
    const response = await fetch(
      "/api/projects/inspect",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          sourceType: "LOCAL_PATH",
          location: localPath,
        }),
      },
    );

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.message ?? "Project inspection failed.");
    }

    return body as ProjectManifest;
  }

  async function uploadLocalProject(name: string, mode: "FOLDER" | "ZIP", files: File[]): Promise<ProjectManifest> {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("mode", mode);

    if (mode === "ZIP") {
      formData.append("archive", files[0] as File);
    } else {
      const relativePaths = files.map((file) => (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name);
      formData.append("relativePaths", JSON.stringify(relativePaths));

      for (const file of files) {
        formData.append("files", file);
      }
    }

    const response = await fetch(
      "/api/projects/upload",
      {
        method: "POST",
        body: formData,
        credentials: "include",
      },
    );

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.message ?? "Project upload failed.");
    }

    return body as ProjectManifest;
  }

  const [executionConfiguration, setExecutionConfiguration] = useState<{ projectId: string; selection: ExecutionSelection } | null>(null);

  function configureExecution(projectId: string, selection: ExecutionSelection) {
    setActiveSection("EXECUTIONS");
    setExecutionConfiguration({
      projectId,
      selection,
    });
  }

  async function prepareExecution(projectId: string, selection: ExecutionSelection, environment?: string) {
    setExecutionLoading(true);
    setExecutionError(null);
    setExecutionPlan(null);

    try {
      const response = await fetch(
        "/api/executions/plan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            projectId,
            selection,
            environment,
          }),
        },
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.message ?? "Unable to prepare execution.");
      }

      setExecutionPlan(body as ExecutionPlan);
      void loadExecutionJobs();
    } catch (error) {
      setExecutionError(
        error instanceof Error ? error.message : "Unable to prepare execution.",
      );
    } finally {
      setExecutionLoading(false);
    }
  }

  const metrics = useMemo(() => {
    const containers = projects.reduce((total, project) => total + project.testCatalog.containers.length, 0);
    const tests = projects.reduce((total, project) => total + project.testCatalog.testCount, 0);
    const labels = new Set(projects.flatMap((project) => project.testCatalog.labels));

    return {
      projects: projects.length,
      containers,
      tests,
      labels: labels.size,
    };
  }, [projects]);

  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId) ?? null
    : null;


  const pageContent = (() => {
    if (activeSection === "PROJECTS") {
      return (
        <ProjectsSection
          loadingProjects={loadingProjects}
          metrics={metrics}
          projectError={projectError}
          projects={projects}
          onAddProject={() => setAddProjectOpen(true)}
          onPrepareExecution={configureExecution}
          onSelectProject={(projectId) => {
            setSelectedProjectId(projectId);
            setActiveSection("PROJECTS");
          }}
        />
      );
    }

    if (activeSection === "EXECUTIONS") {
      return (
        <ExecutionsSection
          jobs={jobHistory}
          onOpenProject={(projectId) => {
            setSelectedProjectId(projectId);
            setActiveSection("PROJECTS");
          }}
          onOpenJob={(jobId) => setRunningJobId(jobId)}
        />
      );
    }

    if (activeSection === "ENVIRONMENTS") {
      return (
        <EnvironmentsSection
          loading={doctorLoading}
          error={doctorError}
          report={doctorReport}
          projects={projects}
          onRefresh={() => void loadDoctorReport()}
        />
      );
    }

    if (activeSection === "HISTORY") {
      return (
        <HistorySection
          loading={jobHistoryLoading}
          error={jobHistoryError}
          jobs={jobHistory}
          onRefresh={() => void loadExecutionJobs()}
          onOpenJob={(jobId) => setRunningJobId(jobId)}
        />
      );
    }

    if (activeSection === "REPORTS") {
      return (
        <ReportsSection
          loading={jobHistoryLoading}
          error={jobHistoryError}
          jobs={jobHistory}
          onViewReport={(jobId) => {
            setReportOrigin({ type: "REPORTS" });
            setSelectedReportJobId(jobId);
            setActiveSection("REPORT_DETAIL");
            navigateToReport(jobId);
          }}
        />
      );
    }

    if (activeSection === "REPORT_DETAIL") {
      return (
        <ReportDetailSection
          job={jobHistory.find((item) => item.id === selectedReportJobId) ?? null}
          origin={reportOrigin}
          project={reportOrigin.type === "PROJECT_RUNS" ? projects.find((item) => item.id === reportOrigin.projectId) ?? null : null}
          onBack={() => {
            if (reportOrigin.type === "PROJECT_RUNS") {
              setSelectedProjectId(reportOrigin.projectId);
              setActiveSection("PROJECTS");
            } else {
              setActiveSection("REPORTS");
            }
            clearHashRoute();
          }}
          onBackToProject={() => {
            if (reportOrigin.type === "PROJECT_RUNS") {
              setSelectedProjectId(reportOrigin.projectId);
              setActiveSection("PROJECTS");
              clearHashRoute();
            }
          }}
        />
      );
    }

    if (activeSection === "SETTINGS") {
      return (
        <SettingsSection
          currentUser={currentUser}
          loading={settingsLoading}
          error={settingsError}
          settings={settingsSummary}
          selectedTab={settingsTab}
          testEmailLoading={testEmailLoading}
          testEmailMessage={testEmailMessage}
          theme={theme}
          onRefresh={() => void loadSettingsSummary()}
          onSendTestEmail={() => void sendTestEmail()}
          onSelectTab={setSettingsTab}
          onToggleTheme={toggleTheme}
          onLogout={() => void handleLogout()}
        />
      );
    }

    return (
      <DashboardSection
        loadingProjects={loadingProjects}
        metrics={metrics}
        projects={projects}
        onAddProject={() => setAddProjectOpen(true)}
        onGoToProjects={() => setActiveSection("PROJECTS")}
        onGoToExecutions={() => setActiveSection("EXECUTIONS")}
      />
    );
  })();

  return (
    <>
      {selectedProject && activeSection !== "REPORT_DETAIL" ? (
        <ProjectDetailsPage
          project={selectedProject}
          runs={jobHistory}
          initialTab={parseHashRoute(window.location.hash).type === "PROJECT_RUN" ? "RUNS" : "OVERVIEW"}
          onBack={() => setSelectedProjectId(null)}
          onExecute={(selection) => {
            configureExecution(selectedProject.id, selection);
          }}
          onOpenReport={(jobId) => {
            setReportOrigin({ type: "PROJECT_RUNS", projectId: selectedProject.id, projectName: selectedProject.name });
            setSelectedReportJobId(jobId);
            setActiveSection("REPORT_DETAIL");
            navigateToProjectRun(selectedProject.id, jobId);
          }}
        />
      ) : (
      <div className="min-h-screen text-[var(--text-primary)]">
        <div className="flex min-h-screen">
          <aside className="glass-sidebar fixed inset-y-0 left-0 w-64 border-r border-[var(--hairline)]">
            <div className="flex h-16 items-center px-6">
              <div className="mr-3 flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] text-white shadow-[0_2px_6px_rgba(10,132,255,0.35)]">
                <TestTube2 size={18} />
              </div>

              <div>
                <div className="text-[13px] font-semibold tracking-tight">Qualnexa</div>
                <div className="text-[11px] text-[var(--text-quaternary)]">Execution Platform</div>
              </div>
            </div>

            <div className="mx-4 h-px bg-[var(--fill-quaternary)]" />

            <nav className="space-y-0.5 p-3">
              <SidebarItem icon={<Gauge size={17} />} label="Dashboard" active={activeSection === "DASHBOARD"} onClick={() => setActiveSection("DASHBOARD")} />
              <SidebarItem icon={<FolderGit2 size={17} />} label="Projects" active={activeSection === "PROJECTS"} onClick={() => setActiveSection("PROJECTS")} />
              <SidebarItem icon={<Play size={17} />} label="Executions" active={activeSection === "EXECUTIONS"} onClick={() => setActiveSection("EXECUTIONS")} />
              <SidebarItem icon={<Boxes size={17} />} label="Environments" active={activeSection === "ENVIRONMENTS"} onClick={() => setActiveSection("ENVIRONMENTS")} />
              <SidebarItem icon={<History size={17} />} label="History" active={activeSection === "HISTORY"} onClick={() => setActiveSection("HISTORY")} />
              <SidebarItem icon={<Activity size={17} />} label="Reports" active={activeSection === "REPORTS"} onClick={() => setActiveSection("REPORTS")} />
              <div className="my-3 h-px bg-[var(--fill-quaternary)]" />
              <SidebarItem icon={<Settings size={17} />} label="Settings" active={activeSection === "SETTINGS"} onClick={() => setActiveSection("SETTINGS")} />
            </nav>
          </aside>

          <main className="ml-64 flex-1">
            <header className="glass-panel sticky top-0 z-10 flex h-16 items-center justify-between border-b border-[var(--hairline)] px-8">
              <div>
                <h1 className="text-[15px] font-semibold tracking-tight">Test Automation Execution Platform</h1>
                <p className="text-[11px] text-[var(--text-quaternary)]">Open source, account-aware workspace</p>
              </div>

              <div className="flex items-center gap-3">
                <ThemeToggle />
                <div className="h-6 w-px bg-[var(--hairline)]" />
                <button
                  type="button"
                  onClick={() => setProfileOpen((current) => !current)}
                  className="flex items-center gap-3 rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-2 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--fill-quinary)]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] text-[13px] font-semibold text-white shadow-[0_2px_6px_rgba(10,132,255,0.35)]">
                    {currentUser?.name?.slice(0, 2).toUpperCase() ?? "AE"}
                  </div>

                  <div className="hidden md:block">
                    <div className="text-[13px] font-medium">{currentUser?.name ?? "Profile"}</div>
                    <div className="text-[11px] text-[var(--text-quaternary)]">{currentUser?.email ?? "Sign in or create account"}</div>
                  </div>

                  <ChevronDown size={15} className="text-[var(--text-quaternary)]" />
                </button>
              </div>
            </header>

            <div className="mx-auto max-w-[1500px] p-8">
              {pageContent}
            </div>
          </main>
        </div>
      </div>
      )}

      {profileOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-end bg-[var(--overlay-backdrop)] px-4 py-4 backdrop-blur-sm" onClick={() => setProfileOpen(false)}>
          <div
            className="mt-12 w-full max-w-[360px] overflow-hidden rounded-[22px] border border-[var(--hairline-strong)] bg-[var(--surface)] shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[var(--hairline)] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[14px] font-semibold tracking-tight">{currentUser?.name ?? "Profile"}</div>
                  <div className="mt-0.5 text-[12px] text-[var(--text-quaternary)]">{currentUser?.email ?? "Access your account"}</div>
                </div>
                <div className="rounded-full bg-[var(--fill-tertiary)] px-2.5 py-1 text-[10.5px] font-medium text-[var(--text-secondary)]">{currentUser ? (currentUser.verified ? "Verified" : "Pending") : "Guest"}</div>
              </div>
            </div>

            {!sessionLoaded && <div className="px-5 py-4 text-[12.5px] text-[var(--text-quaternary)]"><Loader2 size={15} className="mr-2 inline animate-spin" />Loading session...</div>}

            {!currentUser ? (
              <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-5 py-4">
                <div className="grid grid-cols-2 gap-1 rounded-[14px] border border-[var(--hairline)] bg-[var(--fill-quinary)] p-1">
                  <button type="button" onClick={() => setAuthMode("SIGN_IN")} className={`rounded-[10px] px-3 py-2 text-[12px] font-medium transition ${authMode === "SIGN_IN" ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-quaternary)]"}`}>Iniciar sesión</button>
                  <button type="button" onClick={() => setAuthMode("SIGN_UP")} className={`rounded-[10px] px-3 py-2 text-[12px] font-medium transition ${authMode === "SIGN_UP" ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-quaternary)]"}`}>Crear cuenta</button>
                </div>

                <div className="space-y-3">
                  {authMode === "SIGN_UP" && (
                    <InputField label="Nombre" value={nameInput} onChange={setNameInput} placeholder="Tu nombre" />
                  )}
                  <InputField label="Correo" value={emailInput} onChange={setEmailInput} placeholder="correo@empresa.com" type="email" icon={<Mail size={14} />} />
                  {emailInput.length > 0 && !isValidEmail(emailInput) && <div className="text-[11.5px] text-[#ff3b30]">Enter a valid email address.</div>}
                  <InputField label="Contraseña" value={passwordInput} onChange={setPasswordInput} placeholder="••••••••" type="password" icon={<KeyRound size={14} />} />
                  {authMode === "SIGN_UP" && <InputField label="Confirmar contraseña" value={confirmPasswordInput} onChange={setConfirmPasswordInput} placeholder="••••••••" type="password" icon={<ShieldCheck size={14} />} />}
                </div>

                {authMode === "SIGN_UP" && (
                  <div className="rounded-[14px] border border-[var(--hairline)] bg-[var(--fill-quinary)] p-3">
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-quaternary)]">Password strength</div>
                    <div className="mb-2 h-2 overflow-hidden rounded-full bg-[var(--fill-tertiary)]">
                      <div className={`h-full rounded-full transition-all ${passwordStrength >= 5 ? "bg-[#34c759]" : passwordStrength >= 3 ? "bg-[#ff9500]" : "bg-[#ff3b30]"}`} style={{ width: `${Math.min(100, passwordStrength * 20)}%` }} />
                    </div>
                    <div className="grid gap-1.5 text-[11.5px] text-[var(--text-secondary)]">
                      {passwordChecks.map((check) => (
                        <div key={check.label} className={`flex items-center gap-2 ${check.ok ? "text-[#34c759]" : "text-[var(--text-quaternary)]"}`}>
                          <CheckCircle2 size={13} />
                          {check.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showVerificationReminder && authMode === "SIGN_UP" && (
                  <div className="rounded-[14px] border border-[#ff9500]/20 bg-[#ff9500]/10 px-3 py-2.5 text-[12px] text-[var(--badge-orange-text)]">We sent a verification link to your inbox. Activate your account to finish setup.</div>
                )}
                {authError && <div className="rounded-[14px] border border-[#ff3b30]/20 bg-[#ff3b30]/8 px-4 py-3 text-[12.5px] text-[var(--badge-red-text)]">{authError}</div>}
                {authSuccess && <div className="rounded-[14px] border border-[#34c759]/20 bg-[#34c759]/8 px-4 py-3 text-[12.5px] text-[var(--badge-green-text)]">{authSuccess}</div>}
                {verificationMessage && <div className="rounded-[14px] border border-[#34c759]/20 bg-[#34c759]/8 px-4 py-3 text-[12.5px] text-[var(--badge-green-text)]">{verificationMessage}</div>}

                <div className="pt-1">
                  <button type="button" onClick={handleAuth} disabled={authLoading} className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#0a84ff] px-4 py-2.5 text-[12.5px] font-semibold text-white transition hover:bg-[#0074e8] disabled:cursor-not-allowed disabled:opacity-60">
                    {authLoading ? <Loader2 size={15} className="animate-spin" /> : authMode === "SIGN_UP" ? <UserPlus size={15} /> : <LogIn size={15} />}
                    {authMode === "SIGN_UP" ? "Crear cuenta" : "Iniciar sesión"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => handleOAuth("google")} className="flex items-center justify-center gap-2 rounded-[12px] border border-[var(--hairline-strong)] bg-[var(--fill-quinary)] px-3 py-2 text-[12px] font-medium">
                    <Sparkles size={14} /> Google
                  </button>
                  <button type="button" onClick={() => handleOAuth("github")} className="flex items-center justify-center gap-2 rounded-[12px] border border-[var(--hairline-strong)] bg-[var(--fill-quinary)] px-3 py-2 text-[12px] font-medium">
                    <Sparkles size={14} /> GitHub
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto px-5 pb-5">
                <div className="rounded-[16px] border border-[var(--hairline)] bg-[var(--fill-quinary)] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#0a84ff] to-[#5e5ce6] text-white"><UserCircle2 size={22} /></div>
                    <div>
                      <div className="text-[14px] font-semibold">{currentUser.name ?? "Account"}</div>
                      <div className="text-[12px] text-[var(--text-quaternary)]">{currentUser.email}</div>
                    </div>
                  </div>
                  {!currentUser.verified && <div className="mt-3 rounded-[12px] border border-[#ff9500]/20 bg-[#ff9500]/10 px-3 py-2 text-[12px] text-[var(--badge-orange-text)]">Please confirm your email to fully activate the account.</div>}
                </div>

                <button type="button" onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-[var(--hairline-strong)] bg-[var(--fill-quinary)] px-4 py-3 text-[13px] font-semibold text-[var(--text-primary)]">
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <AddProjectDialog open={addProjectOpen} onClose={() => setAddProjectOpen(false)} onSubmit={handleAddProject} />
      <ExecutionConfigurationDialog project={executionConfiguration ? projects.find((project) => project.id === executionConfiguration.projectId) ?? null : null} selection={executionConfiguration?.selection ?? null} onClose={() => setExecutionConfiguration(null)} onConfirm={(projectId, selection, environment) => { setExecutionConfiguration(null); void prepareExecution(projectId, selection, environment); }} />
      <ExecutionPlanDialog plan={executionPlan} loading={executionLoading} error={executionError} onExecute={executeCurrentPlan} onClose={() => { setExecutionPlan(null); setExecutionError(null); }} />
      <ExecutionJobDialog jobId={runningJobId} onClose={() => setRunningJobId(null)} />
    </>
  );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-[13px] transition ${active ? "bg-[var(--fill-quaternary)] font-medium text-[var(--text-primary)] shadow-[inset_0_0_0_1px_var(--sidebar-active-border)]" : "text-[var(--text-secondary)] hover:bg-[var(--fill-quinary)] hover:text-[var(--text-primary)]"}`}>
      <span className={active ? "text-[var(--accent-strong)]" : "text-[var(--text-quaternary)]"}>{icon}</span>
      <span className="flex-1">{label}</span>
      {active && <span className="h-2 w-2 rounded-full bg-[var(--accent-strong)]" />}
    </button>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button type="button" onClick={toggleTheme} className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] text-[var(--text-secondary)] transition hover:bg-[var(--fill-quinary)]">
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}

function SettingsSection({ currentUser, loading, error, settings, selectedTab, testEmailLoading, testEmailMessage, theme, onRefresh, onSendTestEmail, onSelectTab, onToggleTheme, onLogout }: { currentUser: { name?: string; email: string; verified?: boolean } | null; loading: boolean; error: string | null; settings: SettingsSummary | null; selectedTab: SettingsTab; testEmailLoading: boolean; testEmailMessage: string | null; theme: "light" | "dark"; onRefresh: () => void; onSendTestEmail: () => void; onSelectTab: (tab: SettingsTab) => void; onToggleTheme: () => void; onLogout: () => void }) {
  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: "GENERAL", label: "General", icon: <Globe size={16} /> },
    { id: "PROFILE", label: "Profile", icon: <User size={16} /> },
    { id: "INTEGRATIONS", label: "Integrations", icon: <Sparkles size={16} /> },
    { id: "EXECUTION", label: "Execution", icon: <Play size={16} /> },
    { id: "RUNTIMES", label: "Runtimes & Tooling", icon: <Server size={16} /> },
    { id: "PROJECT_ACCESS", label: "Project Access", icon: <LockKeyhole size={16} /> },
    { id: "APPEARANCE", label: "Appearance", icon: <Palette size={16} /> },
    { id: "ABOUT", label: "About", icon: <Info size={16} /> },
  ];

  return (
    <>
      <section className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight">Settings</h2>
          <p className="mt-1.5 text-[13px] text-[var(--text-tertiary)]">Configure your Qualnexa workspace and execution environment.</p>
        </div>

        <button type="button" onClick={onRefresh} className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-medium transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-soft-surface)]">
          <RefreshCw size={14} className="mr-2 inline" />Refresh
        </button>
      </section>

      {error && <InlineAlert title="Settings unavailable" message={error} />}

      <section className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="glass-panel rounded-[24px] border border-[var(--hairline)] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-quaternary)]">Settings</div>
          <div className="space-y-1.5">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" onClick={() => onSelectTab(tab.id)} className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-[13px] transition ${selectedTab === tab.id ? "bg-[var(--accent-soft-surface)] text-[var(--accent-strong)] shadow-[inset_0_0_0_1px_var(--accent-soft-border)]" : "text-[var(--text-secondary)] hover:bg-[var(--fill-quinary)] hover:text-[var(--text-primary)]"}`}>
                {tab.icon}
                <span className="flex-1">{tab.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="glass-panel rounded-[24px] border border-[var(--hairline)] p-6 shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
          {loading || !settings ? (
            <div className="py-10 text-center text-[13px] text-[var(--text-quaternary)]">Loading settings...</div>
          ) : selectedTab === "GENERAL" ? (
            <SettingsGrid title="Workspace" description="Global workspace metadata and connectivity.">
              <SettingsField label="Workspace name" value={settings.general.workspaceName} />
              <SettingsField label="Description" value={settings.general.description} />
              <SettingsField label="Timezone" value={settings.general.timezone} />
              <SettingsField label="Language" value={settings.general.language} />
              <SettingsField label="Date format" value={settings.general.dateTimeFormat} />
              <SettingsField label="Frontend URL" value={settings.general.frontendUrl} />
              <SettingsField label="Backend URL" value={settings.general.backendUrl} />
              <SettingsField label="Backend status" value={settings.general.backendStatus} tone="success" />
              <SettingsField label="Qualnexa version" value={settings.general.version} />
            </SettingsGrid>
          ) : selectedTab === "PROFILE" ? (
            <SettingsGrid title="Profile" description="Authenticated user and security-related profile information.">
              <SettingsField label="Name" value={currentUser?.name ?? "Guest"} />
              <SettingsField label="Email" value={currentUser?.email ?? "Not signed in"} />
              <SettingsField label="Verification" value={currentUser?.verified ? "Verified" : "Pending"} tone={currentUser?.verified ? "success" : "warning"} />
              <SettingsField label="Authentication method" value={currentUser ? "Session cookie" : "Anonymous"} />
              <SettingsField label="Session duration" value={`${settings.profile.sessionDurationMinutes} minutes`} />
              <SettingsField label="Email verification required" value={settings.profile.emailVerificationRequired ? "Yes" : "No"} />
              <div className="md:col-span-2 pt-2">
                <button type="button" onClick={onLogout} className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-medium transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-soft-surface)]">Log out</button>
              </div>
            </SettingsGrid>
          ) : selectedTab === "INTEGRATIONS" ? (
            <SettingsGrid title="Integrations" description="OAuth and email providers configured for this workspace.">
              <SettingsField label="Google OAuth" value={settings.integrations.google.status} tone={settings.integrations.google.enabled ? "success" : "neutral"} />
              <SettingsField label="Google Client ID" value={settings.integrations.google.clientIdMasked ?? "Not configured"} />
              <SettingsField label="Google Redirect URI" value={settings.integrations.google.redirectUri ?? "Not configured"} />
              <SettingsField label="GitHub OAuth" value={settings.integrations.github.status} tone={settings.integrations.github.enabled ? "success" : "neutral"} />
              <SettingsField label="GitHub Client ID" value={settings.integrations.github.clientIdMasked ?? "Not configured"} />
              <SettingsField label="GitHub Callback URL" value={settings.integrations.github.redirectUri ?? "Not configured"} />
              <SettingsField label="Email Provider" value={`${settings.integrations.email.provider} · ${settings.integrations.email.status}`} tone={settings.integrations.email.status === "Configured" ? "success" : "neutral"} />
              <SettingsField label="From address" value={settings.integrations.email.fromAddress ?? "Not configured"} />
              <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
                <button type="button" onClick={onSendTestEmail} disabled={testEmailLoading} className="rounded-full bg-[var(--accent-strong)] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[var(--accent-strong-hover)] disabled:cursor-not-allowed disabled:opacity-60">
                  <Send size={14} className="mr-2 inline" />{testEmailLoading ? "Checking..." : "Test email"}
                </button>
                {testEmailMessage && <div className="text-[12.5px] text-[var(--text-quaternary)]">{testEmailMessage}</div>}
              </div>
            </SettingsGrid>
          ) : selectedTab === "EXECUTION" ? (
            <SettingsGrid title="Execution defaults" description="Workspace-wide execution defaults that remain framework-agnostic.">
              <SettingsField label="Default timeout" value={`${settings.execution.defaultTimeoutMinutes} minutes`} />
              <SettingsField label="Kill grace period" value={`${settings.execution.processKillGracePeriodSeconds} seconds`} />
              <SettingsField label="Max parallel executions" value={String(settings.execution.maximumConcurrentExecutions)} />
              <SettingsField label="Max concurrent projects" value={String(settings.execution.maximumConcurrentProjects)} />
              <SettingsField label="Retry enabled" value={settings.execution.retryPolicy.enabled ? "Yes" : "No"} />
              <SettingsField label="Max retries" value={String(settings.execution.retryPolicy.maxRetries)} />
              <SettingsField label="Retry technical failures only" value={settings.execution.retryPolicy.onlyTechnicalFailures ? "Yes" : "No"} />
            </SettingsGrid>
          ) : selectedTab === "RUNTIMES" ? (
            <SettingsGrid title="Runtimes & Tooling" description="Detected tools available on the machine where Qualnexa runs.">
              {settings.runtimes.tools.map((tool) => (
                <SettingsField key={tool.id} label={tool.displayName} value={tool.found ? tool.version ?? "Available" : "Not found"} tone={tool.found ? "success" : "warning"} />
              ))}
              <SettingsField label="Detected JDKs" value={String(settings.runtimes.jdks.length)} />
              <div className="md:col-span-2 pt-2">
                <button type="button" onClick={onRefresh} className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-medium transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-soft-surface)]">Run environment check</button>
              </div>
            </SettingsGrid>
          ) : selectedTab === "PROJECT_ACCESS" ? (
            <SettingsGrid title="Project Access" description="Allowed host directories that Qualnexa can browse and inspect.">
              <div className="md:col-span-2">
                {settings.projectAccess.unrestricted ? (
                  <InlineAlert title="Unrestricted access" message="Qualnexa currently has unrestricted filesystem access." />
                ) : (
                  <div className="space-y-3">
                    {settings.projectAccess.allowedRoots.map((root) => (
                      <div key={root.path} className="rounded-[16px] border border-[var(--hairline)] bg-[var(--fill-quinary)] px-4 py-3">
                        <div className="text-[13px] font-medium">{root.path}</div>
                        <div className={`mt-1 text-[12px] ${root.exists ? "text-[var(--badge-green-text)]" : "text-[var(--badge-red-text)]"}`}>{root.exists ? "Directory exists" : "Directory not found"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SettingsGrid>
          ) : selectedTab === "APPEARANCE" ? (
            <SettingsGrid title="Appearance" description="Visual preferences for the Qualnexa interface.">
              <SettingsField label="Current theme" value={theme} />
              <SettingsField label="Supported modes" value={settings.appearance.supportedModes.join(", ")} />
              <SettingsField label="Default mode" value={settings.appearance.defaultMode} />
              <div className="md:col-span-2 pt-2">
                <button type="button" onClick={onToggleTheme} className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-medium transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-soft-surface)]">Toggle light / dark</button>
              </div>
            </SettingsGrid>
          ) : (
            <SettingsGrid title="About" description="Product and workspace runtime information.">
              <SettingsField label="Frontend version" value={settings.general.version} />
              <SettingsField label="Backend status" value={settings.diagnostics.backendStatus} tone="success" />
              <SettingsField label="Storage access" value={settings.diagnostics.storageAccess} />
              <SettingsField label="Filesystem mode" value={settings.diagnostics.filesystemPermissions} />
              <SettingsField label="Artifacts directory" value={settings.storage.artifactDirectory} />
              <SettingsField label="Upload limit" value={`${formatBytes(settings.storage.maxUploadZipBytes)} / ${settings.storage.maxUploadFileCount} files`} />
              <SettingsField label="Diagnostics timestamp" value={formatDateTime(settings.diagnostics.runtimeCheckGeneratedAt)} />
            </SettingsGrid>
          )}
        </div>
      </section>
    </>
  );
}

function SettingsGrid({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-6 border-b border-[var(--hairline)] pb-4">
        <h3 className="text-[18px] font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function SettingsField({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "success" | "warning" }) {
  const toneClass = tone === "success"
    ? "text-[var(--badge-green-text)]"
    : tone === "warning"
      ? "text-[var(--badge-orange-text)]"
      : "text-[var(--text-primary)]";

  return (
    <div className="rounded-[16px] border border-[var(--hairline)] bg-[var(--fill-quinary)] p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-quaternary)]">{label}</div>
      <div className={`mt-2 break-all text-[13.5px] font-medium ${toneClass}`}>{value}</div>
    </div>
  );
}

function MetadataField({ label, value, copyable = false }: { label: string; value: string; copyable?: boolean }) {
  return (
    <div className="rounded-[16px] border border-[var(--hairline)] bg-[var(--fill-quinary)] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-quaternary)]">{label}</div>
      <div className="mt-2 flex items-center gap-2">
        <div className="min-w-0 flex-1 break-all text-[13px] font-medium text-[var(--text-primary)]">{value}</div>
        {copyable && <span className="rounded-full border border-[var(--hairline-strong)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-quaternary)]">Copy</span>}
      </div>
    </div>
  );
}

function ResponsiveReportCell({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "success" | "danger" }) {
  const toneClass = tone === "success"
    ? "text-[var(--badge-green-text)]"
    : tone === "danger"
      ? "text-[var(--badge-red-text)]"
      : "text-[var(--text-secondary)]";

  return (
    <div className="flex items-center justify-between xl:block">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--text-quaternary)] xl:hidden">{label}</span>
      <span className={`text-[12px] ${toneClass}`}>{value}</span>
    </div>
  );
}

function MetricCard({ title, value, detail, icon, tone = "neutral" }: { title: string; value: string; detail: string; icon: React.ReactNode; tone?: "neutral" | "accent" | "success" | "danger" | "warning" }) {
  const toneStyles = tone === "accent"
    ? "border-[var(--accent-soft-border)] bg-[var(--accent-soft-surface)]/65"
    : tone === "success"
      ? "border-[var(--success-soft-border)] bg-[var(--success-soft-surface)]/65"
      : tone === "danger"
        ? "border-[var(--danger-soft-border)] bg-[var(--danger-soft-surface)]/65"
        : tone === "warning"
          ? "border-[var(--warning-soft-border)] bg-[var(--warning-soft-surface)]/65"
          : "border-[var(--hairline)]";

  const iconTone = tone === "accent"
    ? "text-[var(--accent-strong)]"
    : tone === "success"
      ? "text-[var(--badge-green-text)]"
      : tone === "danger"
        ? "text-[var(--badge-red-text)]"
        : tone === "warning"
          ? "text-[var(--badge-orange-text)]"
          : "text-[var(--text-quaternary)]";

  return (
    <div className={`glass-panel rounded-[22px] border p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.05)] ${toneStyles}`}>
      <div className="mb-4 flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-[var(--text-secondary)]">{title}</span>
        <span className={iconTone}>{icon}</span>
      </div>
      <div className="text-[28px] font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">{detail}</div>
    </div>
  );
}

function DashboardSection({ loadingProjects, metrics, projects, onAddProject, onGoToProjects, onGoToExecutions }: { loadingProjects: boolean; metrics: { projects: number; containers: number; tests: number; labels: number }; projects: ProjectManifest[]; onAddProject: () => void; onGoToProjects: () => void; onGoToExecutions: () => void }) {
  return (
    <>
      <section className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight">Automation Overview</h2>
          <p className="mt-1.5 text-[13px] text-[var(--text-tertiary)]">Discover, validate and execute automation projects from one place.</p>
        </div>

        <button
          type="button"
          onClick={onAddProject}
          className="flex items-center gap-2 rounded-full bg-[var(--accent-strong)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(10,132,255,0.28)] transition hover:bg-[var(--accent-strong-hover)] active:scale-[0.97]"
        >
          <FolderGit2 size={16} />
          Add Project
        </button>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-4">
        <MetricCard title="Projects" value={String(metrics.projects)} detail="Registered projects" icon={<FolderGit2 size={18} />} />
        <MetricCard title="Test Containers" value={String(metrics.containers)} detail="Features, specs, modules..." icon={<TestTube2 size={18} />} />
        <MetricCard title="Tests" value={String(metrics.tests)} detail="Discovered executable tests" icon={<Play size={18} />} />
        <MetricCard title="Labels" value={String(metrics.labels)} detail="Tags, markers and labels" icon={<Tags size={18} />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-6 lg:grid-cols-2">
          <DashboardActionCard
            icon={<FolderGit2 size={18} />}
            title="Projects workspace"
            description="Open the project catalog, review registered repositories and navigate to project details."
            actionLabel="Open projects"
            onClick={onGoToProjects}
          />
          <DashboardActionCard
            icon={<Play size={18} />}
            title="Executions center"
            description="Review recent execution plans and jump back into a project run configuration."
            actionLabel="Open executions"
            onClick={onGoToExecutions}
          />
        </div>

        <div className="glass-dark rounded-[22px] border p-6 shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
          <h3 className="text-[14px] font-semibold tracking-tight">Workspace summary</h3>
          <p className="mt-2 text-[12.5px] leading-6 text-[var(--info-panel-muted)]">
            {loadingProjects ? "Loading project insights..." : projects.length > 0 ? `You currently have ${projects.length} project${projects.length === 1 ? "" : "s"} ready for exploration and execution.` : "Add a project to start exploring tests and preparing executions."}
          </p>
        </div>
      </section>
    </>
  );
}

function ProjectsSection({ loadingProjects, metrics, projectError, projects, onAddProject, onPrepareExecution, onSelectProject }: { loadingProjects: boolean; metrics: { projects: number; containers: number; tests: number; labels: number }; projectError: string | null; projects: ProjectManifest[]; onAddProject: () => void; onPrepareExecution: (projectId: string, selection: ExecutionSelection) => void; onSelectProject: (projectId: string) => void }) {
  return (
    <>
      <section className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight">Projects</h2>
          <p className="mt-1.5 text-[13px] text-[var(--text-tertiary)]">Browse registered automation workspaces and open their test inventory.</p>
        </div>

        <button
          type="button"
          onClick={onAddProject}
          className="flex items-center gap-2 rounded-full bg-[var(--accent-strong)] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(10,132,255,0.28)] transition hover:bg-[var(--accent-strong-hover)] active:scale-[0.97]"
        >
          <FolderGit2 size={16} />
          Add Project
        </button>
      </section>

      {projectError && (
        <div className="glass-panel mb-6 flex items-start gap-3 rounded-2xl border border-[#ff3b30]/25 px-5 py-4 text-[13px] text-[var(--badge-red-text)]">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Project operation failed</div>
            <div className="mt-1">{projectError}</div>
          </div>
        </div>
      )}

      <section className="mb-8 grid grid-cols-1 gap-4 xl:grid-cols-4">
        <MetricCard title="Projects" value={String(metrics.projects)} detail="Registered projects" icon={<FolderGit2 size={18} />} />
        <MetricCard title="Test Containers" value={String(metrics.containers)} detail="Features, specs, modules..." icon={<TestTube2 size={18} />} />
        <MetricCard title="Tests" value={String(metrics.tests)} detail="Discovered executable tests" icon={<Play size={18} />} />
        <MetricCard title="Labels" value={String(metrics.labels)} detail="Tags, markers and labels" icon={<Tags size={18} />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="glass-panel overflow-hidden rounded-[22px] border border-[var(--hairline)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.06)]">
          <div className="border-b border-[var(--hairline)] px-6 py-5">
            <h3 className="text-[15px] font-semibold tracking-tight">Projects</h3>
            <p className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">Registered automation projects</p>
          </div>

          {loadingProjects && (
            <div className="px-6 py-10 text-center text-[13px] text-[var(--text-quaternary)]">Loading projects...</div>
          )}

          {!loadingProjects && projects.length === 0 && (
            <div className="px-6 py-14 text-center">
              <FolderGit2 size={28} className="mx-auto text-[var(--text-quinary)]" />
              <div className="mt-3 text-[14px] font-medium">No projects registered</div>
              <div className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">Add your first automation project.</div>
            </div>
          )}

          <div className="divide-y divide-[var(--hairline)]">
            {projects.map((project) => (
              <ProjectRow
                key={project.id}
                project={project}
                onPrepareExecution={onPrepareExecution}
                onSelectProject={onSelectProject}
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <EnvironmentDoctorPanel />

          <div className="glass-dark rounded-[22px] border p-6 shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
            <h3 className="text-[14px] font-semibold tracking-tight">Quick execution</h3>
            <p className="mt-2 text-[12.5px] leading-6 text-[var(--info-panel-muted)]">Use "Run" on a project to configure and execute it.</p>
          </div>
        </div>
      </section>
    </>
  );
}

function ExecutionsSection({ jobs, onOpenProject, onOpenJob }: { jobs: ExecutionJob[]; onOpenProject: (projectId: string) => void; onOpenJob: (jobId: string) => void }) {
  const groupedProjects = useMemo(() => {
    const map = new Map<string, { projectId: string; projectName: string; jobs: ExecutionJob[] }>();

    for (const job of jobs) {
      const current = map.get(job.projectId) ?? {
        projectId: job.projectId,
        projectName: job.projectName,
        jobs: [],
      };
      current.jobs.push(job);
      map.set(job.projectId, current);
    }

    return [...map.values()].map((group) => {
      const running = group.jobs.filter((job) => job.status === "RUNNING");
      const queued = group.jobs.filter((job) => job.status === "QUEUED");
      const recent = [...group.jobs].sort((left, right) => new Date(right.finishedAt ?? right.startedAt ?? 0).getTime() - new Date(left.finishedAt ?? left.startedAt ?? 0).getTime());
      const lastRun = recent[0] ?? null;

      return {
        ...group,
        running,
        queued,
        recent,
        lastRun,
      };
    }).sort((left, right) => new Date(right.lastRun?.finishedAt ?? right.lastRun?.startedAt ?? 0).getTime() - new Date(left.lastRun?.finishedAt ?? left.lastRun?.startedAt ?? 0).getTime());
  }, [jobs]);

  const runningCount = jobs.filter((job) => job.status === "RUNNING").length;
  const queuedCount = jobs.filter((job) => job.status === "QUEUED").length;
  const completedToday = jobs.filter((job) => isSameLocalDay(job.finishedAt)).length;
  const failedToday = jobs.filter((job) => (job.testResultStatus === "FAILED" || job.status === "ERROR") && isSameLocalDay(job.finishedAt)).length;

  return (
    <>
      <section className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight">Executions</h2>
          <p className="mt-1.5 text-[13px] text-[var(--text-tertiary)]">Monitor what is running now, what is queued, and the most recent completed executions.</p>
        </div>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Running" value={String(runningCount)} detail="Jobs currently executing" icon={<Play size={18} />} tone="accent" />
        <MetricCard title="Queued" value={String(queuedCount)} detail="Jobs waiting to start" icon={<Clock3 size={18} />} tone="warning" />
        <MetricCard title="Completed Today" value={String(completedToday)} detail="Finished executions today" icon={<CheckCircle2 size={18} />} tone="success" />
        <MetricCard title="Failed Today" value={String(failedToday)} detail="Terminal failures today" icon={<TriangleAlert size={18} />} tone="danger" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {groupedProjects.length === 0 ? (
            <div className="glass-panel rounded-[22px] border border-[var(--hairline)] px-6 py-14 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.06)]">
              <Play size={28} className="mx-auto text-[var(--text-quinary)]" />
              <div className="mt-3 text-[14px] font-medium">No executions yet</div>
              <div className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">Run a project to populate live and recent execution activity.</div>
            </div>
          ) : groupedProjects.map((group) => (
            <button
              key={group.projectId}
              type="button"
              onClick={() => onOpenProject(group.projectId)}
              className="glass-panel group w-full rounded-[22px] border border-[var(--hairline)] px-6 py-5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.06)] transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--fill-quinary)] focus-visible:border-[var(--accent-soft-border)] focus-visible:bg-[var(--fill-quinary)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-[16px] font-semibold tracking-tight text-[var(--text-primary)]">{group.projectName}</div>
                  <div className="mt-1 text-[12.5px] text-[var(--text-secondary)]">{group.running.length} running · {group.queued.length} queued</div>
                  <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-[var(--text-quaternary)]">
                    <span>Last run: {group.lastRun ? group.lastRun.status : "—"}</span>
                    <span>Tests: {group.lastRun?.result?.total ?? "—"}</span>
                    <span>Duration: {group.lastRun?.durationMs ? formatDuration(group.lastRun.durationMs) : "—"}</span>
                    <span>Last activity: {group.lastRun?.finishedAt ? formatDateTime(group.lastRun.finishedAt) : group.lastRun?.startedAt ? formatDateTime(group.lastRun.startedAt) : "—"}</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-2 text-[11.5px] font-medium text-[var(--text-primary)] transition group-hover:border-[var(--accent-soft-border)] group-hover:bg-[var(--accent-soft-surface)] group-hover:text-[var(--accent-strong)]">
                  View executions
                  <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-6">
          <div className="glass-dark rounded-[22px] border p-6 shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
            <h3 className="text-[14px] font-semibold tracking-tight">Active</h3>
            <div className="mt-4 space-y-3 text-[12.5px] text-[var(--info-panel-muted)]">
              {runningCount === 0 ? (
                <div>No active executions</div>
              ) : jobs.filter((job) => job.status === "RUNNING").slice(0, 3).map((job) => (
                <button key={job.id} type="button" onClick={() => onOpenJob(job.id)} className="block w-full rounded-[16px] border border-white/10 bg-white/4 px-4 py-3 text-left transition hover:bg-white/8">
                  <div className="text-[var(--info-panel-text)]">{job.projectName}</div>
                  <div className="mt-1 text-[11.5px]">Run {job.id.slice(0, 8)} · {job.environment ?? "default"}</div>
                </button>
              ))
              }
            </div>
          </div>

          <div className="glass-dark rounded-[22px] border p-6 shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
            <h3 className="text-[14px] font-semibold tracking-tight">Queued</h3>
            <div className="mt-4 space-y-3 text-[12.5px] text-[var(--info-panel-muted)]">
              {queuedCount === 0 ? (
                <div>No queued executions</div>
              ) : jobs.filter((job) => job.status === "QUEUED").slice(0, 3).map((job) => (
                <button key={job.id} type="button" onClick={() => onOpenJob(job.id)} className="block w-full rounded-[16px] border border-white/10 bg-white/4 px-4 py-3 text-left transition hover:bg-white/8">
                  <div className="text-[var(--info-panel-text)]">{job.projectName}</div>
                  <div className="mt-1 text-[11.5px]">Run {job.id.slice(0, 8)} · {job.environment ?? "default"}</div>
                </button>
              ))
              }
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function DashboardActionCard({ icon, title, description, actionLabel, onClick }: { icon: React.ReactNode; title: string; description: string; actionLabel: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-panel group rounded-[24px] border border-[var(--hairline)] p-6 text-left shadow-[0_12px_32px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5 hover:border-[var(--accent-soft-border)] hover:bg-[var(--fill-quinary)]"
    >
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft-surface)] text-[var(--accent-strong)]">
        {icon}
      </div>
      <div className="text-[18px] font-semibold tracking-tight">{title}</div>
      <div className="mt-2 text-[13px] leading-6 text-[var(--text-quaternary)]">{description}</div>
      <div className="mt-5 inline-flex items-center gap-2 text-[12.5px] font-semibold text-[var(--accent-strong)]">
        {actionLabel}
        <ArrowRight size={15} className="transition group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}

function EnvironmentsSection({ loading, error, report, projects, onRefresh }: { loading: boolean; error: string | null; report: DoctorReport | null; projects: ProjectManifest[]; onRefresh: () => void }) {
  const environments = projects.flatMap((project) =>
    project.environments.map((environment) => ({
      ...environment,
      projectName: project.name,
      frameworkName: project.frameworks[0]?.displayName ?? "Unknown framework",
    })),
  );

  return (
    <>
      <section className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight">Environments</h2>
          <p className="mt-1.5 text-[13px] text-[var(--text-tertiary)]">Detected execution environments and machine readiness for the current workspace.</p>
        </div>

        <button type="button" onClick={onRefresh} className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-medium transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-soft-surface)]">
          Refresh
        </button>
      </section>

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard title="Detected environments" value={String(environments.length)} detail="Framework environments across projects" icon={<Boxes size={18} />} />
        <MetricCard title="Projects with environments" value={String(new Set(environments.map((item) => item.projectName)).size)} detail="Projects exposing execution targets" icon={<FolderGit2 size={18} />} />
        <MetricCard title="Installed JDKs" value={String(report?.jdks.length ?? 0)} detail="Available Java distributions" icon={<ShieldCheck size={18} />} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="glass-panel overflow-hidden rounded-[22px] border border-[var(--hairline)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.06)]">
          <div className="border-b border-[var(--hairline)] px-6 py-5">
            <h3 className="text-[15px] font-semibold tracking-tight">Framework environments</h3>
            <p className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">Execution targets discovered from the registered projects.</p>
          </div>

          {environments.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Boxes size={28} className="mx-auto text-[var(--text-quinary)]" />
              <div className="mt-3 text-[14px] font-medium">No environments detected</div>
              <div className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">Projects without named targets will use their default execution environment.</div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--hairline)]">
              {environments.map((environment) => (
                <div key={`${environment.projectName}-${environment.id}`} className="flex items-center justify-between gap-4 px-6 py-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-[14px] font-semibold tracking-tight">{environment.displayName}</div>
                      {environment.isDefault && <span className="rounded-full bg-[var(--accent-soft-surface)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--accent-strong)]">Default</span>}
                    </div>
                    <div className="mt-1 text-[12.5px] text-[var(--text-secondary)]">{environment.projectName}</div>
                    <div className="mt-1 text-[12px] text-[var(--text-quaternary)]">{environment.frameworkName}{environment.source ? ` · ${environment.source}` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <EnvironmentDoctorPanel />

          <div className="glass-dark rounded-[22px] border p-6 shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
            <h3 className="text-[14px] font-semibold tracking-tight">Machine readiness</h3>
            <p className="mt-2 text-[12.5px] leading-6 text-[var(--info-panel-muted)]">{loading ? "Refreshing local tool availability..." : error ? error : report ? `Doctor report generated at ${formatDateTime(report.generatedAt)}.` : "No doctor report available yet."}</p>
          </div>
        </div>
      </section>
    </>
  );
}

function HistorySection({ loading, error, jobs, onRefresh, onOpenJob }: { loading: boolean; error: string | null; jobs: ExecutionJob[]; onRefresh: () => void; onOpenJob: (jobId: string) => void }) {
  return (
    <>
      <section className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight">History</h2>
          <p className="mt-1.5 text-[13px] text-[var(--text-tertiary)]">Track executed jobs, their status and open the full execution log.</p>
        </div>

        <button type="button" onClick={onRefresh} className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-2.5 text-[13px] font-medium transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-soft-surface)]">
          Refresh
        </button>
      </section>

      {error && <InlineAlert title="History unavailable" message={error} />}

      <section className="glass-panel overflow-hidden rounded-[22px] border border-[var(--hairline)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.06)]">
        <div className="border-b border-[var(--hairline)] px-6 py-5">
          <h3 className="text-[15px] font-semibold tracking-tight">Execution jobs</h3>
          <p className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">Latest jobs started from the execution workflow.</p>
        </div>

        {loading ? (
          <div className="px-6 py-10 text-center text-[13px] text-[var(--text-quaternary)]">Loading execution history...</div>
        ) : jobs.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <History size={28} className="mx-auto text-[var(--text-quinary)]" />
            <div className="mt-3 text-[14px] font-medium">No execution history yet</div>
            <div className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">Run a project to start building historical execution data.</div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--hairline)]">
            {jobs.map((job) => (
              <button key={job.id} type="button" onClick={() => onOpenJob(job.id)} className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left transition hover:bg-[var(--fill-quinary)]">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-[14px] font-semibold tracking-tight text-[var(--text-primary)]">{job.projectName}</div>
                    <JobStatusPill status={job.status} />
                  </div>
                  <div className="mt-1 text-[12.5px] text-[var(--text-secondary)]">{job.frameworks.join(", ") || "Custom command"}</div>
                  <div className="mt-1 text-[12px] text-[var(--text-quaternary)]">{job.environment ?? "Default environment"} · {job.startedAt ? formatDateTime(job.startedAt) : "Pending start"}</div>
                </div>
                <div className="text-right text-[12px] text-[var(--text-quaternary)]">{job.durationMs !== undefined ? `${(job.durationMs / 1000).toFixed(1)}s` : "—"}</div>
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function ReportsSection({ loading, error, jobs, onViewReport }: { loading: boolean; error: string | null; jobs: ExecutionJob[]; onViewReport: (jobId: string) => void }) {
  const reportableJobs = jobs.filter((job) => job.result || job.artifacts.length > 0);
  const totalRuns = reportableJobs.length;
  const totalTests = reportableJobs.reduce((total, job) => total + (job.result?.total ?? 0), 0);
  const totalPassed = reportableJobs.reduce((total, job) => total + (job.result?.passed ?? 0), 0);
  const totalFailed = reportableJobs.reduce((total, job) => total + (job.result?.failed ?? 0), 0);
  const totalSkipped = reportableJobs.reduce((total, job) => total + (job.result?.skipped ?? 0), 0);
  const totalArtifacts = reportableJobs.reduce((total, job) => total + job.artifacts.length, 0);
  const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : "0.0";
  const trend = buildResultTrend(reportableJobs);
  const failures = reportableJobs.flatMap((job) => job.result?.failures.map((failure) => ({ ...failure, jobId: job.id, projectName: job.projectName })) ?? []);
  const failureGroups = groupFailures(failures);
  const slowestTests = reportableJobs
    .flatMap((job) => job.result?.tests.map((test) => ({ ...test, jobId: job.id, projectName: job.projectName })) ?? [])
    .filter((test) => typeof test.durationMs === "number")
    .sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))
    .slice(0, 5);

  return (
    <>
      <section className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-semibold tracking-tight">Reports</h2>
          <p className="mt-1.5 text-[13px] text-[var(--text-tertiary)]">Review execution outcomes, trends, failures and generated artifacts.</p>
        </div>
      </section>

      {error && <InlineAlert title="Reports unavailable" message={error} />}

      <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Runs" value={String(totalRuns)} detail="Reportable executions" icon={<Activity size={18} />} tone="neutral" />
        <MetricCard title="Pass Rate" value={`${passRate}%`} detail="Across filtered tests" icon={<CheckCircle2 size={18} />} tone="accent" />
        <MetricCard title="Failed Tests" value={String(totalFailed)} detail="Require attention" icon={<TriangleAlert size={18} />} tone="danger" />
        <MetricCard title="Artifacts" value={String(totalArtifacts)} detail="Available evidence files" icon={<Boxes size={18} />} tone="success" />
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="glass-panel rounded-[22px] border border-[var(--hairline)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.06)]">
          <div className="mb-4 border-b border-[var(--hairline)] pb-4">
            <h3 className="text-[15px] font-semibold tracking-tight">Result Trend</h3>
            <p className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">Passed, failed and skipped results over time.</p>
          </div>
          <div className="space-y-3">
            {trend.length === 0 ? (
              <div className="text-[12.5px] text-[var(--text-quaternary)]">No trend data available yet.</div>
            ) : trend.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-[12px] text-[var(--text-quaternary)]">
                  <span>{item.label}</span>
                  <span>{item.total} tests</span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-[var(--fill-quinary)]">
                  <div className="bg-[#34c759]" style={{ width: `${item.total > 0 ? (item.passed / item.total) * 100 : 0}%` }} />
                  <div className="bg-[#ff3b30]" style={{ width: `${item.total > 0 ? (item.failed / item.total) * 100 : 0}%` }} />
                  <div className="bg-[#ffcc00]" style={{ width: `${item.total > 0 ? (item.skipped / item.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel rounded-[22px] border border-[var(--hairline)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.06)]">
          <div className="mb-4 border-b border-[var(--hairline)] pb-4">
            <h3 className="text-[15px] font-semibold tracking-tight">Result Distribution</h3>
            <p className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">Global distribution within the current report set.</p>
          </div>
          <div className="space-y-3 text-[13px]">
            <DistributionRow label="Passed" value={totalPassed} total={totalTests} tone="bg-[#34c759]" />
            <DistributionRow label="Failed" value={totalFailed} total={totalTests} tone="bg-[#ff3b30]" />
            <DistributionRow label="Skipped" value={totalSkipped} total={totalTests} tone="bg-[#ffcc00]" />
          </div>
        </div>
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="glass-panel overflow-hidden rounded-[22px] border border-[var(--hairline)] shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.06)]">
          <div className="border-b border-[var(--hairline)] px-6 py-5">
            <h3 className="text-[15px] font-semibold tracking-tight">Execution Reports</h3>
            <p className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">Operational table of execution outcomes and evidence.</p>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-[13px] text-[var(--text-quaternary)]">Loading reports...</div>
          ) : reportableJobs.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <Activity size={28} className="mx-auto text-[var(--text-quinary)]" />
              <div className="mt-3 text-[14px] font-medium">No reports available</div>
              <div className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">Completed executions with results or artifacts will appear here.</div>
            </div>
          ) : (
            <div>
              <div className="hidden grid-cols-[90px_minmax(0,1.3fr)_120px_120px_70px_70px_80px_90px_120px_120px] items-center gap-3 border-b border-[var(--hairline)] bg-[var(--fill-quinary)]/60 px-6 py-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--text-quaternary)] xl:grid">
                <div>Run</div>
                <div>Project</div>
                <div>Environment</div>
                <div>Status</div>
                <div>Tests</div>
                <div>Passed</div>
                <div>Failed</div>
                <div>Duration</div>
                <div>Date</div>
                <div>Action</div>
              </div>
              <div className="divide-y divide-[var(--hairline)]">
                {reportableJobs.map((job, index) => (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => onViewReport(job.id)}
                    className="group grid w-full cursor-pointer grid-cols-1 gap-4 px-6 py-5 text-left transition duration-150 hover:bg-[var(--fill-quinary)] focus-visible:bg-[var(--fill-quinary)] xl:grid-cols-[90px_minmax(0,1.3fr)_120px_120px_70px_70px_80px_90px_120px_120px] xl:items-center xl:hover:shadow-[inset_0_0_0_1px_var(--accent-soft-border)] xl:focus-visible:shadow-[inset_0_0_0_1px_var(--accent-soft-border)]"
                    aria-label={`View report for ${job.projectName} run ${reportableJobs.length - index}`}
                  >
                    <div className="flex items-center justify-between xl:block">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--text-quaternary)] xl:hidden">Run</span>
                      <span className="text-[12px] font-semibold text-[var(--text-secondary)]">#{reportableJobs.length - index}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between gap-3 xl:block">
                        <div className="truncate text-[13px] font-semibold text-[var(--text-primary)]">{job.projectName}</div>
                        <ChevronRight size={16} className="shrink-0 text-[var(--text-quaternary)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent-strong)] group-focus-visible:translate-x-0.5 group-focus-visible:text-[var(--accent-strong)] xl:hidden" />
                      </div>
                      <div className="mt-1 truncate text-[11.5px] text-[var(--text-quaternary)]">{job.frameworks.join(", ") || "Custom command"}</div>
                    </div>
                    <ResponsiveReportCell label="Environment" value={job.environment ?? "Default"} />
                    <div className="flex items-center justify-between xl:block">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--text-quaternary)] xl:hidden">Status</span>
                      <JobStatusPill status={job.status} />
                    </div>
                    <ResponsiveReportCell label="Tests" value={String(job.result?.total ?? 0)} />
                    <ResponsiveReportCell label="Passed" value={String(job.result?.passed ?? 0)} tone="success" />
                    <ResponsiveReportCell label="Failed" value={String(job.result?.failed ?? 0)} tone="danger" />
                    <ResponsiveReportCell label="Duration" value={job.durationMs !== undefined ? `${(job.durationMs / 1000).toFixed(1)}s` : "—"} />
                    <ResponsiveReportCell label="Date" value={job.finishedAt ? formatDateTime(job.finishedAt) : "Pending"} />
                    <div className="flex items-center justify-between xl:justify-end">
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--text-quaternary)] xl:hidden">Action</span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-2 text-[11.5px] font-medium text-[var(--text-primary)] transition group-hover:border-[var(--accent-soft-border)] group-hover:bg-[var(--accent-soft-surface)] group-hover:text-[var(--accent-strong)] group-focus-visible:border-[var(--accent-soft-border)] group-focus-visible:bg-[var(--accent-soft-surface)] group-focus-visible:text-[var(--accent-strong)]">
                        View Report
                        <ChevronRight size={13} className="transition group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-panel rounded-[22px] border border-[var(--hairline)] p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.06)]">
            <h3 className="text-[15px] font-semibold tracking-tight">Failure Analysis</h3>
            <div className="mt-4 space-y-3">
              {failureGroups.length === 0 ? (
                <div className="text-[12.5px] text-[var(--text-quaternary)]">No failure groups available.</div>
              ) : failureGroups.map((group) => (
                <div key={group.key} className="rounded-[16px] border border-[var(--danger-soft-border)] bg-[var(--danger-soft-surface)] px-4 py-3">
                  <div className="text-[13px] font-semibold text-[var(--text-primary)]">{group.label}</div>
                  <div className="mt-1 text-[12px] text-[var(--badge-red-text)]">{group.count} test(s)</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-dark rounded-[22px] border p-6 shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
            <h3 className="text-[14px] font-semibold tracking-tight">Slowest Tests</h3>
            <div className="mt-4 space-y-3 text-[12.5px] text-[var(--info-panel-muted)]">
              {slowestTests.length === 0 ? (
                <div>No timing data available yet.</div>
              ) : slowestTests.map((test) => (
                <div key={`${test.jobId}-${test.id}`} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[var(--info-panel-text)]">{test.name}</div>
                    <div className="truncate text-[11.5px]">{test.projectName} · {test.suite}</div>
                  </div>
                  <div className="shrink-0 font-semibold text-[var(--info-panel-text)]">{formatDuration(test.durationMs)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ReportDetailSection({ job, origin, project, onBack, onBackToProject }: { job: ExecutionJob | null; origin: ReportOrigin; project: ProjectManifest | null; onBack: () => void; onBackToProject: () => void }) {
  const [expandedTests, setExpandedTests] = useState<string[]>([]);

  if (!job) {
    const projectScoped = origin.type === "PROJECT_RUNS";
    return (
      <>
        <div className="mb-6 flex items-center gap-3 text-[12.5px] text-[var(--text-quaternary)]">
          <button type="button" onClick={onBack} className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-medium transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-soft-surface)]">{projectScoped ? `Back to ${origin.projectName} Runs` : "Back to Reports"}</button>
          <span>{projectScoped ? "Projects" : "Reports"}</span>
          <span>›</span>
          {projectScoped && <><span>{origin.projectName}</span><span>›</span><span>Runs</span><span>›</span></>}
          <span>Run detail unavailable</span>
        </div>
        <InlineAlert title={projectScoped ? "Run not found for this project" : "Run not found"} message="The selected execution is no longer available in memory." />
      </>
    );
  }

  if (origin.type === "PROJECT_RUNS" && job.projectId !== origin.projectId) {
    return (
      <>
        <div className="mb-6 flex items-center gap-3 text-[12.5px] text-[var(--text-quaternary)]">
          <button type="button" onClick={onBack} className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-medium transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-soft-surface)]">Back to {origin.projectName} Runs</button>
          <span>Projects</span>
          <span>›</span>
          <span>{origin.projectName}</span>
          <span>›</span>
          <span>Runs</span>
        </div>
        <InlineAlert title="Run not found for this project" message="The requested execution does not belong to the current project." />
      </>
    );
  }

  const total = job.result?.total ?? 0;
  const passed = job.result?.passed ?? 0;
  const failed = job.result?.failed ?? 0;
  const skipped = job.result?.skipped ?? 0;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(0) : "0";

  function toggleTest(testId: string) {
    setExpandedTests((current) =>
      current.includes(testId)
        ? current.filter((item) => item !== testId)
        : [...current, testId],
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3 text-[12.5px] text-[var(--text-quaternary)]">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-medium transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-soft-surface)]">
          <ChevronRight size={14} className="rotate-180" />
          {origin.type === "PROJECT_RUNS" ? `Back to ${origin.projectName} Runs` : "Back to Reports"}
        </button>
        {origin.type === "PROJECT_RUNS" && (
          <button type="button" onClick={onBackToProject} className="inline-flex items-center gap-2 rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-1.5 text-[12px] font-medium transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-soft-surface)]">
            Back to Project
          </button>
        )}
        <div className="flex flex-wrap items-center gap-2 rounded-full bg-[var(--fill-quinary)] px-3 py-1.5">
          <span>{origin.type === "PROJECT_RUNS" ? "Projects" : "Reports"}</span>
          <span>/</span>
          <span>{origin.type === "PROJECT_RUNS" ? (project?.name ?? origin.projectName) : job.projectName}</span>
          {origin.type === "PROJECT_RUNS" && <><span>/</span><span>Runs</span></>}
          <span>/</span>
          <span>Run #{job.id.slice(0, 8)}</span>
        </div>
      </div>

      <section className="mb-8 glass-panel rounded-[24px] border border-[var(--hairline)] p-6 shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--hairline)] pb-5">
          <div>
            <h2 className="text-[28px] font-semibold tracking-tight">{job.projectName} / Run #{job.id.slice(0, 8)}</h2>
            <p className="mt-1.5 text-[13px] text-[var(--text-tertiary)]">{job.frameworks.join(", ")} · {job.environment ?? "default"} · {job.durationMs !== undefined ? formatDuration(job.durationMs) : "—"}</p>
          </div>
          <JobStatusPill status={job.status} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <MetadataField label="Execution ID" value={job.id} copyable />
          <MetadataField label="Project" value={job.projectName} />
          <MetadataField label="Framework" value={job.frameworks.join(", ") || "Custom command"} />
          <MetadataField label="Environment" value={job.environment ?? "Default"} />
          <MetadataField label="Triggered by" value="Unknown" />
          <MetadataField label="Branch" value="Not available" />
          <MetadataField label="Commit" value="Not available" />
          <MetadataField label="Started at" value={job.startedAt ? formatDateTime(job.startedAt) : "—"} />
          <MetadataField label="Finished at" value={job.finishedAt ? formatDateTime(job.finishedAt) : "—"} />
          <MetadataField label="Duration" value={formatDuration(job.durationMs)} />
        </div>
      </section>

      <section className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="glass-panel rounded-[24px] border border-[var(--hairline)] p-6 shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
          <div className="mb-5 border-b border-[var(--hairline)] pb-4">
            <h3 className="text-[18px] font-semibold tracking-tight">Summary</h3>
            <p className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">Normalized result view for this execution.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <MetricCard title="Total" value={String(total)} detail="Tests / scenarios" icon={<TestTube2 size={18} />} tone="neutral" />
            <MetricCard title="Passed" value={String(passed)} detail="Successful" icon={<CheckCircle2 size={18} />} tone="success" />
            <MetricCard title="Failed" value={String(failed)} detail="Need attention" icon={<TriangleAlert size={18} />} tone="danger" />
            <MetricCard title="Skipped" value={String(skipped)} detail="Not executed" icon={<ArrowRight size={18} />} tone="warning" />
            <MetricCard title="Pass Rate" value={`${passRate}%`} detail="Overall success" icon={<Activity size={18} />} tone="accent" />
          </div>
        </div>

        <div className="glass-panel rounded-[24px] border border-[var(--hairline)] p-6 shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
          <h3 className="text-[18px] font-semibold tracking-tight">Distribution</h3>
          <div className="mt-5 space-y-3">
            <DistributionRow label="Passed" value={passed} total={total} tone="bg-[#34c759]" />
            <DistributionRow label="Failed" value={failed} total={total} tone="bg-[#ff3b30]" />
            <DistributionRow label="Skipped" value={skipped} total={total} tone="bg-[#ffcc00]" />
          </div>
        </div>
      </section>

      <section className="mb-8 glass-panel overflow-hidden rounded-[24px] border border-[var(--hairline)] shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
        <div className="border-b border-[var(--hairline)] px-6 py-5">
          <h3 className="text-[18px] font-semibold tracking-tight">Test Results</h3>
          <p className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">Scenarios and tests captured for this execution.</p>
        </div>

        {!job.result || job.result.tests.length === 0 ? (
          <div className="px-6 py-12 text-[12.5px] text-[var(--text-quaternary)]">No normalized test details are available for this execution.</div>
        ) : (
          <div className="divide-y divide-[var(--hairline)]">
            {job.result.tests.map((test) => {
              const expanded = expandedTests.includes(test.id);
              const matchingFailure = job.result?.failures.find((failure) => failure.testId === test.id || failure.testName === test.name);

              return (
                <div key={test.id}>
                  <button type="button" onClick={() => toggleTest(test.id)} aria-expanded={expanded} className="group flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left transition duration-150 hover:bg-[var(--fill-quinary)] hover:shadow-[inset_0_0_0_1px_var(--accent-soft-border)] focus-visible:bg-[var(--fill-quinary)] focus-visible:shadow-[inset_0_0_0_1px_var(--accent-soft-border)]">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        {expanded ? <ChevronDown size={16} className="text-[var(--accent-strong)] transition" /> : <ChevronRight size={16} className="text-[var(--text-quaternary)] transition group-hover:text-[var(--accent-strong)] group-focus-visible:text-[var(--accent-strong)]" />}
                        <div className="truncate text-[14px] font-semibold text-[var(--text-primary)]">{test.name}</div>
                        <JobStatusPill status={mapTestStatusToJobStatus(test.status)} />
                      </div>
                      <div className="mt-2 pl-7 text-[12px] text-[var(--text-secondary)]">{job.projectName} · {test.suite}</div>
                      <div className="mt-2 flex flex-wrap gap-2 pl-7">
                        {test.tags.map((tag) => <span key={tag} className="rounded-full bg-[var(--accent-soft-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent-strong)]">{tag}</span>)}
                        {test.tags.length === 0 && <span className="text-[11px] text-[var(--text-quaternary)]">No tags</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-[12px] text-[var(--text-quaternary)]">
                      <div>{formatDuration(test.durationMs)}</div>
                      <div className="mt-1">Retries: {test.retries ?? 0}</div>
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-[var(--hairline)] bg-[var(--fill-quinary)]/45 px-6 py-5">
                      {test.steps && test.steps.length > 0 ? (
                        <div className="space-y-3">
                          <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-quaternary)]">Steps</div>
                          {test.steps.map((step: NonNullable<typeof test.steps>[number], index: number) => (
                            <div key={`${test.id}-step-${index}`} className="rounded-[16px] border border-[var(--hairline)] bg-[var(--surface)] px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-[13px] text-[var(--text-primary)]"><span className="font-semibold">{step.prefix ?? step.keyword ?? "*"}</span> {step.text ?? ""}</div>
                                <span className="text-[11px] font-semibold text-[var(--text-secondary)]">{step.status ?? "UNKNOWN"}</span>
                              </div>
                              {step.logSegments && step.logSegments.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {step.logSegments.map((segment: NonNullable<typeof step.logSegments>[number], segmentIndex: number) => (
                                    <pre key={`${test.id}-log-${segmentIndex}`} className="overflow-x-auto rounded-[12px] bg-[#1c1c1e] p-3 text-[11px] leading-5 text-[#d1d1d6] whitespace-pre-wrap">{segment.code ?? segment.text ?? ""}</pre>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-[16px] border border-[var(--hairline)] bg-[var(--surface)] px-4 py-4">
                          <div className="text-[12.5px] font-medium text-[var(--text-primary)]">Step-level results are not available for this execution.</div>
                          <div className="mt-1 text-[11.5px] text-[var(--text-quaternary)]">The native framework report may contain additional detail.</div>
                          {job.nativeReport && <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--accent-soft-border)] bg-[var(--accent-soft-surface)] px-3 py-2 text-[11.5px] font-medium text-[var(--accent-strong)]">Open Native Report</div>}
                        </div>
                      )}

                      {matchingFailure && (
                        <div className="mt-5 rounded-[16px] border border-[var(--danger-soft-border)] bg-[var(--danger-soft-surface)] px-4 py-4">
                          <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--badge-red-text)]">Failure Detail</div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <SettingsField label="Category" value={matchingFailure.category} tone="warning" />
                            <SettingsField label="Message" value={matchingFailure.message} tone="warning" />
                          </div>
                          {matchingFailure.stacktrace && <details className="mt-3 rounded-[12px] border border-[var(--danger-soft-border)] bg-[var(--surface)] p-3"><summary className="cursor-pointer text-[11.5px] font-medium text-[var(--badge-red-text)]">View stacktrace</summary><pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-[11px] leading-5 text-[var(--badge-red-text)]">{matchingFailure.stacktrace}</pre></details>}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="glass-panel rounded-[24px] border border-[var(--hairline)] p-6 shadow-[0_12px_28px_rgba(0,0,0,0.06)]">
          <h3 className="text-[18px] font-semibold tracking-tight">Artifacts</h3>
          <div className="mt-5 space-y-3">
            {job.artifacts.length === 0 ? (
              <div className="text-[12.5px] text-[var(--text-quaternary)]">No artifacts available for this execution.</div>
            ) : job.artifacts.map((artifact, index) => (
              <div key={artifact.relativePath} className="flex items-center justify-between gap-3 rounded-[16px] border border-[var(--hairline)] bg-[var(--fill-quinary)] px-4 py-3 transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-soft-surface)]">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-soft-surface)] text-[var(--accent-strong)]"><Boxes size={16} /></div>
                  <div>
                    <div className="truncate text-[13px] font-medium text-[var(--text-primary)]">{artifact.name}</div>
                    <div className="mt-1 text-[11.5px] text-[var(--text-quaternary)]">{artifact.relativePath} · {inferArtifactType(artifact.name)} · {formatBytes(artifact.sizeBytes)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`/api/executions/jobs/${job.id}/artifacts/${index}/download`} className="inline-flex items-center gap-2 rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-2 text-[11.5px] font-medium transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-soft-surface)]">
                    <Download size={13} />Download
                  </a>
                </div>
              </div>
            ))}
            {job.nativeReport && (
              <div className="rounded-[16px] border border-[var(--accent-soft-border)] bg-[var(--accent-soft-surface)] px-4 py-4">
                <div className="text-[13px] font-semibold text-[var(--accent-strong)]">Native {job.nativeReport.framework} Report</div>
                <div className="mt-1 text-[11.5px] text-[var(--text-secondary)]">Framework-generated report available.</div>
                <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--accent-soft-border)] bg-[var(--surface)] px-3 py-2 text-[11.5px] font-medium text-[var(--accent-strong)]">
                  <ExternalActionIcon />
                  {job.nativeReport.featurePath ?? job.nativeReport.reportPath}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-dark rounded-[24px] border p-6 shadow-[0_8px_24px_rgba(0,0,0,0.16)]">
          <h3 className="text-[14px] font-semibold tracking-tight">Evidence Availability</h3>
          <div className="mt-4 space-y-2 text-[12.5px] leading-6 text-[var(--info-panel-muted)]">
            <EvidenceRow label="Logs" value={job.stdout || job.stderr ? "Available" : "Not available"} available={Boolean(job.stdout || job.stderr)} />
            <EvidenceRow label="Artifacts" value={`${job.artifacts.length} available`} available={job.artifacts.length > 0} />
            <EvidenceRow label="Native report" value={job.nativeReport ? "Available" : "Not available"} available={Boolean(job.nativeReport)} />
            <EvidenceRow label="Request/Response" value={job.result?.tests.some((test) => test.steps?.some((step: NonNullable<typeof test.steps>[number]) => step.logSegments && step.logSegments.length > 0)) ? "Available in step logs" : "Not available"} available={Boolean(job.result?.tests.some((test) => test.steps?.some((step: NonNullable<typeof test.steps>[number]) => step.logSegments && step.logSegments.length > 0)))} />
          </div>
        </div>
      </section>
    </>
  );
}

function mapTestStatusToJobStatus(status: "PASSED" | "FAILED" | "SKIPPED" | "FLAKY"): ExecutionJob["status"] {
  if (status === "PASSED") {
    return "COMPLETED";
  }

  if (status === "FAILED") {
    return "ERROR";
  }

  if (status === "SKIPPED") {
    return "CANCELLED";
  }

  return "RUNNING";
}

function InlineAlert({ title, message }: { title: string; message: string }) {
  return (
    <div className="glass-panel mb-6 flex items-start gap-3 rounded-2xl border border-[#ff3b30]/25 px-5 py-4 text-[13px] text-[var(--badge-red-text)]">
      <TriangleAlert size={18} className="mt-0.5 shrink-0" />
      <div>
        <div className="font-semibold">{title}</div>
        <div className="mt-1">{message}</div>
      </div>
    </div>
  );
}

function JobStatusPill({ status }: { status: ExecutionJob["status"] }) {
  const tone = status === "COMPLETED"
    ? "text-[var(--badge-green-text)] bg-[#34c759]/10"
    : status === "ERROR"
      ? "text-[var(--badge-red-text)] bg-[#ff3b30]/10"
      : status === "CANCELLED"
        ? "text-[var(--text-tertiary)] bg-[var(--fill-secondary)]"
        : "text-[var(--accent-strong)] bg-[var(--accent-soft-surface)]";

  return <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${tone}`}>{status.replace("_", " ")}</span>;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(value?: number) {
  if (value === undefined) {
    return "—";
  }

  if (value < 1000) {
    return `${value}ms`;
  }

  return `${(value / 1000).toFixed(1)}s`;
}

function buildResultTrend(jobs: ExecutionJob[]) {
  const grouped = new Map<string, { label: string; passed: number; failed: number; skipped: number; total: number }>();

  for (const job of jobs) {
    const referenceDate = job.finishedAt ?? job.startedAt;
    if (!referenceDate || !job.result) {
      continue;
    }

    const label = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(referenceDate));

    const current = grouped.get(label) ?? { label, passed: 0, failed: 0, skipped: 0, total: 0 };
    current.passed += job.result.passed;
    current.failed += job.result.failed;
    current.skipped += job.result.skipped;
    current.total += job.result.total;
    grouped.set(label, current);
  }

  return [...grouped.values()].slice(-7);
}

function groupFailures(failures: Array<{ category: string; message: string }>) {
  const grouped = new Map<string, { key: string; label: string; count: number }>();

  for (const failure of failures) {
    const key = `${failure.category}:${failure.message}`;
    const current = grouped.get(key) ?? {
      key,
      label: failure.message.length > 64 ? `${failure.message.slice(0, 61)}...` : failure.message,
      count: 0,
    };
    current.count += 1;
    grouped.set(key, current);
  }

  return [...grouped.values()].sort((a, b) => b.count - a.count).slice(0, 5);
}

function DistributionRow({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const percent = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="rounded-[16px] border border-[var(--hairline)] bg-[var(--fill-quinary)] px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-[12px]">
        <span className="font-medium text-[var(--text-secondary)]">{label}</span>
        <div className="flex items-center gap-3 text-[var(--text-quaternary)]">
          <span>{value}</span>
          <span>{percent.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[var(--fill-quinary)]">
        <div className={`h-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function isSameLocalDay(value?: string) {
  if (!value) {
    return false;
  }

  const date = new Date(value);
  const now = new Date();

  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function EvidenceRow({ label, value, available }: { label: string; value: string; available: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[14px] border border-white/8 bg-white/3 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${available ? "bg-[#34c759]" : "bg-[var(--text-quinary)]"}`} />
        <span className="text-[12px] text-[var(--info-panel-text)]">{label}</span>
      </div>
      <span className="text-[11.5px] text-[var(--info-panel-muted)]">{value}</span>
    </div>
  );
}

function inferArtifactType(name: string) {
  const normalized = name.toLowerCase();

  if (normalized.endsWith(".zip")) {
    return "ZIP";
  }

  if (normalized.endsWith(".html")) {
    return "HTML";
  }

  if (normalized.endsWith(".xml")) {
    return "JUnit XML";
  }

  if (normalized.endsWith(".json")) {
    return "JSON";
  }

  if (normalized.endsWith(".log") || normalized.endsWith(".txt")) {
    return "Log";
  }

  return "Artifact";
}

function ExternalActionIcon() {
  return <ArrowRight size={13} />;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function InputField({ label, value, onChange, placeholder, type = "text", icon }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; icon?: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)]">
        {icon}
        {label}
      </div>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} className="w-full rounded-[14px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-3 text-[13px] outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[var(--accent-soft-border)]" />
    </label>
  );
}

function ProjectRow({ project, onPrepareExecution, onSelectProject }: { project: ProjectManifest; onPrepareExecution: (projectId: string, selection: ExecutionSelection) => void; onSelectProject: (projectId: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-5 transition hover:bg-[var(--fill-quinary)] cursor-pointer" onClick={() => onSelectProject(project.id)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-[14px] font-semibold tracking-tight">{project.name}</div>
          <span className="rounded-full bg-[var(--fill-tertiary)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{project.inspectionStatus}</span>
        </div>
        <div className="mt-1 truncate text-[12.5px] text-[var(--text-quaternary)]">{project.source.location}</div>
      </div>
      <button type="button" onClick={(e) => { e.stopPropagation(); onPrepareExecution(project.id, { type: "ALL" }); }} className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-2 text-[12.5px] font-medium text-[var(--text-primary)] transition hover:border-[var(--accent-soft-border)] hover:bg-[var(--accent-soft-surface)]">Run</button>
    </div>
  );
}

export default App;
