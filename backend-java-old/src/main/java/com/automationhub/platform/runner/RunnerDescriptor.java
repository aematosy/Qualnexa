package com.automationhub.platform.runner;

import java.util.List;

import com.automationhub.platform.project.model.BuildToolDescriptor;
import com.automationhub.platform.project.model.RuntimeRequirement;

public record RunnerDescriptor(
        String id,
        String image,
        List<RuntimeRequirement> runtimes,
        List<BuildToolDescriptor> buildTools,
        List<String> capabilities
) {
    public RunnerDescriptor {
        runtimes = runtimes == null
                ? List.of()
                : List.copyOf(runtimes);

        buildTools = buildTools == null
                ? List.of()
                : List.copyOf(buildTools);

        capabilities = capabilities == null
                ? List.of()
                : List.copyOf(capabilities);
    }
}
