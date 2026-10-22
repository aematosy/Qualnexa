import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  Boxes,
  CheckCircle2,
  FolderGit2,
  Gauge,
  History,
  Moon,
  Play,
  Settings,
  Sun,
  Tags,
  TestTube2,
  TriangleAlert,
  LogIn,
  UserCircle2,
  Sparkles,
  Mail,
  ShieldCheck,
  KeyRound,
  ChevronDown,
  Loader2,
  LogOut,
  UserPlus,
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

function App() {
  const [addProjectOpen, setAddProjectOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectManifest[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlan | null>(null);
  const [executionLoading, setExecutionLoading] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
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
  const [oauthConfig, setOAuthConfig] = useState<{ google: { enabled: boolean; clientId: string }; github: { enabled: boolean; clientId: string } } | null>(null);

  useTheme();

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
  }, []);

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
      // Use clientId from config if available, otherwise use default placeholder
      const clientId = oauthConfig?.google.clientId || "YOUR_GOOGLE_CLIENT_ID";
      const redirectUri = `${window.location.origin}/api/auth/oauth/google/callback`;
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
      const redirectUri = `${window.location.origin}/api/auth/oauth/github/callback`;
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

  return (
    <>
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
              <SidebarItem icon={<Gauge size={17} />} label="Dashboard" active />
              <SidebarItem icon={<FolderGit2 size={17} />} label="Projects" />
              <SidebarItem icon={<Play size={17} />} label="Executions" />
              <SidebarItem icon={<Boxes size={17} />} label="Environments" />
              <SidebarItem icon={<History size={17} />} label="History" />
              <SidebarItem icon={<Activity size={17} />} label="Reports" />
              <div className="my-3 h-px bg-[var(--fill-quaternary)]" />
              <SidebarItem icon={<Settings size={17} />} label="Settings" />
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
                  className="flex items-center gap-3 rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-2 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:bg-[var(--fill-quinary)]"
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
              <section className="mb-8 flex items-end justify-between">
                <div>
                  <h2 className="text-[28px] font-semibold tracking-tight">Automation Overview</h2>
                  <p className="mt-1.5 text-[13px] text-[var(--text-tertiary)]">Discover, validate and execute automation projects from one place.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setAddProjectOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-[#0a84ff] px-5 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(10,132,255,0.4)] transition hover:bg-[#0074e8] active:scale-[0.97]"
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

              <section className="mb-8 grid grid-cols-4 gap-4">
                <MetricCard title="Projects" value={String(metrics.projects)} detail="Registered projects" icon={<FolderGit2 size={18} />} />
                <MetricCard title="Test Containers" value={String(metrics.containers)} detail="Features, specs, modules..." icon={<TestTube2 size={18} />} />
                <MetricCard title="Tests" value={String(metrics.tests)} detail="Discovered executable tests" icon={<Play size={18} />} />
                <MetricCard title="Labels" value={String(metrics.labels)} detail="Tags, markers and labels" icon={<Tags size={18} />} />
              </section>

              <section className="grid grid-cols-[1fr_360px] gap-6">
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
                        onPrepareExecution={configureExecution}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <EnvironmentDoctorPanel />

                  <div className="glass-dark rounded-[22px] border border-white/10 p-6 text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
                    <h3 className="text-[14px] font-semibold tracking-tight">Quick execution</h3>
                    <p className="mt-2 text-[12.5px] leading-6 text-white/60">Use "Run" on a project to configure and execute it.</p>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      {profileOpen && (
        <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/20 px-4 py-4 backdrop-blur-sm" onClick={() => setProfileOpen(false)}>
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

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button type="button" className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-[13px] transition ${active ? "bg-[var(--fill-quaternary)] font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--fill-quinary)] hover:text-[var(--text-primary)]"}`}>
      <span className={active ? "text-[#0a84ff]" : "text-[var(--text-quaternary)]"}>{icon}</span>
      {label}
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

function MetricCard({ title, value, detail, icon }: { title: string; value: string; detail: string; icon: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-[22px] border border-[var(--hairline)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.05)]">
      <div className="mb-4 flex items-center justify-between text-[var(--text-quaternary)]">
        <span className="text-[12.5px] font-medium">{title}</span>
        {icon}
      </div>
      <div className="text-[28px] font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-[12.5px] text-[var(--text-quaternary)]">{detail}</div>
    </div>
  );
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
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} className="w-full rounded-[14px] border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-3 text-[13px] outline-none transition focus:border-[#0a84ff] focus:ring-2 focus:ring-[#0a84ff]/25" />
    </label>
  );
}

function ProjectRow({ project, onPrepareExecution }: { project: ProjectManifest; onPrepareExecution: (projectId: string, selection: ExecutionSelection) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-5 transition hover:bg-[var(--fill-quinary)]">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-[14px] font-semibold tracking-tight">{project.name}</div>
          <span className="rounded-full bg-[var(--fill-tertiary)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{project.inspectionStatus}</span>
        </div>
        <div className="mt-1 truncate text-[12.5px] text-[var(--text-quaternary)]">{project.source.location}</div>
      </div>
      <button type="button" onClick={() => onPrepareExecution(project.id, { type: "ALL" })} className="rounded-full border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-2 text-[12.5px] font-medium text-[var(--text-primary)] transition hover:bg-[var(--fill-quinary)]">Run</button>
    </div>
  );
}

export default App;
