package com.automationhub.platform.filesystem;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/filesystem")
public class FileSystemController {

    @GetMapping("/roots")
    public List<Map<String, String>> roots() {
        return Arrays.stream(File.listRoots())
                .map(File::toPath)
                .map(path -> Map.of(
                        "name", path.toString(),
                        "path", path.toAbsolutePath().normalize().toString()
                ))
                .toList();
    }

    @GetMapping("/directories")
    public DirectoryResponse directories(
            @RequestParam String path
    ) {
        Path requested = Paths.get(path)
                .toAbsolutePath()
                .normalize();

        if (!Files.exists(requested)) {
            throw new IllegalArgumentException(
                    "Path does not exist: " + requested
            );
        }

        if (!Files.isDirectory(requested)) {
            throw new IllegalArgumentException(
                    "Path is not a directory: " + requested
            );
        }

        try (var stream = Files.list(requested)) {
            List<DirectoryItem> children = stream
                    .filter(Files::isDirectory)
                    .filter(this::isVisible)
                    .sorted(
                            Comparator.comparing(
                                    item ->
                                            item.getFileName()
                                                    .toString()
                                                    .toLowerCase()
                            )
                    )
                    .map(child -> new DirectoryItem(
                            child.getFileName().toString(),
                            child.toAbsolutePath()
                                    .normalize()
                                    .toString()
                    ))
                    .toList();

            Path parent = requested.getParent();

            return new DirectoryResponse(
                    requested.toString(),
                    parent != null
                            ? parent.toString()
                            : null,
                    children
            );

        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Unable to browse path: " + requested,
                    exception
            );
        }
    }

    private boolean isVisible(Path path) {
        try {
            return !Files.isHidden(path);
        } catch (Exception ignored) {
            return true;
        }
    }

    public record DirectoryItem(
            String name,
            String path
    ) {}

    public record DirectoryResponse(
            String currentPath,
            String parentPath,
            List<DirectoryItem> directories
    ) {}
}
