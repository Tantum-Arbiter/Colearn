package com.app.model;

import com.app.testsupport.ContractFixtures;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.cloud.firestore.encoding.CustomClassMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.Comparator;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LearningChallengeContractTest {

    private static final ObjectMapper MAPPER = new ObjectMapper().findAndRegisterModules();

    /** A CMS may write a coordinate as 0 where the model holds a double: the same number either way. */
    private static final Comparator<JsonNode> BY_VALUE = (a, b) -> {
        if (a.isNumber() && b.isNumber()) return a.decimalValue().compareTo(b.decimalValue());
        return a.equals(b) ? 0 : 1;
    };

    static List<String> stories() {
        return ContractFixtures.stories();
    }

    @Test
    void theFixturesIncludeABookWithLearningChallenges() {
        boolean any = stories().stream().anyMatch(fixture -> challengePages(ContractFixtures.json(fixture)) > 0);

        assertTrue(any, "no contract fixture carries a learning_challenge page");
    }

    @ParameterizedTest
    @MethodSource("stories")
    void sendsTheAppEveryChallengeExactlyAsTheCmsWroteIt(String fixture) throws Exception {
        JsonNode source = ContractFixtures.json(fixture);
        Story story = MAPPER.readValue(ContractFixtures.read(fixture), Story.class);

        JsonNode sent = MAPPER.readTree(MAPPER.writeValueAsString(story));

        assertEveryChallenge(source, sent, fixture);
    }

    @ParameterizedTest
    @MethodSource("stories")
    void keepsEveryChallengeThroughAFirestoreWriteAndRead(String fixture) throws Exception {
        JsonNode source = ContractFixtures.json(fixture);
        Map<String, Object> uploaded = MAPPER.convertValue(source, new TypeReference<>() { });
        Story read = CustomClassMapper.convertToCustomClass(uploaded, Story.class, null);

        Object stored = CustomClassMapper.serialize(read);
        Story underTest = CustomClassMapper.convertToCustomClass(stored, Story.class, null);

        assertEveryChallenge(source, MAPPER.readTree(MAPPER.writeValueAsString(underTest)), fixture);
    }

    @Test
    void aSceneItemKeepsItsHotspotAndNeedsNoPicture() throws Exception {
        String json = "{\"id\":\"hook-1\",\"label\":{\"en\":\"first hook\"},\"hotspot\":{\"position\":{\"x\":0.3,\"y\":0.25},\"size\":{\"width\":0.08,\"height\":0.12}}}";
        LearningChallenge.Item item = MAPPER.readValue(json, LearningChallenge.Item.class);

        Map<String, Object> uploaded = MAPPER.convertValue(MAPPER.readTree(json), new TypeReference<>() { });
        LearningChallenge.Item stored = CustomClassMapper.convertToCustomClass(CustomClassMapper.serialize(CustomClassMapper.convertToCustomClass(uploaded, LearningChallenge.Item.class, null)), LearningChallenge.Item.class, null);

        assertNull(item.getImage());
        assertEquals(0.3, item.getHotspot().getPosition().getX());
        assertEquals(0.12, item.getHotspot().getSize().getHeight());
        assertTrue(MAPPER.readTree(json).equals(BY_VALUE, MAPPER.readTree(MAPPER.writeValueAsString(item))), MAPPER.writeValueAsString(item));
        assertEquals(item, stored);
        assertEquals(item.hashCode(), stored.hashCode());
    }

    @ParameterizedTest
    @MethodSource("stories")
    void aPageWithoutAChallengeSendsNone(String fixture) throws Exception {
        JsonNode source = ContractFixtures.json(fixture);
        Story story = MAPPER.readValue(ContractFixtures.read(fixture), Story.class);

        JsonNode sent = MAPPER.readTree(MAPPER.writeValueAsString(story));

        for (int i = 0; i < source.get("pages").size(); i++) {
            if (!source.get("pages").get(i).has("learningChallenge")) {
                assertNull(sent.get("pages").get(i).get("learningChallenge"), fixture + " page " + i);
                assertNull(story.getPages().get(i).getLearningChallenge(), fixture + " page " + i);
            }
        }
    }

    private static int challengePages(JsonNode story) {
        int count = 0;
        for (JsonNode page : story.get("pages")) {
            if (page.has("learningChallenge")) count++;
        }
        return count;
    }

    private static void assertEveryChallenge(JsonNode source, JsonNode sent, String fixture) {
        for (int i = 0; i < source.get("pages").size(); i++) {
            JsonNode expected = source.get("pages").get(i).get("learningChallenge");
            if (expected == null) continue;
            assertEquals("learning_challenge", sent.get("pages").get(i).get("interactionType").asText(), fixture + " page " + i);
            JsonNode actual = sent.get("pages").get(i).get("learningChallenge");
            assertTrue(expected.equals(BY_VALUE, actual), fixture + " page " + i + "\nexpected: " + expected + "\nbut was:  " + actual);
            assertFalse(expected.get("items").isEmpty(), fixture + " page " + i + " has no items");
        }
    }
}
