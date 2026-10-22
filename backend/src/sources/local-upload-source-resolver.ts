import {
  access,
  stat,
} from "node:fs/promises";

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

export class LocalUploadSourceResolver
  implements ProjectSourceResolver {

  // This resolver is only ever called with a workspace directory that the
  // backend itself created via createUploadWorkspace() right before
  // invoking inspect() (see api/upload-routes.ts). The location is never
  // taken verbatim from client input, so the ALLOWED_PROJECT_ROOTS
  // allowlist enforced by LocalPathSourceResolver does not apply here.
  supports(type: ProjectSourceType): boolean {
    return type === "LOCAL_UPLOAD";
  }

  async resolve(
    source: ProjectSourceDescriptor,
  ): Promise<ProjectWorkspace> {

    if (!source.location.trim()) {
      throw new Error(
        "Uploaded project workspace is required.",
      );
    }

    const root = source.location;

    await access(root);

    const info = await stat(root);

    if (!info.isDirectory()) {
      throw new Error(
        `Uploaded project workspace is not a directory: ${root}`,
      );
    }

    return {
      root,
    };
  }
}
