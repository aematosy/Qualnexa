package com.automationhub.platform.project.model;

public record ProjectSourceDescriptor(
        ProjectSourceType type,
        String location,
        String provider,
        String branch,
        String commit
) {}
