const projects = new Map();
export function saveProject(manifest) {
    const existing = [...projects.values()]
        .find((project) => project.source.location ===
        manifest.source.location);
    if (existing) {
        projects.delete(existing.id);
    }
    projects.set(manifest.id, manifest);
    return manifest;
}
export function listProjects() {
    return [
        ...projects.values(),
    ];
}
export function getProject(id) {
    return projects.get(id);
}
export function clearProjects() {
    projects.clear();
}
