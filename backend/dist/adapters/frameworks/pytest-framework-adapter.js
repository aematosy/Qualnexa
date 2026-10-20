import { readFile, } from "node:fs/promises";
import { relative, resolve, } from "node:path";
import { findFiles, } from "../../core/inspection/file-finder.js";
import { readTextIfExists, } from "../../core/inspection/file-utils.js";
const descriptor = {
    id: "pytest",
    displayName: "Pytest",
    capabilities: [
        "DISCOVER_TESTS",
        "SELECT_ALL",
        "SELECT_CONTAINER",
        "SELECT_TEST",
        "SELECT_LABEL",
    ],
    vocabulary: {
        container: "Module",
        test: "Test",
        label: "Marker",
    },
    selectors: [
        {
            id: "all",
            displayName: "All",
            kind: "ALL",
        },
        {
            id: "container",
            displayName: "Module",
            kind: "CONTAINER",
        },
        {
            id: "test",
            displayName: "Test",
            kind: "TEST",
        },
        {
            id: "label",
            displayName: "Markers",
            kind: "LABEL",
        },
    ],
};
export class PytestFrameworkAdapter {
    async supports(workspace) {
        const pyproject = await readTextIfExists(resolve(workspace.root, "pyproject.toml"));
        const requirements = await readTextIfExists(resolve(workspace.root, "requirements.txt"));
        return Boolean(pyproject
            ?.toLowerCase()
            .includes("pytest") ||
            requirements
                ?.toLowerCase()
                .includes("pytest"));
    }
    async inspect(_workspace) {
        return descriptor;
    }
    async discoverTests(workspace) {
        const files = await findFiles(workspace.root, (_path, name) => /^test_.*\.py$/i.test(name) ||
            /_test\.py$/i.test(name));
        const containers = [];
        const markers = new Set();
        let testCount = 0;
        for (const file of files) {
            const content = await readFile(file, "utf8");
            const markerMatches = [
                ...content.matchAll(/@pytest\.mark\.([A-Za-z0-9_]+)/g),
            ];
            markerMatches.forEach((match) => {
                if (match[1]) {
                    markers.add(match[1]);
                }
            });
            const tests = [
                ...content.matchAll(/^def\s+(test_[A-Za-z0-9_]+)\s*\(/gm),
            ].map((match, index) => ({
                id: `${relative(workspace.root, file)}:${index + 1}`,
                name: match[1] ??
                    `test_${index + 1}`,
                path: relative(workspace.root, file),
                labels: [],
            }));
            testCount +=
                tests.length;
            containers.push({
                id: relative(workspace.root, file),
                frameworkId: descriptor.id,
                name: relative(workspace.root, file),
                path: relative(workspace.root, file),
                vocabulary: descriptor.vocabulary,
                labels: [],
                tests,
            });
        }
        return {
            containers,
            labels: [...markers].sort(),
            selectors: descriptor.selectors,
            testCount,
        };
    }
}
