import {
  resolve,
} from "node:path";

import type {
  RuntimeDetector,
  ProjectWorkspace,
} from "../../core/inspection/contracts.js";

import type {
  RuntimeRequirement,
} from "../../core/project/model.js";

import {
  firstNonBlank,
  readTextIfExists,
} from "../../core/inspection/file-utils.js";

export class JavaRuntimeDetector
  implements RuntimeDetector {

  async detect(
    workspace: ProjectWorkspace,
  ): Promise<RuntimeRequirement[]> {

    const pomPath =
      resolve(workspace.root, "pom.xml");

    const gradlePath =
      resolve(
        workspace.root,
        "build.gradle",
      );

    const gradleKtsPath =
      resolve(
        workspace.root,
        "build.gradle.kts",
      );

    const javaVersionPath =
      resolve(
        workspace.root,
        ".java-version",
      );

    const toolVersionsPath =
      resolve(
        workspace.root,
        ".tool-versions",
      );

    const pom =
      await readTextIfExists(pomPath);

    const gradle =
      firstNonBlank(
        await readTextIfExists(
          gradlePath,
        ),
        await readTextIfExists(
          gradleKtsPath,
        ),
      );

    const javaVersion =
      await readTextIfExists(
        javaVersionPath,
      );

    const toolVersions =
      await readTextIfExists(
        toolVersionsPath,
      );

    let detected:
      | string
      | undefined;

    let source:
      | string
      | undefined;

    if (javaVersion?.trim()) {
      detected = javaVersion.trim();
      source = ".java-version";
    }

    if (!detected && toolVersions) {
      const match =
        toolVersions.match(
          /^java\s+([^\s]+)$/m,
        );

      if (match?.[1]) {
        detected = match[1];
        source = ".tool-versions";
      }
    }

    if (!detected && pom) {
      const properties = [
        "maven.compiler.release",
        "maven.compiler.source",
        "java.version",
      ];

      for (const property of properties) {
        const escaped =
          property.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&",
          );

        const match =
          pom.match(
            new RegExp(
              `<${escaped}>\\s*([^<]+?)\\s*</${escaped}>`,
              "i",
            ),
          );

        if (match?.[1]) {
          detected =
            match[1].trim();

          source =
            `pom.xml:${property}`;

          break;
        }
      }
    }

    if (!detected && gradle) {
      const patterns = [
        /JavaLanguageVersion\.of\(\s*(\d+)\s*\)/,
        /sourceCompatibility\s*=\s*['"]?JavaVersion\.VERSION_(\d+)/,
        /sourceCompatibility\s*=\s*['"]?(\d+)/,
      ];

      for (const pattern of patterns) {
        const match =
          gradle.match(pattern);

        if (match?.[1]) {
          detected =
            match[1].replace(
              "_",
              ".",
            );

          source =
            "Gradle build";

          break;
        }
      }
    }

    if (!detected) {
      return [];
    }

    return [
      {
        type: "JAVA",
        versionConstraint:
          detected,
        source,
      },
    ];
  }
}
