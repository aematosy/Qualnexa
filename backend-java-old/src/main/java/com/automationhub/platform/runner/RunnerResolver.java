package com.automationhub.platform.runner;

import com.automationhub.platform.project.model.ProjectManifest;

public interface RunnerResolver {

    RunnerDescriptor resolve(
            ProjectManifest manifest
    );
}
