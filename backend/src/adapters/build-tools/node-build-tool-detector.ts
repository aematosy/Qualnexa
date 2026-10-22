import {
  resolve,
} from "node:path";

import type {
  BuildToolDetector,
  ProjectWorkspace,
} from "../../core/inspection/contracts.js";

import type {
  BuildToolDescriptor,
} from "../../core/project/model.js";

import {
  fileExists,
  readJsonIfExists,
} from "../../core/inspection/file-utils.js";

type PackageJson = {
  packageManager?: string;
};

export class NodeBuildToolDetector
  implements BuildToolDetector {

  async detect(
    workspace: ProjectWorkspace,
  ): Promise<BuildToolDescriptor[]> {

    const packageJsonPath =
      resolve(
        workspace.root,
        "package.json",
      );

    if (
      !(await fileExists(
        packageJsonPath,
      ))
    ) {
      return [];
    }

    const packageJson =
      await readJsonIfExists<PackageJson>(
        packageJsonPath,
      );

    const declared =
      packageJson?.packageManager;

    if (declared) {
      const [
        manager,
        version,
      ] = declared.split("@");

      return [
        {
          type:
            manager?.toUpperCase() ??
            "NPM",
          versionConstraint:
            version,
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
      if (
        await fileExists(
          resolve(
            workspace.root,
            candidate.file,
          ),
        )
      ) {
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
