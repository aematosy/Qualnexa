package com.automationhub.platform.project.model;

import java.util.List;

public record ProjectManifest(
        String id,
        String name,
        ProjectSourceDescriptor source,
        List<RuntimeRequirement> runtimes,
        List<BuildToolDescriptor> buildTools,
        List<FrameworkDescriptor> frameworks,
        TestCatalog testCatalog,
        List<String> environments,
        String inspectionStatus
) {
    public ProjectManifest {
        runtimes = runtimes == null
                ? List.of()
                : List.copyOf(runtimes);

        buildTools = buildTools == null
                ? List.of()
                : List.copyOf(buildTools);

        frameworks = frameworks == null
                ? List.of()
                : List.copyOf(frameworks);

        testCatalog = testCatalog == null
                ? TestCatalog.empty()
                : testCatalog;

        environments = environments == null
                ? List.of()
                : List.copyOf(environments);
    }
}
