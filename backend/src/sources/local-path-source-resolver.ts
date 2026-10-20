import {
  access,
  stat,
} from "node:fs/promises";

import {
  resolve,
} from "node:path";

import type {
  ProjectWorkspace,
} from "../core/inspection/contracts.js";

import type {
  ProjectSourceDescriptor,
  ProjectSourceType,
} from "../core/project/model.js";

import type {
  ProjectSourceResolver,
} from "./contracts.js";

export class LocalPathSourceResolver
  implements ProjectSourceResolver {

  supports(type: ProjectSourceType): boolean {
    return type === "LOCAL_PATH";
  }

  async resolve(
    source: ProjectSourceDescriptor,
  ): Promise<ProjectWorkspace> {

    if (!source.location.trim()) {
      throw new Error(
        "Local project path is required.",
      );
    }

    const root = resolve(source.location);

    await access(root);

    const info = await stat(root);

    if (!info.isDirectory()) {
      throw new Error(
        `Project path is not a directory: ${root}`,
      );
    }

    return {
      root,
    };
  }
}
