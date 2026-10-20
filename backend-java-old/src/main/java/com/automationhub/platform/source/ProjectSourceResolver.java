package com.automationhub.platform.source;

import com.automationhub.platform.inspection.ProjectWorkspace;
import com.automationhub.platform.project.model.ProjectSourceDescriptor;
import com.automationhub.platform.project.model.ProjectSourceType;

public interface ProjectSourceResolver {

    boolean supports(ProjectSourceType type);

    ProjectWorkspace resolve(
            ProjectSourceDescriptor source
    );
}
