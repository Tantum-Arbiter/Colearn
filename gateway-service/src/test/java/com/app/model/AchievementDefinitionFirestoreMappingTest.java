package com.app.model;

import com.google.cloud.firestore.encoding.CustomClassMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;

class AchievementDefinitionFirestoreMappingTest {

    private static final Map<String, Object> CMS_DOCUMENT = Map.ofEntries(
            Map.entry("id", "theme-calming"),
            Map.entry("version", 2L),
            Map.entry("status", "active"),
            Map.entry("family", "theme"),
            Map.entry("category", "calm"),
            Map.entry("rule", Map.of("kind", "finishedWithTag", "tags", List.of("calming"), "target", 2L)),
            Map.entry("points", 5L),
            Map.entry("art", "assets/badges/calming.webp"),
            Map.entry("copy", Map.of("title", Map.of("en", "Calm Collector"))),
            Map.entry("recommendation", Map.of("labelKey", "progress.recommendations.calming", "tag", "calming")),
            Map.entry("minAppVersion", "1.4.0"),
            Map.entry("uploadedBy", "cms"));

    @Test
    void readsEveryFieldTheCmsWrites() {
        AchievementDefinition underTest = CustomClassMapper.convertToCustomClass(CMS_DOCUMENT, AchievementDefinition.class, null);

        assertEquals("theme-calming", underTest.getId());
        assertEquals(2, underTest.getVersion());
        assertEquals("active", underTest.getStatus());
        assertEquals("theme", underTest.getFamily());
        assertEquals("calm", underTest.getCategory());
        assertEquals("finishedWithTag", underTest.getRule().get("kind"));
        assertEquals(5, underTest.getPoints());
        assertEquals("assets/badges/calming.webp", underTest.getArt());
        assertEquals(Map.of("title", Map.of("en", "Calm Collector")), underTest.getCopy());
        assertEquals("calming", underTest.getRecommendation().get("tag"));
        assertEquals("1.4.0", underTest.getMinAppVersion());
    }

    @Test
    void leavesOptionalFieldsEmptyWhenTheCmsOmitsThem() {
        AchievementDefinition underTest = CustomClassMapper.convertToCustomClass(
                Map.of("id", "x", "version", 1L, "rule", Map.of("kind", "storyAward")), AchievementDefinition.class, null);

        assertNull(underTest.getPoints());
        assertNull(underTest.getMinAppVersion());
        assertNull(underTest.getRecommendation());
    }

    @Test
    void neverStoresTheChecksumTheGatewayStampsForTheDevice() {
        AchievementDefinition definition = CustomClassMapper.convertToCustomClass(CMS_DOCUMENT, AchievementDefinition.class, null);
        definition.setChecksum("sum-2");

        @SuppressWarnings("unchecked")
        Map<String, Object> stored = (Map<String, Object>) CustomClassMapper.serialize(definition);

        assertFalse(stored.containsKey("checksum"));
    }

    @Test
    void sendsTheDeviceOnlyTheFieldsTheCmsSet() throws Exception {
        AchievementDefinition definition = CustomClassMapper.convertToCustomClass(
                Map.of("id", "x", "version", 1L, "rule", Map.of("kind", "storyAward")), AchievementDefinition.class, null);

        com.fasterxml.jackson.databind.JsonNode json = new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(definition);

        assertFalse(json.has("points"));
        assertFalse(json.has("minAppVersion"));
        assertFalse(json.has("checksum"));
    }
}
