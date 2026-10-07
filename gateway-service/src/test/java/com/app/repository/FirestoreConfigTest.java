package com.app.repository;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FirestoreConfigTest {

    private static final Path RULES = Path.of("firestore.rules");
    private static final Path INDEXES = Path.of("firestore.indexes.json");
    private static final Pattern COLLECTION = Pattern.compile("COLLECTION_NAME = \"([a-z_]+)\"");

    private static Set<String> collectionsTheGatewayUses() throws Exception {
        Set<String> names = new HashSet<>();
        try (Stream<Path> files = Files.walk(Path.of("src/main/java/com/app/repository"))) {
            for (Path file : files.filter(p -> p.toString().endsWith(".java")).toList()) {
                Matcher m = COLLECTION.matcher(Files.readString(file));
                while (m.find()) {
                    names.add(m.group(1));
                }
            }
        }
        return names;
    }

    @Test
    void deniesEveryClientReadAndWrite() throws Exception {
        String rules = Files.readString(RULES);

        assertTrue(rules.contains("match /{document=**}"));
        assertTrue(rules.contains("allow read, write: if false;"));
        assertFalse(rules.matches("(?s).*allow [a-z, ]+: if (?!false).*"), "a rule other than deny-all: " + rules);
    }

    @Test
    void indexesOnlyCollectionsTheGatewayUses() throws Exception {
        Set<String> real = collectionsTheGatewayUses();
        JsonNode config = new ObjectMapper().readTree(INDEXES.toFile());

        for (JsonNode index : config.get("indexes")) {
            assertTrue(real.contains(index.get("collectionGroup").asText()), index.toString());
        }
    }

    @Test
    void hasTheCompositeIndexTheSessionExpiryQueryNeeds() throws Exception {
        JsonNode config = new ObjectMapper().readTree(INDEXES.toFile());

        boolean found = false;
        for (JsonNode index : config.get("indexes")) {
            List<String> fields = new java.util.ArrayList<>();
            index.get("fields").forEach(f -> fields.add(f.get("fieldPath").asText()));
            if ("user_sessions".equals(index.get("collectionGroup").asText()) && fields.equals(List.of("isActive", "expiresAt"))) {
                found = true;
            }
        }
        assertTrue(found, "user_sessions (isActive, expiresAt) composite index is missing");
    }

    @Test
    void knowsTheCollectionNames() throws Exception {
        assertEquals(Set.of("users", "user_sessions", "user_profiles", "stories", "content_versions", "asset_versions", "consent_log"),
                collectionsTheGatewayUses());
    }

    @Test
    void letsFirestoreRemoveConsentLogEntriesOnceTheyExpire() throws Exception {
        JsonNode config = new ObjectMapper().readTree(INDEXES.toFile());

        boolean found = false;
        for (JsonNode override : config.get("fieldOverrides")) {
            if ("consent_log".equals(override.get("collectionGroup").asText())
                    && "expiresAt".equals(override.get("fieldPath").asText())
                    && override.path("ttl").asBoolean(false)) {
                found = true;
            }
        }
        assertTrue(found, "consent_log.expiresAt has no TTL policy");
    }
}
