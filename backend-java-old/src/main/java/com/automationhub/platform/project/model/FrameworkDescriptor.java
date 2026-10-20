package com.automationhub.platform.project.model;

import java.util.List;

public record FrameworkDescriptor(
        String type,
        String version,
        List<String> capabilities
) {
    public FrameworkDescriptor {
        capabilities = capabilities == null
                ? List.of()
                : List.copyOf(capabilities);
    }
}
