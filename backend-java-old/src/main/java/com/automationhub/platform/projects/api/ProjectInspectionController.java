package com.automationhub.platform.projects.api;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.automationhub.platform.inspection.ProjectInspectionService;
import com.automationhub.platform.project.model.ProjectManifest;
import com.automationhub.platform.project.model.ProjectSourceDescriptor;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/projects")
public class ProjectInspectionController {

    private final ProjectInspectionService
            inspectionService;

    public ProjectInspectionController(
            ProjectInspectionService inspectionService
    ) {
        this.inspectionService =
                inspectionService;
    }

    @PostMapping("/inspect")
    public ProjectManifest inspect(
            @Valid
            @RequestBody
            InspectProjectRequest request
    ) {
        ProjectSourceDescriptor source =
                new ProjectSourceDescriptor(
                        request.sourceType(),
                        request.location(),
                        request.provider(),
                        request.branch(),
                        request.commit()
                );

        return inspectionService.inspect(
                request.name(),
                source
        );
    }
}
