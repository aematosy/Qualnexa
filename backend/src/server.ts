try {
  process.loadEnvFile();
} catch {
  // No .env file present; rely on externally provided environment variables.
}

import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import cookie from "@fastify/cookie";
import { randomUUID } from "node:crypto";
import * as bcrypt from "bcrypt";

import {
  filesystemRoutes,
} from "./api/filesystem-routes.js";

import {
  registerOAuthRoutes,
} from "./api/oauth-routes.js";

import {
  projectRoutes,
} from "./api/project-routes.js";

import {
  uploadRoutes,
} from "./api/upload-routes.js";

import {
  executionRoutes,
} from "./api/execution-routes.js";

import {
  ProjectInspectionService,
} from "./core/inspection/project-inspection-service.js";

import {
  LocalPathSourceResolver,
} from "./sources/local-path-source-resolver.js";

import {
  LocalUploadSourceResolver,
} from "./sources/local-upload-source-resolver.js";

import {
  MAX_UPLOAD_FILE_COUNT,
  MAX_UPLOAD_FILE_SIZE_BYTES,
} from "./config/upload-limits.js";

import {
  JavaRuntimeDetector,
} from "./adapters/runtimes/java-runtime-detector.js";

import {
  NodeRuntimeDetector,
} from "./adapters/runtimes/node-runtime-detector.js";

import {
  PythonRuntimeDetector,
} from "./adapters/runtimes/python-runtime-detector.js";

import {
  MavenBuildToolDetector,
} from "./adapters/build-tools/maven-build-tool-detector.js";

import {
  GradleBuildToolDetector,
} from "./adapters/build-tools/gradle-build-tool-detector.js";

import {
  NodeBuildToolDetector,
} from "./adapters/build-tools/node-build-tool-detector.js";

import {
  PythonBuildToolDetector,
} from "./adapters/build-tools/python-build-tool-detector.js";

import {
  SerenityFrameworkAdapter,
} from "./adapters/frameworks/serenity-framework-adapter.js";

import {
  KarateFrameworkAdapter,
} from "./adapters/frameworks/karate-framework-adapter.js";

import {
  PlaywrightFrameworkAdapter,
} from "./adapters/frameworks/playwright-framework-adapter.js";

import {
  PytestFrameworkAdapter,
} from "./adapters/frameworks/pytest-framework-adapter.js";

import {
  MavenExecutionProfileDetector,
} from "./adapters/execution/maven/maven-execution-profile-detector.js";

import {
  SerenityExecutionParameterResolver,
} from "./adapters/execution/serenity/serenity-execution-parameter-resolver.js";

import {
  KarateExecutionParameterResolver,
} from "./adapters/execution/karate/karate-execution-parameter-resolver.js";

import {
  MavenExecutionRecipeProvider,
} from "./adapters/execution/maven/maven-execution-recipe-provider.js";

import {
  MavenBuildCommandAdapter,
} from "./adapters/execution/maven/maven-build-command-adapter.js";

import {
  GradleExecutionRecipeProvider,
} from "./adapters/execution/gradle/gradle-execution-recipe-provider.js";

import {
  GradleBuildCommandAdapter,
} from "./adapters/execution/gradle/gradle-build-command-adapter.js";

import {
  KarateSelectionStrategy,
} from "./adapters/execution/karate/karate-selection-strategy.js";

import {
  ExecutionService,
} from "./core/execution/execution-service.js";

import {
  NodeProcessExecutor,
} from "./infrastructure/process/node-process-executor.js";

import {
  environmentRoutes,
} from "./api/environment-routes.js";

import {
  executionPreferencesRoutes,
} from "./api/execution-preferences-routes.js";

const authUsers = new Map<string, { email: string; name?: string | undefined; verified?: boolean; passwordHash?: string; provider?: "LOCAL" | "GOOGLE" | "GITHUB" }>();
const authSessions = new Map<string, string>();
const verificationTokens = new Map<string, { userId: string; expiresAt: number }>();
const mailOutbox = new Map<string, { to: string; subject: string; text: string; html: string; createdAt: string }>();
const loginAttempts = new Map<string, { count: number; expiresAt: number }>();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5; // max 5 attempts per window
const BCRYPT_ROUNDS = 10;

const app =
  Fastify({
    logger: true,
  });

await app.register(
  cors,
  {
    origin: true,
    credentials: true,
  },
);

await app.register(
  cookie,
);

await app.register(
  multipart,
  {
    limits: {
      fileSize:
        MAX_UPLOAD_FILE_SIZE_BYTES,

      files:
        MAX_UPLOAD_FILE_COUNT,
    },
  },
);

