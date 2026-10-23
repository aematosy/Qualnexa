import type {
  FastifyInstance,
} from "fastify";

import {
  stat,
} from "node:fs/promises";

import {
  MAX_UPLOAD_FILE_COUNT,
  MAX_UPLOAD_FILE_SIZE_BYTES,
} from "../config/upload-limits.js";

import {
  ARTIFACTS_ROOT,
} from "../config/artifacts-dir.js";

import {
  getAllowedRoots,
  isUnrestricted,
} from "../config/allowed-roots.js";

import {
  runDoctor,
} from "../environment/doctor-service.js";

function maskClientId(
  value: string,
): string {

  if (value.length <= 8) {
    return "*".repeat(value.length);
  }

  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

function readAuthProviders() {
  return {
    google: {
      enabled: Boolean(
        process.env.GOOGLE_CLIENT_ID?.trim(),
      ),
      clientIdMasked: process.env.GOOGLE_CLIENT_ID?.trim()
        ? maskClientId(
            process.env.GOOGLE_CLIENT_ID.trim(),
          )
        : null,
      redirectUri: process.env.GOOGLE_REDIRECT_URI?.trim() ?? null,
      status: process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
        ? "Configured"
        : "Not configured",
    },
    github: {
      enabled: Boolean(
        process.env.GITHUB_CLIENT_ID?.trim(),
      ),
      clientIdMasked: process.env.GITHUB_CLIENT_ID?.trim()
        ? maskClientId(
            process.env.GITHUB_CLIENT_ID.trim(),
          )
        : null,
      redirectUri: process.env.GITHUB_REDIRECT_URI?.trim() ?? null,
      status: process.env.GITHUB_CLIENT_ID?.trim() && process.env.GITHUB_CLIENT_SECRET?.trim()
        ? "Configured"
        : "Not configured",
    },
    email: {
      provider: "Resend",
      fromAddress: process.env.EMAIL_FROM?.trim() ?? null,
      status: process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim()
        ? "Configured"
        : "Not configured",
    },
    local: {
      enabled: true,
      status: "Configured",
    },
  };
}

export async function settingsRoutes(
  app: FastifyInstance,
): Promise<void> {

  app.get(
    "/api/settings/summary",
    async () => {
      const allowedRoots = getAllowedRoots();
      const doctor = await runDoctor();
      const backendUrl = `http://${process.env.HOST ?? "127.0.0.1"}:${process.env.PORT ?? "8080"}`;
      const frontendUrl = process.env.FRONTEND_URL ?? "http://127.0.0.1:5173";

      const validatedRoots = await Promise.all(
        allowedRoots.map(
          async (root) => {
            try {
              await stat(root);
              return {
                path: root,
                exists: true,
              };
            } catch {
              return {
                path: root,
                exists: false,
              };
            }
          },
        ),
      );

      return {
        general: {
          workspaceName: "Qualnexa",
          description: "Framework-agnostic automation execution workspace",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: "en-US",
          dateTimeFormat: "MMM d, yyyy h:mm a",
          frontendUrl,
          backendUrl,
          backendStatus: "Connected",
          version: "0.1.0",
        },
        profile: {
          sessionDurationMinutes: 15,
          emailVerificationRequired: true,
        },
        integrations: readAuthProviders(),
        execution: {
          defaultTimeoutMinutes: 30,
          processKillGracePeriodSeconds: 5,
          maximumConcurrentExecutions: 1,
          maximumConcurrentProjects: 1,
          retryPolicy: {
            enabled: false,
            maxRetries: 0,
            onlyTechnicalFailures: true,
          },
        },
        projectAccess: {
          allowedRoots: validatedRoots,
          unrestricted: isUnrestricted(),
        },
        storage: {
          uploadDirectory: "system temporary directory",
          maxUploadZipBytes: MAX_UPLOAD_FILE_SIZE_BYTES,
          maxUploadFileCount: MAX_UPLOAD_FILE_COUNT,
          artifactDirectory: ARTIFACTS_ROOT,
        },
        runtimes: doctor,
        appearance: {
          supportedModes: [
            "light",
            "dark",
            "system",
          ],
          defaultMode: "system",
        },
        diagnostics: {
          backendStatus: "UP",
          filesystemPermissions: isUnrestricted()
            ? "UNRESTRICTED"
            : "RESTRICTED",
          storageAccess: "AVAILABLE",
          runtimeCheckGeneratedAt: doctor.generatedAt,
        },
      };
    },
  );

  app.post(
    "/api/settings/integrations/email/test",
    async (_request, reply) => {
      const configured = Boolean(
        process.env.RESEND_API_KEY?.trim() &&
        process.env.EMAIL_FROM?.trim(),
      );

      if (!configured) {
        return reply.code(400).send({
          message: "Email provider is not configured.",
        });
      }

      return {
        message: "Email provider configuration looks valid. Test delivery is not implemented yet.",
      };
    },
  );
}
