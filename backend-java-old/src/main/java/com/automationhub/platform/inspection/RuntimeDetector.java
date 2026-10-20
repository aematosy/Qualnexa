package com.automationhub.platform.inspection;

import java.util.List;

import com.automationhub.platform.project.model.RuntimeRequirement;

public interface RuntimeDetector {

    List<RuntimeRequirement> detect(
            ProjectWorkspace workspace
    );
}
