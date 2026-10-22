import type {
  ProjectManifest,
} from "./model.js";

const projects =
  new Map<
    string,
    ProjectManifest
  >();

export function saveProject(
  manifest: ProjectManifest,
): ProjectManifest {

  const existing =
    [...projects.values()]
      .find(
        (project) =>
          project.source.location ===
          manifest.source.location,
      );

  if (existing) {
    projects.delete(
      existing.id,
    );
  }

  projects.set(
    manifest.id,
    manifest,
  );

  return manifest;
}

export function listProjects():
  ProjectManifest[] {

  return [
    ...projects.values(),
  ];
}

export function getProject(
  id: string,
): ProjectManifest | undefined {

  return projects.get(id);
}

export function clearProjects():
  void {

  projects.clear();
}
