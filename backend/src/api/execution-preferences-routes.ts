import type {
  FastifyInstance,
} from "fastify";

import {
  z,
} from "zod";

import {
  getProject,
} from "../core/project/project-store.js";

import {
  getExecutionPreferences,
  saveExecutionPreferences,
} from "../core/execution/execution-preferences-store.js";

const customCommandSchema =
  z.object({
    executable:
      z.string()
        .min(1),

    arguments:
      z.array(
        z.string(),
      )
        .default([]),

    workingDirectory:
      z.string()
        .optional(),

    environment:
      z.record(
        z.string(),
        z.string(),
      )
        .optional(),

    timeoutMinutes:
      z.number()
        .positive()
        .optional(),
  });

const preferencesSchema =
  z.object({
    jdkPath:
      z.string()
        .min(1)
        .optional()
        .nullable(),

    customCommand:
      customCommandSchema
        .optional()
        .nullable(),
  });

export async function executionPreferencesRoutes(
  app: FastifyInstance,
): Promise<void> {

  app.get(
    "/api/projects/:id/execution-preferences",
    async (
      request,
      reply,
    ) => {

      const { id } =
        request.params as {
          id: string;
        };

      const project =
        getProject(id);

      if (!project) {
        return reply
          .code(404)
          .send({
            message:
              "Project not found.",
          });
      }

      return (
        getExecutionPreferences(id) ?? {
          projectId: id,
        }
      );
    },
  );

  app.put(
    "/api/projects/:id/execution-preferences",
    async (
      request,
      reply,
    ) => {

      const { id } =
        request.params as {
          id: string;
        };

      const project =
        getProject(id);

      if (!project) {
        return reply
          .code(404)
          .send({
            message:
              "Project not found.",
          });
      }

      const parsed =
        preferencesSchema.safeParse(
          request.body,
        );

      if (!parsed.success) {
        return reply
          .code(400)
          .send({
            message:
              "Invalid execution preferences.",

            issues:
              parsed.error.issues,
          });
      }

      return saveExecutionPreferences({
        projectId: id,

        jdkPath:
          parsed.data.jdkPath ??
          undefined,

        customCommand:
          parsed.data.customCommand ??
          undefined,
      });
    },
  );
}
