package com.app.model;

import com.app.testsupport.ContractFixtures;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.firestore.encoding.CustomClassMapper;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.Iterator;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class StoryContractTest {

    private static final ObjectMapper MAPPER = new ObjectMapper().findAndRegisterModules();

    static List<String> stories() {
        return ContractFixtures.stories();
    }

    @ParameterizedTest
    @MethodSource("stories")
    void keepsEveryTranslationWhenReadFromCmsJson(String fixture) throws Exception {
        JsonNode source = ContractFixtures.json(fixture);

        Story underTest = MAPPER.readValue(ContractFixtures.read(fixture), Story.class);

        assertEveryTranslation(source, underTest);
    }

    @ParameterizedTest
    @MethodSource("stories")
    void keepsEveryTranslationWhenFirestoreReadsTheUploadedDocument(String fixture) {
        JsonNode source = ContractFixtures.json(fixture);
        Map<String, Object> uploaded = MAPPER.convertValue(source, new TypeReference<>() { });

        Story underTest = CustomClassMapper.convertToCustomClass(uploaded, Story.class, null);

        assertEveryTranslation(source, underTest);
    }

    @ParameterizedTest
    @MethodSource("stories")
    void keepsEveryTranslationThroughAFirestoreWriteAndRead(String fixture) throws Exception {
        JsonNode source = ContractFixtures.json(fixture);
        Story read = MAPPER.readValue(ContractFixtures.read(fixture), Story.class);

        Object stored = CustomClassMapper.serialize(read);
        Story underTest = CustomClassMapper.convertToCustomClass(stored, Story.class, null);

        assertEveryTranslation(source, underTest);
    }

    @ParameterizedTest
    @MethodSource("stories")
    void sendsTheAppEveryTranslationInTheSameShapeTheCmsWrote(String fixture) throws Exception {
        JsonNode source = ContractFixtures.json(fixture);
        Story story = MAPPER.readValue(ContractFixtures.read(fixture), Story.class);

        JsonNode sent = MAPPER.readTree(MAPPER.writeValueAsString(story));

        for (int i = 0; i < source.get("pages").size(); i++) {
            assertEquals(source.get("pages").get(i).get("localizedText"), sent.get("pages").get(i).get("localizedText"),
                    fixture + " page " + i);
        }
    }

    private static void assertEveryTranslation(JsonNode source, Story story) {
        assertNotNull(story.getPages());
        assertEquals(source.get("pages").size(), story.getPages().size());
        for (int i = 0; i < story.getPages().size(); i++) {
            JsonNode expected = source.get("pages").get(i).get("localizedText");
            Map<String, LocalizedText> actual = story.getPages().get(i).getLocalizedText();
            assertNotNull(actual, "page " + i + " lost its localizedText");
            assertFalse(actual.isEmpty(), "page " + i + " has no age groups");
            Iterator<String> groups = expected.fieldNames();
            while (groups.hasNext()) {
                String group = groups.next();
                JsonNode languages = expected.get(group);
                Iterator<String> codes = languages.fieldNames();
                while (codes.hasNext()) {
                    String code = codes.next();
                    assertEquals(languages.get(code).asText(), actual.get(group).getText(code),
                            "page " + i + " " + group + " " + code);
                }
            }
        }
    }
}
