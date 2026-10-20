import { resolve, } from "node:path";
import { fileExists, readTextIfExists, } from "../../core/inspection/file-utils.js";
export class MavenBuildToolDetector {
    async detect(workspace) {
        const pom = resolve(workspace.root, "pom.xml");
        if (!(await fileExists(pom))) {
            return [];
        }
        const wrapperProperties = resolve(workspace.root, ".mvn", "wrapper", "maven-wrapper.properties");
        const wrapperAvailable = await fileExists(wrapperProperties);
        let version;
        if (wrapperAvailable) {
            const content = await readTextIfExists(wrapperProperties);
            const match = content?.match(/apache-maven-([0-9.]+)-bin/i);
            version =
                match?.[1];
        }
        return [
            {
                type: "MAVEN",
                versionConstraint: version,
                wrapperAvailable,
            },
        ];
    }
}
