package com.automationhub.platform.project.model;

import java.util.List;

public record TestCatalog(
        List<TestContainerDescriptor> containers,
        List<String> labels,
        List<TestSelectorDescriptor> selectors,
        int testCount
) {
    public TestCatalog {
        containers = containers == null
                ? List.of()
                : List.copyOf(containers);

        labels = labels == null
                ? List.of()
                : List.copyOf(labels);

        selectors = selectors == null
                ? List.of()
                : List.copyOf(selectors);
    }

    public static TestCatalog empty() {
        return new TestCatalog(
                List.of(),
                List.of(),
                List.of(),
                0
        );
    }
}
