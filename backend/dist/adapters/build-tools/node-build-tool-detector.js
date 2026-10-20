import { resolve, } from "node:path";
import { fileExists, readJsonIfExists, } from "../../core/inspection/file-utils.js";
export class NodeBuildToolDetector {
    async detect(workspace) {
        const packageJsonPath = resolve(workspace.root, "package.json");
        if (!(await fileExists(packageJsonPath))) {
            return [];
        }
        const packageJson = await readJsonIfExists(packageJsonPath);
        const declared = packageJson?.packageManager;
        if (declared) {
            const [manager, version,] = declared.split("@");
            return [
                {
                    type: manager?.toUpperCase() ??
                        "NPM",
                    versionConstraint: version,
                    wrapperAvailable: false,
                },
            ];
        }
        const candidates = [
            {
                file: "pnpm-lock.yaml",
                type: "PNPM",
            },
            {
                file: "yarn.lock",
                type: "YARN",
            },
            {
                file: "package-lock.json",
                type: "NPM",
            },
        ];
        for (const candidate of candidates) {
            if (await fileExists(resolve(workspace.root, candidate.file))) {
                return [
                    {
                        type: candidate.type,
                        wrapperAvailable: false,
                    },
                ];
            }
        }
        return [
            {
                type: "NPM",
                wrapperAvailable: false,
            },
        ];
    }
}
