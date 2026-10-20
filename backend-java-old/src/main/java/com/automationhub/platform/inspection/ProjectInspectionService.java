package com.automationhub.platform.inspection;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.automationhub.platform.framework.TestFrameworkAdapter;
import com.automationhub.platform.project.model.BuildToolDescriptor;
import com.automationhub.platform.project.model.FrameworkDescriptor;
import com.automationhub.platform.project.model.ProjectManifest;
import com.automationhub.platform.project.model.ProjectSourceDescriptor;
import com.automationhub.platform.project.model.RuntimeRequirement;
import com.automationhub.platform.project.model.TestCatalog;
import com.automationhub.platform.project.model.TestContainerDescriptor;
import com.automationhub.platform.project.model.TestSelectorDescriptor;
import com.automationhub.platform.source.ProjectSourceResolver;

@Service
public class ProjectInspectionService {

    private final List<ProjectSourceResolver>
            sourceResolvers;

    private final List<RuntimeDetector>
            runtimeDetectors;

    private final List<BuildToolDetector>
            buildToolDetectors;

    private final List<TestFrameworkAdapter>
            frameworkAdapters;

    public ProjectInspectionService(
            List<ProjectSourceResolver> sourceResolvers,
            List<RuntimeDetector> runtimeDetectors,
            List<BuildToolDetector> buildToolDetectors,
            List<TestFrameworkAdapter> frameworkAdapters
    ) {
        this.sourceResolvers = sourceResolvers;
        this.runtimeDetectors = runtimeDetectors;
        this.buildToolDetectors = buildToolDetectors;
        this.frameworkAdapters = frameworkAdapters;
    }

    public ProjectManifest inspect(
            String projectName,
            ProjectSourceDescriptor source
    ) {
        ProjectWorkspace workspace =
                resolveWorkspace(source);

        List<RuntimeRequirement> runtimes =
                runtimeDetectors.stream()
                        .flatMap(
                                detector ->
                                        detector.detect(workspace)
                                                .stream()
                        )
                        .distinct()
                        .toList();

        List<BuildToolDescriptor> buildTools =
                buildToolDetectors.stream()
                        .flatMap(
                                detector ->
                                        detector.detect(workspace)
                                                .stream()
                        )
                        .distinct()
                        .toList();

        List<TestFrameworkAdapter>
                supportedFrameworks =
                frameworkAdapters.stream()
                        .filter(
                                adapter ->
                                        adapter.supports(
                                                workspace
                                        )
                        )
                        .toList();

        List<FrameworkDescriptor> frameworks =
                supportedFrameworks.stream()
                        .map(
                                adapter ->
                                        adapter.inspect(
                                                workspace
                                        )
                        )
                        .toList();

        TestCatalog testCatalog =
                mergeCatalogs(
                        supportedFrameworks.stream()
                                .map(
                                        adapter ->
                                                adapter.discoverTests(
                                                        workspace
                                                )
                                )
                                .toList()
                );

        String status;

        if (frameworks.isEmpty()) {
            status = "UNSUPPORTED";
        } else if (
                runtimes.isEmpty()
                || buildTools.isEmpty()
        ) {
            status = "PARTIAL";
        } else {
            status = "INSPECTED";
        }

        return new ProjectManifest(
                UUID.randomUUID().toString(),
                projectName,
                source,
                runtimes,
                buildTools,
                frameworks,
                testCatalog,
                List.of(),
                status
        );
    }

    private ProjectWorkspace resolveWorkspace(
            ProjectSourceDescriptor source
    ) {
        return sourceResolvers.stream()
                .filter(
                        resolver ->
                                resolver.supports(
                                        source.type()
                                )
                )
                .findFirst()
                .orElseThrow(
                        () ->
                                new IllegalArgumentException(
                                        "No source resolver registered for: "
                                                + source.type()
                                )
                )
                .resolve(source);
    }

    private TestCatalog mergeCatalogs(
            List<TestCatalog> catalogs
    ) {
        List<TestContainerDescriptor> containers =
                new ArrayList<>();

        Set<String> labels =
                new LinkedHashSet<>();

        List<TestSelectorDescriptor> selectors =
                new ArrayList<>();

        int testCount = 0;

        for (TestCatalog catalog : catalogs) {
            containers.addAll(
                    catalog.containers()
            );

            labels.addAll(
                    catalog.labels()
            );

            selectors.addAll(
                    catalog.selectors()
            );

            testCount +=
                    catalog.testCount();
        }

        return new TestCatalog(
                containers,
                List.copyOf(labels),
                selectors.stream()
                        .distinct()
                        .toList(),
                testCount
        );
    }
}
