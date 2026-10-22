import {
  join,
} from "node:path";

import type {
  ProcessSpecification,
} from "../core/execution/model.js";

export function applyJdkOverride(
  specification: ProcessSpecification,
  jdkHome: string,
): ProcessSpecification {

  const binDirectory =
    join(jdkHome, "bin");

  const pathSeparator =
    process.platform === "win32"
      ? ";"
      : ":";

  const currentPath =
    specification.environment.PATH ??
    specification.environment.Path ??
    process.env.PATH ??
    process.env.Path ??
    "";

  return {
    ...specification,

    environment: {
      ...specification.environment,

      JAVA_HOME:
        jdkHome,

      PATH:
        `${binDirectory}${pathSeparator}${currentPath}`,
    },
  };
}