// Rate limiting helper
function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const attempt = loginAttempts.get(identifier);
  
  if (!attempt || attempt.expiresAt < now) {
    loginAttempts.set(identifier, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (attempt.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }
  
  attempt.count++;
  return true;
}

// Password utilities
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

const inspectionService =
  new ProjectInspectionService(
    [
      new LocalPathSourceResolver(),
      new LocalUploadSourceResolver(),
    ],

    [
      new JavaRuntimeDetector(),
      new NodeRuntimeDetector(),
      new PythonRuntimeDetector(),
    ],

    [
      new MavenBuildToolDetector(),
      new GradleBuildToolDetector(),
      new NodeBuildToolDetector(),
      new PythonBuildToolDetector(),
    ],

    [
      new SerenityFrameworkAdapter(),
      new KarateFrameworkAdapter(),
      new PlaywrightFrameworkAdapter(),
      new PytestFrameworkAdapter(),
    ],

    [
      new MavenExecutionProfileDetector(
        [
          new SerenityExecutionParameterResolver(),
          new KarateExecutionParameterResolver(),
        ],
      ),
    ],
  );

const executionService =
  new ExecutionService(
    [
      new MavenExecutionRecipeProvider(
        [
          new KarateSelectionStrategy(),
        ],
      ),

      new GradleExecutionRecipeProvider(
        [
          new KarateSelectionStrategy(),
        ],
      ),
    ],

    [
      new MavenBuildCommandAdapter(),
      new GradleBuildCommandAdapter(),
    ],

    new NodeProcessExecutor(),
  );

app.get(
  "/api/auth/me",
  async (request, reply) => {
    const sessionId = request.cookies.sessionId;

    if (!sessionId) {
      return reply.code(401).send({ message: "Not authenticated." });
    }

    const userId = authSessions.get(sessionId);
    if (!userId) {
      return reply.code(401).send({ message: "Not authenticated." });
    }

    const user = authUsers.get(userId);
    if (!user) {
      return reply.code(401).send({ message: "Not authenticated." });
    }

    return { user: { email: user.email, name: user.name, verified: user.verified } };
  },
);

function queueVerificationEmail(userId: string, email: string) {
  const token = randomUUID();
  verificationTokens.set(token, { userId, expiresAt: Date.now() + 1000 * 60 * 60 * 24 });

  const verificationLink = `http://${host}:${port}/api/auth/verify-email?token=${token}`;
  const subject = "Activate your Qualnexa account";
  const text = `Activate your account: ${verificationLink}`;
  const html = `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#1d1d1f"><h2 style="margin:0 0 12px">Activate your account</h2><p style="margin:0 0 16px">Confirm your email to finish creating your Qualnexa account.</p><p style="margin:0 0 20px"><a href="${verificationLink}" style="display:inline-block;background:#0a84ff;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:600">Activate account</a></p><p style="margin:0;color:#6e6e73;font-size:12px">If you did not create this account, ignore this email.</p></div>`;

  mailOutbox.set(email, { to: email, subject, text, html, createdAt: new Date().toISOString() });
  app.log.info({ to: email, verificationLink }, "verification email queued");
  return { token, verificationLink };
}

async function sendVerificationEmail(email: string, verificationLink: string) {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  if (!resendApiKey || !from) {
    return { mode: "local" as const, verificationLink };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Activate your Qualnexa account",
      html: `<div style="font-family:system-ui,sans-serif;line-height:1.6;color:#1d1d1f"><h2 style="margin:0 0 12px">Activate your account</h2><p style="margin:0 0 16px">Confirm your email to finish creating your Qualnexa account.</p><p style="margin:0 0 20px"><a href="${verificationLink}" style="display:inline-block;background:#0a84ff;color:#fff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:600">Activate account</a></p><p style="margin:0;color:#6e6e73;font-size:12px">If you did not create this account, ignore this email.</p></div>`,
      text: `Activate your account: ${verificationLink}`,
    }),
  });

  if (!response.ok) {
    return { mode: "fallback" as const, verificationLink };
  }

  return { mode: "resend" as const, verificationLink };
}

