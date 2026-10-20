export type ProjectSourceType =
  | "LOCAL"
  | "GITHUB"
  | "BITBUCKET";

export type LocalSourceMode =
  | "FOLDER"
  | "ZIP"
  | "PATH";

export type ProjectStatus =
  | "READY"
  | "WARNING"
  | "BLOCKED"
  | "ANALYZING";

export type Project = {
  id: string;
  name: string;
  sourceType: ProjectSourceType;
  repository?: string;
  branch?: string;
  features: number;
  scenarios: number;
  tags: number;
  status: ProjectStatus;
};

export type AddProjectRequest = {
  name: string;
  sourceType: ProjectSourceType;

  repositoryUrl?: string;
  branch?: string;

  authenticationType?: "NONE" | "TOKEN";

  localMode?: LocalSourceMode;

  localPath?: string;

  localArchive?: File;

  localFiles?: File[];
};
