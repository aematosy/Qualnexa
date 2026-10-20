import { readFile, } from "node:fs/promises";
import { resolve, } from "node:path";
import { XMLParser, } from "fast-xml-parser";
export class MavenExecutionProfileDetector {
    semanticResolvers;
    constructor(semanticResolvers) {
        this.semanticResolvers = semanticResolvers;
    }
    async detect(snapshot) {
        const mavenBuild = snapshot.buildTools.find((buildTool) => buildTool.type.toUpperCase() ===
            "MAVEN");
        if (!mavenBuild) {
            return [];
        }
        const pomPath = resolve(snapshot.workspace.root, "pom.xml");
        let xml;
        try {
            xml =
                await readFile(pomPath, "utf8");
        }
        catch {
            return [];
        }
        const parser = new XMLParser({
            ignoreAttributes: false,
            parseTagValue: false,
            trimValues: true,
        });
        const document = parser.parse(xml);
        const project = asRecord(asRecord(document)
            ?.project);
        if (!project) {
            return [];
        }
        const build = asRecord(project.build);
        const pluginsNode = asRecord(build?.plugins);
        const plugins = toArray(pluginsNode?.plugin)
            .map(asRecord)
            .filter(isRecord);
        const profiles = [];
        for (const plugin of plugins) {
            const artifactId = asString(plugin.artifactId);
            if (!artifactId) {
                continue;
            }
            const executionsNode = asRecord(plugin.executions);
            const executions = toArray(executionsNode?.execution)
                .map(asRecord)
                .filter(isRecord);
            for (const execution of executions) {
                const goals = readGoals(execution);
                if (goals.length === 0) {
                    continue;
                }
                const bindings = readParameterBindings(plugin, this.semanticResolvers);
                if (bindings.length === 0) {
                    continue;
                }
                const executionId = asString(execution.id) ??
                    artifactId;
                profiles.push({
                    id: `maven:${artifactId}:${executionId}`,
                    providerId: artifactId,
                    buildToolId: mavenBuild.type,
                    tasks: goals,
                    fixedArguments: [],
                    parameterBindings: bindings,
                    source: pomPath,
                });
            }
        }
        return profiles;
    }
}
function readGoals(execution) {
    const goalsNode = asRecord(execution.goals);
    return toArray(goalsNode?.goal)
        .map(asString)
        .filter((value) => Boolean(value));
}
function readParameterBindings(plugin, semanticResolvers) {
    const configuration = asRecord(plugin.configuration);
    const systemProperties = asRecord(configuration
        ?.systemPropertyVariables);
    if (!systemProperties) {
        return [];
    }
    const bindings = [];
    for (const [propertyName, propertyValue,] of Object.entries(systemProperties)) {
        const value = asString(propertyValue);
        const semantic = semanticResolvers
            .map((resolver) => resolver.resolve(propertyName, value))
            .find((candidate) => candidate !==
            undefined);
        if (!semantic) {
            continue;
        }
        bindings.push({
            parameterId: semantic.parameterId,
            target: "PROPERTY",
            targetName: resolvePropertyTarget(propertyName, value),
        });
    }
    return deduplicateBindings(bindings);
}
function resolvePropertyTarget(propertyName, propertyValue) {
    const reference = propertyValue?.match(/^\$\{([^}]+)\}$/);
    return (reference?.[1] ??
        propertyName);
}
function deduplicateBindings(bindings) {
    return [
        ...new Map(bindings.map((binding) => [
            `${binding.parameterId}:${binding.target}:${binding.targetName ?? ""}`,
            binding,
        ])).values(),
    ];
}
function asRecord(value) {
    if (typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)) {
        return value;
    }
    return undefined;
}
function isRecord(value) {
    return value !== undefined;
}
function asString(value) {
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number" ||
        typeof value === "boolean") {
        return String(value);
    }
    return undefined;
}
function toArray(value) {
    if (value === undefined ||
        value === null) {
        return [];
    }
    return Array.isArray(value)
        ? value
        : [value];
}
