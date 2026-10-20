package com.automationhub.platform.framework;

import com.automationhub.platform.inspection.ProjectWorkspace;
import com.automationhub.platform.project.model.FrameworkDescriptor;
import com.automationhub.platform.project.model.TestCatalog;

public interface TestFrameworkAdapter {

    boolean supports(
            ProjectWorkspace workspace
    );

    FrameworkDescriptor inspect(
            ProjectWorkspace workspace
    );

    TestCatalog discoverTests(
            ProjectWorkspace workspace
    );
}
