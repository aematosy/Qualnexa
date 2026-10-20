package com.automationhub.platform.project.model;

public record BuildToolDescriptor(
        String type,
        String versionConstraint,
        boolean wrapperAvailable
) {}
