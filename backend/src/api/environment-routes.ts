import type {
  FastifyInstance,
} from "fastify";

import {
  runDoctor,
} from "../environment/doctor-service.js";

import {
  discoverJdks,
} from "../environment/jdk-discovery.js";

export async function environmentRoutes(
  app: FastifyInstance,
): Promise<void> {

  app.get(
    "/api/environment/doctor",
    async () => {
      return runDoctor();
    },
  );

  app.get(
    "/api/environment/jdks",
    async () => {
      return discoverJdks();
    },
  );
}
