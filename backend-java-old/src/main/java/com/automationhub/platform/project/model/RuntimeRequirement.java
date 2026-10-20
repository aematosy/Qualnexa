package com.automationhub.platform.project.model;

public record RuntimeRequirement(
        RuntimeType type,
        String versionConstraint
) {}
