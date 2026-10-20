package com.automationhub.platform.source;

import java.nio.file.Files;
import java.nio.file.Path;

import org.springframework.stereotype.Component;

import com.automationhub.platform.inspection.ProjectWorkspace;
import com.automationhub.platform.project.model.ProjectSourceDescriptor;
import com.automationhub.platform.project.model.ProjectSourceType;

@Component
public class LocalPathSourceResolver
        implements ProjectSourceResolver {

    @Override
    public boolean supports(
            ProjectSourceType type
    ) {
        return type == ProjectSourceType.LOCAL_PATH;
    }

    @Override
    public ProjectWorkspace resolve(
            ProjectSourceDescriptor source
    ) {
        if (
                source.location() == null
                || source.location().isBlank()
        ) {
            throw new IllegalArgumentException(
                    "Local project path is required."
            );
        }

        Path root = Path.of(source.location())
                .toAbsolutePath()
                .normalize();

        if (!Files.exists(root)) {
            throw new IllegalArgumentException(
                    "Project path does not exist: " + root
            );
        }

        if (!Files.isDirectory(root)) {
            throw new IllegalArgumentException(
                    "Project path is not a directory: " + root
            );
        }

        return new ProjectWorkspace(root);
    }
}
