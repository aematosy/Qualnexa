import { resolve, } from "node:path";
import { firstNonBlank, readJsonIfExists, readTextIfExists, } from "../../core/inspection/file-utils.js";
export class NodeRuntimeDetector {
    async detect(workspace) {
        const packageJson = await readJsonIfExists(resolve(workspace.root, "package.json"));
        const nvmrc = await readTextIfExists(resolve(workspace.root, ".nvmrc"));
        const nodeVersion = await readTextIfExists(resolve(workspace.root, ".node-version"));
        const version = firstNonBlank(nvmrc, nodeVersion, packageJson?.engines?.node);
        if (!packageJson &&
            !version) {
            return [];
        }
        return [
            {
                type: "NODE",
                versionConstraint: version ?? "unspecified",
                source: nvmrc
                    ? ".nvmrc"
                    : nodeVersion
                        ? ".node-version"
                        : packageJson?.engines?.node
                            ? "package.json:engines.node"
                            : "package.json",
            },
        ];
    }
}
