package com.app.model;

import com.app.testsupport.ContractFixtures;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;

import static org.junit.jupiter.api.Assertions.assertEquals;

class StoryPageAgeGroupTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final JsonNode CASES = ContractFixtures.json("age-group-text-cases.json");

    static Stream<Arguments> chains() {
        return StreamSupport.stream(((Iterable<Map.Entry<String, JsonNode>>) () -> CASES.get("chains").fields()).spliterator(), false)
                .map(e -> Arguments.of("unknown".equals(e.getKey()) ? null : e.getKey(),
                        MAPPER.convertValue(e.getValue(), new TypeReference<List<String>>() { })));
    }

    static Stream<Arguments> cases() {
        return StreamSupport.stream(CASES.get("cases").spliterator(), false)
                .map(c -> Arguments.of(c.get("name").asText(), c));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("chains")
    void ordersTheAgeGroupsLikeTheApp(String ageGroup, List<String> expected) {
        assertEquals(expected, StoryPage.ageGroupFallbackChain(ageGroup));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("cases")
    void resolvesTheSameTextAsTheApp(String name, JsonNode testCase) {
        StoryPage underTest = new StoryPage("p1", 1, testCase.get("fallback").asText());
        underTest.setLocalizedText(MAPPER.convertValue(testCase.get("text"), new TypeReference<Map<String, LocalizedText>>() { }));

        String language = testCase.get("language").isNull() ? null : testCase.get("language").asText();
        String ageGroup = testCase.get("ageGroup").isNull() ? null : testCase.get("ageGroup").asText();

        assertEquals(testCase.get("expected").asText(), underTest.getTextForLanguageAndAgeGroup(language, ageGroup), name);
    }
}
