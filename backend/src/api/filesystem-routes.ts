import type {
  FastifyInstance,
} from "fastify";

import {
  getFileSystemRoots,
  listDirectories,
} from "../filesystem/filesystem-service.js";

export async function filesystemRoutes(
  app: FastifyInstance,
): Promise<void> {

  app.get(
    "/api/filesystem/roots",
    async () => {
      return getFileSystemRoots();
    },
  );

  app.get<{
    Querystring: {
      path?: string;
    };
  }>(
    "/api/filesystem/directories",
    async (
      request,
      reply,
    ) => {

      const requestedPath =
        request.query.path;

      if (!requestedPath) {
        return reply
          .code(400)
          .send({
            message:
              "Query parameter 'path' is required.",
          });
      }

      try {
        return await listDirectories(
          requestedPath,
        );
      } catch (error) {
        return reply
          .code(400)
          .send({
            message:
              error instanceof Error
                ? error.message
                : "Unable to browse directory.",
          });
      }
    },
  );
}
