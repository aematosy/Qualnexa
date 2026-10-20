import { resolve, } from "node:path";
import { fileExists, readTextIfExists, } from "../../core/inspection/file-utils.js";
export class GradleBuildToolDetector {
    async detect(workspace) {
        const buildGradle = resolve(workspace.root, "build.gradle");
        const buildGradleKts = resolve(workspace.root, "build.gradle.kts");
        const hasGradle = await fileExists(buildGradle) ||
            await fileExists(buildGradleKts);
        if (!hasGradle) {
            return [];
        }
        const wrapperProperties = resolve(workspace.root, "gradle", "wrapper", "gradle-wrapper.properties");
        const wrapperAvailable = await fileExists(wrapperProperties);
        let version;
        if (wrapperAvailable) {
            const content = await readTextIfExists(wrapperProperties);
            const match = content?.match(/gradle-([0-9.]+)-(?:bin|all)\.zip/i);
            version =
                match?.[1];
        }
        return [
            {
                type: "GRADLE",
                versionConstraint: version,
                wrapperAvailable,
            },
        ];
    }
}
