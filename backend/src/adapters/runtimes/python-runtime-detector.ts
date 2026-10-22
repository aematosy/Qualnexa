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
  fileExists,
  readTextIfExists,
} from "../../core/inspection/file-utils.js";

export class PythonRuntimeDetector
  implements RuntimeDetector {

  async detect(
    workspace: ProjectWorkspace,
  ): Promise<RuntimeRequirement[]> {

    const pythonVersion =
      await readTextIfExists(
        resolve(
          workspace.root,
          ".python-version",
        ),
      );

    const pyproject =
      await readTextIfExists(
        resolve(
          workspace.root,
          "pyproject.toml",
        ),
      );

    const requirementsExists =
      await fileExists(
        resolve(
          workspace.root,
          "requirements.txt",
        ),
      );

    let pyprojectVersion:
      | string
      | undefined;

    if (pyproject) {
      const match =
        pyproject.match(
          /requires-python\s*=\s*["']([^"']+)["']/i,
        );

      if (match?.[1]) {
        pyprojectVersion =
          match[1];
      }
    }

    const version =
      firstNonBlank(
        pythonVersion,
        pyprojectVersion,
      );

    if (
      !pyproject &&
      !requirementsExists &&
      !version
    ) {
      return [];
    }

    return [
      {
        type: "PYTHON",
        versionConstraint:
          version ?? "unspecified",
        source:
          pythonVersion
            ? ".python-version"
            : pyprojectVersion
              ? "pyproject.toml"
              : "requirements.txt",
      },
    ];
  }
}
