package com.automationhub.platform.projects.api;

import com.automationhub.platform.project.model.ProjectSourceType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record InspectProjectRequest(

        @NotBlank
        String name,

        @NotNull
        ProjectSourceType sourceType,

        @NotBlank
        String location,

        String provider,

        String branch,

        String commit
) {}
