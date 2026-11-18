package com.app.service;

import com.app.testsupport.ContractFixtures;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

class StoryChecksumsTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    static List<String> stories() {
        return ContractFixtures.stories();
    }

    @ParameterizedTest
    @MethodSource("stories")
    void matchesTheChecksumTheCmsScriptsWrite(String fixture) {
        JsonNode expected = ContractFixtures.json("story-checksums.json");
        String file = fixture.substring("stories/".length());

        assertEquals(expected.get(file).asText(), StoryChecksums.of(ContractFixtures.json(fixture)));
    }

    @Test
    void writesCanonicalJsonWithSortedKeysAtEveryLevel() throws Exception {
        JsonNode value = MAPPER.readTree("{\"b\":1,\"a\":{\"d\":[2,{\"f\":1,\"e\":0}],\"c\":\"x\"}}");

        assertEquals("{\"a\":{\"c\":\"x\",\"d\":[2,{\"e\":0,\"f\":1}]},\"b\":1}", StoryChecksums.canonicalJson(value));
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "1.0 | 1",
            "0.481 | 0.481",
            "12 | 12",
            "-3.5 | -3.5",
            "0.1 | 0.1",
            "100.25 | 100.25",
            "0.000001 | 0.000001",
            "1e-7 | 1e-7",
            "1.5e-7 | 1.5e-7",
            "1e21 | 1e+21",
            "123456789012 | 123456789012"
    })
    void writesNumbersTheWayJavaScriptDoes(String json, String expected) throws Exception {
        assertEquals(expected, StoryChecksums.canonicalJson(MAPPER.readTree(json)));
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "\"plain\" | \"plain\"",
            "\"quote \\\" slash \\\\\" | \"quote \\\" slash \\\\\"",
            "\"line\\nbreak\\ttab\" | \"line\\nbreak\\ttab\"",
            "\"\\u0001\" | \"\\u0001\"",
            "\"\\u001f\" | \"\\u001f\"",
            "\"Łódź / القمر 🌙\" | \"Łódź / القمر 🌙\"",
            "\"\\b\\f\\r\" | \"\\b\\f\\r\""
    })
    void writesStringsTheWayJavaScriptDoes(String json, String expected) throws Exception {
        assertEquals(expected, StoryChecksums.canonicalJson(MAPPER.readTree(json)));
    }

    @ParameterizedTest
    @ValueSource(strings = {"checksum", "createdAt", "updatedAt", "version"})
    void ignoresMetadata(String field) {
        ObjectNode story = (ObjectNode) ContractFixtures.json("stories/reading-story-1.json");
        String before = StoryChecksums.of(story);

        story.put(field, "something else");

        assertEquals(before, StoryChecksums.of(story));
    }

    @ParameterizedTest
    @ValueSource(strings = {"isFree", "isPremium", "isAvailable", "title", "coverImage"})
    void changesWhenContentChanges(String field) {
        ObjectNode story = (ObjectNode) ContractFixtures.json("stories/reading-story-1.json");
        String before = StoryChecksums.of(story);

        story.put(field, "changed");

        assertNotEquals(before, StoryChecksums.of(story));
    }
}
