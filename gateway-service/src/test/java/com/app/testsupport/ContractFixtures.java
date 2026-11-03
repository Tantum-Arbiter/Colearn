package com.app.testsupport;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

public final class ContractFixtures {

    private static final Path ROOT = Path.of("..", "contract-fixtures");
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ContractFixtures() {
    }

    public static Path path(String relative) {
        return ROOT.resolve(relative);
    }

    public static String read(String relative) {
        try {
            return Files.readString(path(relative));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public static JsonNode json(String relative) {
        try {
            return MAPPER.readTree(path(relative).toFile());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public static List<String> stories() {
        try (Stream<Path> files = Files.list(path("stories"))) {
            return files.map(p -> "stories/" + p.getFileName()).sorted().toList();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
