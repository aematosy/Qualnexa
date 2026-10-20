import { z, } from "zod";
import { ExecutionPlanner, } from "../core/execution/execution-planner.js";
import { getProject, } from "../core/project/project-store.js";
const selectionSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("ALL"),
    }),
    z.object({
        type: z.literal("CONTAINER"),
        containerId: z.string()
            .min(1),
    }),
    z.object({
        type: z.literal("TESTS"),
        testIds: z.array(z.string())
            .min(1),
    }),
    z.object({
        type: z.literal("LABELS"),
        labels: z.array(z.string())
            .min(1),
        labelMatch: z.enum([
            "ANY",
            "ALL",
        ])
            .default("ANY"),
        containerId: z.string()
            .min(1)
            .optional(),
    }),
]);
const requestSchema = z.object({
    projectId: z.string()
        .min(1),
    selection: selectionSchema,
    environment: z.string()
        .optional(),
    parameters: z.record(z.string(), z.union([
        z.string(),
        z.number(),
        z.boolean(),
    ]))
        .optional(),
});
export async function executionRoutes(app) {
    const planner = new ExecutionPlanner();
    app.post("/api/executions/plan", async (request, reply) => {
        const parsed = requestSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply
                .code(400)
                .send({
                message: "Invalid execution request.",
                issues: parsed.error.issues,
            });
        }
        const project = getProject(parsed.data.projectId);
        if (!project) {
            return reply
                .code(404)
                .send({
                message: "Project not found.",
            });
        }
        try {
            const executionRequest = {
                projectId: parsed.data.projectId,
                selection: parsed.data.selection,
                environment: parsed.data.environment,
                parameters: parsed.data.parameters,
            };
            return planner.createPlan(project, executionRequest);
        }
        catch (error) {
            return reply
                .code(400)
                .send({
                message: error instanceof Error
                    ? error.message
                    : "Unable to create execution plan.",
            });
        }
    });
}
