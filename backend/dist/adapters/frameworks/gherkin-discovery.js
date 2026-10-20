import { readFile, } from "node:fs/promises";
import { relative, } from "node:path";
import { findFiles, } from "../../core/inspection/file-finder.js";
export async function discoverGherkinTests(root, options) {
    const featureFiles = await findFiles(root, (_path, name) => name.endsWith(".feature"));
    const containers = [];
    const allLabels = new Set();
    let testCount = 0;
    for (const file of featureFiles) {
        const content = await readFile(file, "utf8");
        const lines = content.split(/\r?\n/);
        let containerName = relative(root, file);
        let pendingLabels = [];
        let containerLabels = [];
        const tests = [];
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index]?.trim() ?? "";
            if (line.startsWith("@")) {
                pendingLabels =
                    line
                        .split(/\s+/)
                        .filter((value) => value.startsWith("@"));
                continue;
            }
            if (/^Feature:/i.test(line)) {
                containerName =
                    line.replace(/^Feature:\s*/i, "");
                containerLabels =
                    [...pendingLabels];
                containerLabels.forEach((label) => allLabels.add(label));
                pendingLabels = [];
                continue;
            }
            if (/^(Scenario|Scenario Outline|Scenario Template):/i.test(line)) {
                const name = line.substring(line.indexOf(":") + 1).trim();
                pendingLabels.forEach((label) => allLabels.add(label));
                tests.push({
                    id: `${relative(root, file)}:${index + 1}`,
                    name,
                    path: relative(root, file),
                    line: index + 1,
                    labels: [...pendingLabels],
                });
                pendingLabels = [];
                testCount++;
                continue;
            }
            if (line.length > 0 &&
                !line.startsWith("#")) {
                pendingLabels = [];
            }
        }
        containers.push({
            id: relative(root, file),
            frameworkId: options.frameworkId,
            name: containerName,
            path: relative(root, file),
            vocabulary: options.vocabulary,
            labels: containerLabels,
            tests,
        });
    }
    return {
        containers,
        labels: [...allLabels].sort(),
        selectors: options.selectors,
        testCount,
    };
}
