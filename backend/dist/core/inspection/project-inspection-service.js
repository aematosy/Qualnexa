import { randomUUID, } from "node:crypto";
export class ProjectInspectionService {
    sourceResolvers;
    runtimeDetectors;
    buildToolDetectors;
    frameworkAdapters;
    executionProfileDetectors;
    constructor(sourceResolvers, runtimeDetectors, buildToolDetectors, frameworkAdapters, executionProfileDetectors) {
        this.sourceResolvers = sourceResolvers;
        this.runtimeDetectors = runtimeDetectors;
        this.buildToolDetectors = buildToolDetectors;
        this.frameworkAdapters = frameworkAdapters;
        this.executionProfileDetectors = executionProfileDetectors;
    }
    async inspect(name, source) {
        const resolver = this.sourceResolvers.find((candidate) => candidate.supports(source.type));
        if (!resolver) {
            throw new Error(`No source resolver for ${source.type}`);
        }
        const workspace = await resolver.resolve(source);
        const runtimes = (await Promise.all(this.runtimeDetectors.map((detector) => detector.detect(workspace)))).flat();
        const buildTools = (await Promise.all(this.buildToolDetectors.map((detector) => detector.detect(workspace)))).flat();
        const supportedAdapters = [];
        for (const adapter of this.frameworkAdapters) {
            if (await adapter.supports(workspace)) {
                supportedAdapters.push(adapter);
            }
        }
        const frameworks = await Promise.all(supportedAdapters.map((adapter) => adapter.inspect(workspace)));
        const catalogs = await Promise.all(supportedAdapters.map((adapter) => adapter.discoverTests(workspace)));
        const testCatalog = mergeCatalogs(catalogs);
        const environmentGroups = await Promise.all(supportedAdapters.map(async (adapter) => adapter.discoverEnvironments
            ? adapter.discoverEnvironments(workspace)
            : []));
        const environments = [
            ...new Map(environmentGroups
                .flat()
                .map((environment) => [
                environment.id,
                environment,
            ])).values(),
        ];
        const executionProfileGroups = await Promise.all(this.executionProfileDetectors.map((detector) => detector.detect({
            workspace,
            runtimes,
            buildTools,
            frameworks,
            testCatalog,
            environments,
        })));
        const executionProfiles = [
            ...new Map(executionProfileGroups
                .flat()
                .map((profile) => [
                profile.id,
                profile,
            ])).values(),
        ];
        const inspectionStatus = frameworks.length === 0
            ? "UNSUPPORTED"
            : runtimes.length === 0 ||
                buildTools.length === 0
                ? "PARTIAL"
                : "INSPECTED";
        return {
            id: randomUUID(),
            name,
            source,
            runtimes,
            buildTools,
            frameworks,
            testCatalog,
            environments,
            executionProfiles,
            inspectionStatus,
        };
    }
}
function mergeCatalogs(catalogs) {
    const containers = catalogs.flatMap((catalog) => catalog.containers);
    const labels = [
        ...new Set(catalogs.flatMap((catalog) => catalog.labels)),
    ];
    const selectors = [
        ...new Map(catalogs
            .flatMap((catalog) => catalog.selectors)
            .map((selector) => [
            `${selector.kind}:${selector.id}`,
            selector,
        ])).values(),
    ];
    return {
        containers,
        labels,
        selectors,
        testCount: catalogs.reduce((total, catalog) => total +
            catalog.testCount, 0),
    };
}
