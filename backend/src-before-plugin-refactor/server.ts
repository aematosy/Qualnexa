import Fastify from "fastify";
import cors from "@fastify/cors";

import {
  filesystemRoutes,
} from "./api/filesystem-routes.js";

import {
  projectRoutes,
} from "./api/project-routes.js";

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

const app =
  Fastify({
    logger: true,
  });

await app.register(
  cors,
  {
    origin: true,
  },
);

const inspectionService =
  new ProjectInspectionService(
    [
      new LocalPathSourceResolver(),
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

await executionRoutes(
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

try {
  await app.listen({
    port,
    host,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
