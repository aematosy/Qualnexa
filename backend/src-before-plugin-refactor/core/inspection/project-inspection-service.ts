import {
  randomUUID,
} from "node:crypto";

import type {
  BuildToolDetector,
  FrameworkAdapter,
  RuntimeDetector,
} from "./contracts.js";

import type {
  ProjectManifest,
  ProjectSourceDescriptor,
  TestCatalog,
} from "../project/model.js";

import type {
  ProjectSourceResolver,
} from "../../sources/contracts.js";

export class ProjectInspectionService {

  constructor(
    private readonly sourceResolvers:
      ProjectSourceResolver[],

    private readonly runtimeDetectors:
      RuntimeDetector[],

    private readonly buildToolDetectors:
      BuildToolDetector[],

    private readonly frameworkAdapters:
      FrameworkAdapter[],
  ) {}

  async inspect(
    name: string,
    source:
      ProjectSourceDescriptor,
  ): Promise<ProjectManifest> {

    const resolver =
      this.sourceResolvers.find(
        (candidate) =>
          candidate.supports(
            source.type,
          ),
      );

    if (!resolver) {
      throw new Error(
        `No source resolver for ${source.type}`,
      );
    }

    const workspace =
      await resolver.resolve(source);

    const runtimes = (
      await Promise.all(
        this.runtimeDetectors.map(
          (detector) =>
            detector.detect(
              workspace,
            ),
        ),
      )
    ).flat();

    const buildTools = (
      await Promise.all(
        this.buildToolDetectors.map(
          (detector) =>
            detector.detect(
              workspace,
            ),
        ),
      )
    ).flat();

    const supportedAdapters:
      FrameworkAdapter[] = [];

    for (
      const adapter
      of this.frameworkAdapters
    ) {
      if (
        await adapter.supports(
          workspace,
        )
      ) {
        supportedAdapters.push(
          adapter,
        );
      }
    }

    const frameworks =
      await Promise.all(
        supportedAdapters.map(
          (adapter) =>
            adapter.inspect(
              workspace,
            ),
        ),
      );

    const catalogs =
      await Promise.all(
        supportedAdapters.map(
          (adapter) =>
            adapter.discoverTests(
              workspace,
            ),
        ),
      );

    const testCatalog =
      mergeCatalogs(catalogs);

    const inspectionStatus =
      frameworks.length === 0
        ? "UNSUPPORTED"
        : runtimes.length === 0 ||
            buildTools.length === 0
          ? "PARTIAL"
          : "INSPECTED";

    return {
      id:
        randomUUID(),
      name,
      source,
      runtimes,
      buildTools,
      frameworks,
      testCatalog,
      environments: [],
      inspectionStatus,
    };
  }
}

function mergeCatalogs(
  catalogs: TestCatalog[],
): TestCatalog {

  const containers =
    catalogs.flatMap(
      (catalog) =>
        catalog.containers,
    );

  const labels = [
    ...new Set(
      catalogs.flatMap(
        (catalog) =>
          catalog.labels,
      ),
    ),
  ];

  const selectors = [
    ...new Map(
      catalogs
        .flatMap(
          (catalog) =>
            catalog.selectors,
        )
        .map(
          (selector) => [
            `${selector.type}:${selector.label}`,
            selector,
          ],
        ),
    ).values(),
  ];

  return {
    containers,
    labels,
    selectors,
    testCount:
      catalogs.reduce(
        (
          total,
          catalog,
        ) =>
          total +
          catalog.testCount,
        0,
      ),
  };
}