if (process.env.NODE_ENV !== "production") {
  app.get(
    "/api/auth/dev-mailbox",
    async () => Array.from(mailOutbox.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

app.post(
  "/api/auth/register",
  async (request, reply) => {
    const body = request.body as { name?: string; email?: string; password?: string };
    if (!body?.email || !body.password) {
      return reply.code(400).send({ message: "Email and password are required." });
    }

    const email = body.email.trim().toLowerCase();
    if (body.password.length < 10) {
      return reply.code(400).send({ message: "Password must be at least 10 characters long." });
    }

    if (!body.name || body.name.trim().length === 0) {
      return reply.code(400).send({ message: "Name is required." });
    }

    if (body.name.trim().length > 100) {
      return reply.code(400).send({ message: "Name must be 100 characters or less." });
    }

    // Rate limiting check
    if (!checkRateLimit(`register:${email}`)) {
      return reply.code(429).send({ message: "Too many registration attempts. Please try again later." });
    }

    const existing = [...authUsers.values()].find((user) => user.email === email);
    if (existing) {
      return reply.code(409).send({ message: "An account with this email already exists." });
    }

    const id = randomUUID();
    const passwordHash = await hashPassword(body.password);
    authUsers.set(id, { email, name: body.name.trim(), verified: false, passwordHash, provider: "LOCAL" });

    const { verificationLink } = queueVerificationEmail(id, email);
    const emailResult = await sendVerificationEmail(email, verificationLink);
    return { user: { email, name: body.name.trim(), verified: false }, verificationRequired: true, message: emailResult.mode === "resend" ? "Check your inbox to activate your account." : "Check the local dev mailbox to activate your account.", verificationLink: emailResult.verificationLink, deliveryMode: emailResult.mode };
  },
);

app.post(
  "/api/auth/login",
  async (request, reply) => {
    const body = request.body as { email?: string; password?: string };
    if (!body?.email || !body.password) {
      return reply.code(400).send({ message: "Email and password are required." });
    }

    const email = body.email.trim().toLowerCase();
    
    // Rate limiting check
    if (!checkRateLimit(`login:${email}`)) {
      return reply.code(429).send({ message: "Too many login attempts. Please try again later." });
    }

    const userEntry = [...authUsers.entries()].find(([, user]) => user.email === email && user.provider === "LOCAL");
    if (!userEntry) {
      return reply.code(401).send({ message: "Invalid credentials." });
    }

    const [userId, user] = userEntry;
    const passwordMatch = user.passwordHash ? await verifyPassword(body.password, user.passwordHash) : false;
    
    if (!passwordMatch) {
      return reply.code(401).send({ message: "Invalid credentials." });
    }

    if (!user.verified) {
      return reply.code(403).send({ message: "Verify your email before signing in." });
    }

    const sessionId = randomUUID();
    authSessions.set(sessionId, userId);
    reply.setCookie("sessionId", sessionId, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    return { user: { email: user.email, name: user.name, verified: user.verified } };
  },
);

app.post(
  "/api/auth/logout",
  async (request, reply) => {
    const sessionId = request.cookies.sessionId;
    if (sessionId) authSessions.delete(sessionId);
    reply.clearCookie("sessionId", { path: "/" });
    return { ok: true };
  },
);

app.get(
  "/api/auth/oauth-config",
  async () => {
    return {
      google: {
        enabled: !!process.env.GOOGLE_CLIENT_ID?.trim(),
        clientId: process.env.GOOGLE_CLIENT_ID?.trim() || "",
      },
      github: {
        enabled: !!process.env.GITHUB_CLIENT_ID?.trim(),
        clientId: process.env.GITHUB_CLIENT_ID?.trim() || "",
      },
    };
  },
);

// OAuth routes will be registered separately
await registerOAuthRoutes(app, { authUsers, authSessions, BCRYPT_ROUNDS });

app.get(
  "/api/auth/verify-email",
  async (request, reply) => {
    const token = (request.query as { token?: string }).token;
    if (!token) {
      return reply.code(400).send({ message: "Missing verification token." });
    }

    const record = verificationTokens.get(token);
    if (!record || record.expiresAt < Date.now()) {
      return reply.code(400).send({ message: "Verification token expired." });
    }

    const user = authUsers.get(record.userId);
    if (!user) {
      return reply.code(404).send({ message: "Account not found." });
    }

    user.verified = true;
    verificationTokens.delete(token);
    const sessionId = randomUUID();
    authSessions.set(sessionId, record.userId);
    reply.setCookie("sessionId", sessionId, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });

    const redirectUrl = new URL("/login", frontendUrl);
    redirectUrl.searchParams.set("verified", "true");

    return reply.redirect(redirectUrl.toString());
  },
);

app.post(
  "/api/auth/resend-verification",
  async (request, reply) => {
    const body = request.body as { email?: string };
    if (!body?.email) {
      return reply.code(400).send({ message: "Email is required." });
    }

    const email = body.email.trim().toLowerCase();
    const userEntry = [...authUsers.entries()].find(([, user]) => user.email === email);
    if (!userEntry) {
      return reply.code(404).send({ message: "Account not found." });
    }

    const [userId, user] = userEntry;
    if (user.verified) {
      return reply.send({ message: "Account already verified." });
    }

    const { verificationLink } = queueVerificationEmail(userId, email);
    const emailResult = await sendVerificationEmail(email, verificationLink);
    return { message: emailResult.mode === "resend" ? "Verification link sent again." : "Check the local dev mailbox.", verificationLink: emailResult.verificationLink, deliveryMode: emailResult.mode };
  },
);

app.get(
  "/api/platform/status",
  async () => ({
    name:
      "Test Automation Execution Platform",

    status:
      "UP",

    runtime: {
      type:
        "NODE",

      version:
        process.version,
    },
  }),
);

await app.register(
  filesystemRoutes,
);

await projectRoutes(
  app,
  inspectionService,
);

await uploadRoutes(
  app,
  inspectionService,
);

await executionRoutes(
  app,
  executionService,
);

await environmentRoutes(
  app,
);

await executionPreferencesRoutes(
  app,
);

const port =
  Number(
    process.env.PORT ??
    8080,
  );

const host =
  process.env.HOST ??
  "127.0.0.1";

const frontendUrl =
  process.env.FRONTEND_URL ??
  "http://127.0.0.1:5173";

try {
  await app.listen({
    port,
    host,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
