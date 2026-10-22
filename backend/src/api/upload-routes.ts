import type {
  FastifyInstance,
} from "fastify";

import type {
  ProjectInspectionService,
} from "../core/inspection/project-inspection-service.js";

import {
  saveProject,
} from "../core/project/project-store.js";

import {
  createUploadWorkspace,
  writeWorkspaceFile,
} from "../uploads/upload-workspace.js";

import {
  extractZipToWorkspace,
} from "../uploads/zip-extractor.js";

export async function uploadRoutes(
  app: FastifyInstance,
  inspectionService:
    ProjectInspectionService,
): Promise<void> {

  app.post(
    "/api/projects/upload",
    async (
      request,
      reply,
    ) => {

      let name: string | undefined;
      let mode: string | undefined;
      let relativePaths: string[] = [];
      let fileIndex = 0;
      let fileCount = 0;

      const workspaceRoot =
        await createUploadWorkspace();

      try {
        for await (
          const part
          of request.parts()
        ) {
          if (part.type === "file") {
            const buffer =
              await part.toBuffer();

            if (part.fieldname === "archive") {
              fileCount +=
                await extractZipToWorkspace(
                  buffer,
                  workspaceRoot,
                );
            } else {
              // Multipart parsers strip any "/" from the filename field
              // for security (RFC 7578 treats it as a bare file name), so
              // folder structure travels separately in "relativePaths"
              // (sent before the file parts) and is matched by position.
              const relativePath =
                relativePaths[fileIndex] ??
                part.filename;

              await writeWorkspaceFile(
                workspaceRoot,
                relativePath,
                buffer,
              );

              fileIndex += 1;
              fileCount += 1;
            }
          } else if (part.fieldname === "name") {
            name = String(part.value);
          } else if (part.fieldname === "mode") {
            mode = String(part.value);
          } else if (part.fieldname === "relativePaths") {
            try {
              const parsed =
                JSON.parse(
                  String(part.value),
                );

              if (Array.isArray(parsed)) {
                relativePaths =
                  parsed.map(
                    (entry) => String(entry),
                  );
              }
            } catch {
              // Malformed relativePaths: fall back to each file's
              // basename filename.
            }
          }
        }

        if (!name || !name.trim()) {
          return reply
            .code(400)
            .send({
              message:
                "Project name is required.",
            });
        }

        if (
          mode !== "FOLDER" &&
          mode !== "ZIP"
        ) {
          return reply
            .code(400)
            .send({
              message:
                "Invalid upload mode.",
            });
        }

        if (fileCount === 0) {
          return reply
            .code(400)
            .send({
              message:
                "No files were uploaded.",
            });
        }

        const manifest =
          await inspectionService.inspect(
            name.trim(),
            {
              type:
                "LOCAL_UPLOAD",

              location:
                workspaceRoot,
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
                : "Project upload failed.",
          });
      }
    },
  );
}
