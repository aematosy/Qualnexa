package com.automationhub.platform.inspection;

import java.nio.file.Path;

public record ProjectWorkspace(
        Path root
) {
    public ProjectWorkspace {
        root = root.toAbsolutePath().normalize();
    }
}
