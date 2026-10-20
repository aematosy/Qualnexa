package com.automationhub.platform.inspection;

import java.util.List;

import com.automationhub.platform.project.model.BuildToolDescriptor;

public interface BuildToolDetector {

    List<BuildToolDescriptor> detect(
            ProjectWorkspace workspace
    );
}
