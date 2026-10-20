package com.automationhub.platform.project.model;

import java.util.List;

public record TestContainerDescriptor(
        String id,
        String name,
        String type,
        String path,
        List<String> labels,
        List<TestCaseDescriptor> tests
) {
    public TestContainerDescriptor {
        labels = labels == null
                ? List.of()
                : List.copyOf(labels);

        tests = tests == null
                ? List.of()
                : List.copyOf(tests);
    }
}
