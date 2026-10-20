import { resolve, } from "node:path";
import { fileExists, readTextIfExists, } from "../../core/inspection/file-utils.js";
export class PythonBuildToolDetector {
    async detect(workspace) {
        const pyprojectPath = resolve(workspace.root, "pyproject.toml");
        const pyproject = await readTextIfExists(pyprojectPath);
        if (await fileExists(resolve(workspace.root, "uv.lock"))) {
            return [
                {
                    type: "UV",
                    wrapperAvailable: false,
                },
            ];
        }
        if (await fileExists(resolve(workspace.root, "poetry.lock")) ||
            pyproject?.includes("[tool.poetry]")) {
            return [
                {
                    type: "POETRY",
                    wrapperAvailable: false,
                },
            ];
        }
        if (pyproject ||
            await fileExists(resolve(workspace.root, "requirements.txt"))) {
            return [
                {
                    type: "PIP",
                    wrapperAvailable: false,
                },
            ];
        }
        return [];
    }
}
