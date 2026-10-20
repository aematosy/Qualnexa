import type {
  ProjectSourceDescriptor,
  ProjectSourceType,
} from "../core/project/model.js";

import type {
  ProjectWorkspace,
} from "../core/inspection/contracts.js";

export interface ProjectSourceResolver {
  supports(type: ProjectSourceType): boolean;

  resolve(
    source: ProjectSourceDescriptor,
  ): Promise<ProjectWorkspace>;
}
