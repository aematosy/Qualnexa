import {
  resolve,
} from "node:path";

import type {
  ProjectWorkspace,
  RuntimeDetector,
} from "../../core/inspection/contracts.js";

import type {
  RuntimeRequirement,
} from "../../core/project/model.js";

import {
  firstNonBlank,
  readJsonIfExists,
  readTextIfExists,
} from "../../core/inspection/file-utils.js";

type PackageJson = {
  engines?: {
    node?: string;
  };
};

export class NodeRuntimeDetector
  implements RuntimeDetector {

  async detect(
    workspace: ProjectWorkspace,
  ): Promise<RuntimeRequirement[]> {

    const packageJson =
      await readJsonIfExists<PackageJson>(
        resolve(
          workspace.root,
          "package.json",
        ),
      );

    const nvmrc =
      await readTextIfExists(
        resolve(
          workspace.root,
          ".nvmrc",
        ),
      );

    const nodeVersion =
      await readTextIfExists(
        resolve(
          workspace.root,
          ".node-version",
        ),
      );

    const version =
      firstNonBlank(
        nvmrc,
        nodeVersion,
        packageJson?.engines?.node,
      );

    if (
      !packageJson &&
      !version
    ) {
      return [];
    }

    return [
      {
        type: "NODE",
        versionConstraint:
          version ?? "unspecified",
        source:
          nvmrc
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
