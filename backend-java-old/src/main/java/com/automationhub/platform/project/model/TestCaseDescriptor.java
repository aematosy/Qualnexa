package com.automationhub.platform.project.model;

import java.util.List;

public record TestCaseDescriptor(
        String id,
        String name,
        String path,
        Integer line,
        List<String> labels
) {
    public TestCaseDescriptor {
        labels = labels == null
                ? List.of()
                : List.copyOf(labels);
    }
}
