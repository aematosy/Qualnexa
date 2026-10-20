import type {
  FastifyInstance,
} from "fastify";

import {
  z,
} from "zod";

import type {
  ProjectInspectionService,
} from "../core/inspection/project-inspection-service.js";

import {
  listProjects,
  saveProject,
} from "../core/project/project-store.js";

const inspectSchema =
  z.object({
    name:
      z.string()
        .min(1),

    sourceType:
      z.literal(
        "LOCAL_PATH",
      ),

    location:
      z.string()
        .min(1),

    provider:
      z.string()
        .optional(),

    branch:
      z.string()
        .optional(),

    commit:
      z.string()
        .optional(),
  });

export async function projectRoutes(
  app: FastifyInstance,
  inspectionService:
    ProjectInspectionService,
): Promise<void> {

  app.get(
    "/api/projects",
    async () => {
      return listProjects();
    },
  );

  app.post(
    "/api/projects/inspect",
    async (
      request,
      reply,
    ) => {

      const parsed =
        inspectSchema.safeParse(
          request.body,
        );

      if (!parsed.success) {
        return reply
          .code(400)
          .send({
            message:
              "Invalid project inspection request.",
            issues:
              parsed.error.issues,
          });
      }

      try {
        const manifest =
          await inspectionService.inspect(
            parsed.data.name,
            {
              type:
                parsed.data.sourceType,

              location:
                parsed.data.location,

              provider:
                parsed.data.provider,

              branch:
                parsed.data.branch,

              commit:
                parsed.data.commit,
            },
          );

        saveProject(
          manifest,
        );

        return manifest;
      } catch (error) {
        return reply
          .code(400)
          .send({
            message:
              error instanceof Error
                ? error.message
                : "Project inspection failed.",
          });
      }
    },
  );
}
