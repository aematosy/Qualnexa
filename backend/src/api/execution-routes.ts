import {
  createReadStream,
} from "node:fs";

import {
  stat,
} from "node:fs/promises";

import {
  join,
} from "node:path";

import type {
  FastifyInstance,
} from "fastify";

import {
  z,
} from "zod";

import {
  ExecutionPlanner,
} from "../core/execution/execution-planner.js";

import type {
  ExecutionRequest,
} from "../core/execution/model.js";

import {
  ExecutionService,
} from "../core/execution/execution-service.js";

import {
  getProject,
} from "../core/project/project-store.js";

import {
  getExecutionJob,
  getExecutionPlan,
  listExecutionJobs,
  saveExecutionPlan,
} from "../core/execution/execution-store.js";

import {
  getExecutionPreferences,
} from "../core/execution/execution-preferences-store.js";

import {
  artifactsDirectoryFor,
} from "../config/artifacts-dir.js";

const selectionSchema =
  z.discriminatedUnion(
    "type",
    [
      z.object({
        type:
          z.literal("ALL"),
      }),

      z.object({
        type:
          z.literal(
            "CONTAINER",
          ),

        containerId:
          z.string()
            .min(1),
      }),

      z.object({
        type:
          z.literal(
            "TESTS",
          ),

        testIds:
          z.array(
            z.string(),
          )
            .min(1),
      }),

      z.object({
        type:
          z.literal(
            "LABELS",
          ),

        labels:
          z.array(
            z.string(),
          )
            .min(1),

        labelMatch:
          z.enum([
            "ANY",
            "ALL",
          ])
            .default("ANY"),

        containerId:
          z.string()
            .min(1)
            .optional(),
      }),
    ],
  );

const requestSchema =
  z.object({
    projectId:
      z.string()
        .min(1),

    selection:
      selectionSchema,

    environment:
      z.string()
        .optional(),

    parameters:
      z.record(
        z.string(),
        z.union([
          z.string(),
          z.number(),
          z.boolean(),
        ]),
      )
        .optional(),
  });

const startJobSchema =
  z.object({
    planId:
      z.string()
        .min(1),
  });

export async function executionRoutes(
  app: FastifyInstance,
  executionService:
    ExecutionService,
): Promise<void> {

  const planner =
    new ExecutionPlanner();

  app.post(
    "/api/executions/plan",
    async (
      request,
      reply,
    ) => {

      const parsed =
        requestSchema.safeParse(
          request.body,
        );

      if (!parsed.success) {
        return reply
          .code(400)
          .send({
            message:
              "Invalid execution request.",

            issues:
              parsed.error.issues,
          });
      }

      const project =
        getProject(
          parsed.data.projectId,
        );

      if (!project) {
        return reply
          .code(404)
          .send({
            message:
              "Project not found.",
          });
      }

      try {
        const executionRequest:
          ExecutionRequest = {
            projectId:
              parsed.data.projectId,

            selection:
              parsed.data.selection,

            environment:
              parsed.data.environment,

            parameters:
              parsed.data.parameters,
          };

        const preferences =
          getExecutionPreferences(
            project.id,
          );

        const plan =
          planner.createPlan(
            project,
            executionRequest,
            {
              hasCustomCommand:
                Boolean(
                  preferences?.customCommand,
                ),
            },
          );

        saveExecutionPlan(
          plan,
        );

        return plan;

      } catch (error) {
        return reply
          .code(400)
          .send({
            message:
              error instanceof Error
                ? error.message
                : "Unable to create execution plan.",
          });
      }
    },
  );

  app.post(
    "/api/executions/jobs",
    async (
      request,
      reply,
    ) => {

      const parsed =
        startJobSchema.safeParse(
          request.body,
        );

      if (!parsed.success) {
        return reply
          .code(400)
          .send({
            message:
              "Invalid job request.",

            issues:
              parsed.error.issues,
          });
      }

      const plan =
        getExecutionPlan(
          parsed.data.planId,
        );

      if (!plan) {
        return reply
          .code(404)
          .send({
            message:
              "Execution plan not found. Prepare it again before running.",
          });
      }

      if (plan.status !== "READY") {
        return reply
          .code(400)
          .send({
            message:
              "Execution plan is not ready.",
          });
      }

      const project =
        getProject(
          plan.projectId,
        );

      if (!project) {
        return reply
          .code(404)
          .send({
            message:
              "Project not found.",
          });
      }

      const preferences =
        getExecutionPreferences(
          project.id,
        );

      const job =
        executionService.createJob(
          project,
          plan,
        );

      void executionService.run(
        job,
        project,
        plan,
        preferences,
      );

      return reply
        .code(202)
        .send(job);
    },
  );

  app.get(
    "/api/executions/jobs",
    async () => {
      return listExecutionJobs();
    },
  );

  app.get(
    "/api/executions/jobs/:id/plan",
    async (
      request,
      reply,
    ) => {

      const { id } =
        request.params as {
          id: string;
        };

      const job =
        getExecutionJob(id);

      if (!job) {
        return reply
          .code(404)
          .send({
            message:
              "Execution job not found.",
          });
      }

      const plan =
        getExecutionPlan(
          job.planId,
        );

      if (!plan) {
        return reply
          .code(404)
          .send({
            message:
              "Execution plan not found for this job.",
          });
      }

      return {
        jobId: job.id,
        plan,
      };
    },
  );

  app.get(
    "/api/executions/jobs/:id",
    async (
      request,
      reply,
    ) => {

      const { id } =
        request.params as {
          id: string;
        };

      const job =
        getExecutionJob(id);

      if (!job) {
        return reply
          .code(404)
          .send({
            message:
              "Execution job not found.",
          });
      }

      return job;
    },
  );

  app.post(
    "/api/executions/jobs/:id/cancel",
    async (
      request,
      reply,
    ) => {

      const { id } =
        request.params as {
          id: string;
        };

      const job =
        getExecutionJob(id);

      if (!job) {
        return reply
          .code(404)
          .send({
            message:
              "Execution job not found.",
          });
      }

      if (
        job.status !== "QUEUED" &&
        job.status !== "RUNNING"
      ) {
        return reply
          .code(400)
          .send({
            message:
              "Execution job is not running.",
          });
      }

      const cancelled =
        executionService.requestCancellation(
          id,
        );

      if (!cancelled) {
        return reply
          .code(409)
          .send({
            message:
              "Execution process is not available yet. Try again in a moment.",
          });
      }

      return reply
        .code(202)
        .send({
          message:
            "Cancellation requested.",
        });
    },
  );

  app.get(
    "/api/executions/jobs/:id/artifacts/:index/download",
    async (
      request,
      reply,
    ) => {

      const { id, index } =
        request.params as {
          id: string;
          index: string;
        };

      const job =
        getExecutionJob(id);

      if (!job) {
        return reply
          .code(404)
          .send({
            message:
              "Execution job not found.",
          });
      }

      const artifact =
        job.artifacts[
          Number(index)
        ];

      if (!artifact) {
        return reply
          .code(404)
          .send({
            message:
              "Artifact not found.",
          });
      }

      const absolutePath =
        join(
          artifactsDirectoryFor(
            id,
          ),
          artifact.relativePath,
        );

      try {
        await stat(
          absolutePath,
        );
      } catch {
        return reply
          .code(404)
          .send({
            message:
              "Artifact file is no longer available.",
          });
      }

      reply.header(
        "Content-Disposition",
        `attachment; filename="${artifact.name}"`,
      );

      return reply.send(
        createReadStream(
          absolutePath,
        ),
      );
    },
  );
}
