package com.app.controller;

import com.app.config.GcsConfig.GcsProperties;
import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.model.AssetVersion;
import com.app.model.ContentVersion;
import com.app.model.Story;
import com.app.model.StoryPage;
import com.app.model.User;
import com.app.model.UserSession;
import com.app.security.RateLimitingFilter;
import com.app.service.SessionService;
import com.app.service.UserService;
import com.app.testing.TestSimulationFlags;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;

/**
 * Test-only admin endpoints to control server state during functional tests.
 * Available in 'test' profile (local/Docker) and 'gcp-dev' profile (GCP functional tests).
 */
@RestController
@RequestMapping("/private")
@Profile({"test", "gcp-dev"})
public class TestAdminController {

    private static final Logger logger = LoggerFactory.getLogger(TestAdminController.class);

    private final RateLimitingFilter rateLimitingFilter;
    private final TestSimulationFlags flags;
    private final CircuitBreakerRegistry circuitBreakerRegistry;

    @Autowired(required = false)
    private Firestore firestore;

    @Autowired(required = false)
    private UserService userService;

    @Autowired(required = false)
    private SessionService sessionService;

    @Autowired(required = false)
    private Storage storage;

    @Autowired(required = false)
    private GcsProperties gcsProperties;

    public TestAdminController(RateLimitingFilter rateLimitingFilter,
                               TestSimulationFlags flags,
                               CircuitBreakerRegistry circuitBreakerRegistry) {
        this.rateLimitingFilter = rateLimitingFilter;
        this.flags = flags;
        this.circuitBreakerRegistry = circuitBreakerRegistry;
    }

    /**
     * Reset server-side state that can affect cross-scenario behavior.
     */
    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> reset() {
        try {
            rateLimitingFilter.resetForTests();
            flags.reset();

            // Reset all circuit breakers so scenarios do not bleed state
            try {
                for (CircuitBreaker cb : circuitBreakerRegistry.getAllCircuitBreakers()) {
                    cb.reset();
                }
            } catch (Exception ex) {
                logger.warn("Failed to reset circuit breakers: {}", ex.getMessage());
            }

            // Seed test stories/assets - user data is NOT cleared so it persists for inspection
            if (firestore != null) {
                try {
                    clearCmsCollections();
                    seedTestStories();
                    seedTestAssets();
                    logger.info("Cleared CMS data and seeded test stories/assets");
                } catch (Exception ex) {
                    logger.warn("Failed to clear/seed Firestore data: {}", ex.getMessage());
                }
            }

            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "reset");
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            logger.warn("Failed to reset test state: {}", e.getMessage());
            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "partial");
            resp.put("error", e.getMessage());
            return ResponseEntity.ok(resp);
        }
    }

    /**
     * Clear CMS collections (stories, content_versions, asset_versions) for test data refresh.
     * User data (users, user_profiles, user_sessions) is NOT cleared so it persists for inspection.
     */
    private void clearCmsCollections() {
        try {
            int storiesDeleted = 0;
            int contentVersionsDeleted = 0;
            int assetVersionsDeleted = 0;

            // Clear stories collection
            for (var docRef : firestore.collection("stories").listDocuments()) {
                try {
                    docRef.delete().get();
                    storiesDeleted++;
                } catch (Exception e) {
                    logger.warn("Failed to delete stories document: {}", e.getMessage());
                }
            }

            // Clear content_versions collection
            for (var docRef : firestore.collection("content_versions").listDocuments()) {
                try {
                    docRef.delete().get();
                    contentVersionsDeleted++;
                } catch (Exception e) {
                    logger.warn("Failed to delete content_versions document: {}", e.getMessage());
                }
            }

            // Clear asset_versions collection
            for (var docRef : firestore.collection("asset_versions").listDocuments()) {
                try {
                    docRef.delete().get();
                    assetVersionsDeleted++;
                } catch (Exception e) {
                    logger.warn("Failed to delete asset_versions document: {}", e.getMessage());
                }
            }

            logger.info("Deleted {} stories, {} content_versions, {} asset_versions",
                    storiesDeleted, contentVersionsDeleted, assetVersionsDeleted);
        } catch (Exception e) {
            logger.error("Error clearing CMS collections", e);
        }
    }

    private void seedTestStories() {
        try {
            List<Story> testStories = createTestStories();
            Map<String, String> storyChecksums = new HashMap<>();

            for (Story story : testStories) {
                String checksum = calculateStoryChecksum(story);
                story.setChecksum(checksum);
                firestore.collection("stories").document(story.getId()).set(story).get();
                storyChecksums.put(story.getId(), checksum);
            }

            ContentVersion contentVersion = new ContentVersion();
            contentVersion.setId("current");
            contentVersion.setVersion(1);
            contentVersion.setLastUpdated(Instant.now());
            contentVersion.setStoryChecksums(storyChecksums);
            contentVersion.setTotalStories(testStories.size());

            firestore.collection("content_versions").document("current").set(contentVersion).get();

            logger.info("Seeded {} test stories and content version", testStories.size());
        } catch (Exception e) {
            logger.error("Error seeding test stories", e);
        }
    }

    private void seedTestAssets() {
        if (storage == null || gcsProperties == null) {
            logger.warn("Storage or GcsProperties not available, skipping asset seeding");
            return;
        }

        try {
            String bucket = gcsProperties.bucketName();
            Map<String, String> assetChecksums = new HashMap<>();

            // Create test bucket if it doesn't exist (for emulator)
            try {
                if (storage.get(bucket) == null) {
                    storage.create(com.google.cloud.storage.BucketInfo.of(bucket));
                    logger.info("Created test bucket: {}", bucket);
                }
            } catch (Exception e) {
                logger.debug("Bucket might already exist: {}", e.getMessage());
            }

            // Seed test assets for each story
            List<String[]> testAssets = List.of(
                new String[]{"stories/test-story-1/cover.webp", "image/webp"},
                new String[]{"stories/test-story-1/page-1/background.webp", "image/webp"},
                new String[]{"stories/test-story-1/page-2/background.webp", "image/webp"},
                new String[]{"stories/test-story-2/cover.webp", "image/webp"},
                new String[]{"stories/test-story-2/page-1/background.webp", "image/webp"},
                new String[]{"stories/test-story-3/cover.webp", "image/webp"}
            );

            for (String[] asset : testAssets) {
                String path = asset[0];
                String contentType = asset[1];

                // Create dummy content
                byte[] content = ("Test asset content for " + path).getBytes(StandardCharsets.UTF_8);
                String checksum = calculateAssetChecksum(content);

                BlobId blobId = BlobId.of(bucket, path);
                BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                        .setContentType(contentType)
                        .build();

                storage.create(blobInfo, content);
                logger.debug("Seeded asset to bucket '{}' with path '{}'", bucket, path);
                assetChecksums.put(path, checksum);
            }

            // Save asset version to Firestore
            AssetVersion assetVersion = new AssetVersion();
            assetVersion.setId("current");
            assetVersion.setVersion(1);
            assetVersion.setLastUpdated(Instant.now());
            assetVersion.setAssetChecksums(assetChecksums);
            assetVersion.setTotalAssets(testAssets.size());

            firestore.collection("asset_versions").document("current").set(assetVersion).get();

            logger.info("Seeded {} test assets and asset version", testAssets.size());
        } catch (Exception e) {
            logger.error("Error seeding test assets", e);
        }
    }

    private String calculateAssetChecksum(byte[] content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(content);
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            throw new RuntimeException("Failed to calculate checksum", e);
        }
    }

    private List<Story> createTestStories() {
        List<Story> stories = new ArrayList<>();

        Story story1 = new Story("test-story-1", "The Sleepy Bear", "bedtime");
        story1.setDescription("A cozy bedtime story about a sleepy bear");
        story1.setAgeRange("2-5");
        story1.setDuration(5);
        story1.setTag("Bedtime");
        story1.setEmoji("moon");
        story1.setAuthor("Test Author");
        story1.setTags(List.of("bedtime", "animals", "sleep"));
        story1.setPages(List.of(
            new StoryPage("page-1-1", 1, "Once upon a time, there was a sleepy bear."),
            new StoryPage("page-1-2", 2, "The bear yawned and stretched."),
            new StoryPage("page-1-3", 3, "Time for bed, said the bear.")
        ));
        stories.add(story1);

        Story story2 = new Story("test-story-2", "The Brave Bunny", "adventure");
        story2.setDescription("An adventure story about a brave bunny");
        story2.setAgeRange("3-6");
        story2.setDuration(6);
        story2.setTag("Adventure");
        story2.setEmoji("rabbit");
        story2.setAuthor("Test Author");
        story2.setTags(List.of("adventure", "animals", "courage"));
        story2.setPages(List.of(
            new StoryPage("page-2-1", 1, "Bunny hopped through the forest."),
            new StoryPage("page-2-2", 2, "She found a mysterious path."),
            new StoryPage("page-2-3", 3, "Bunny was brave and explored.")
        ));
        stories.add(story2);

        Story story3 = new Story("test-story-3", "Friends Forever", "friendship");
        story3.setDescription("A heartwarming story about friendship");
        story3.setAgeRange("2-5");
        story3.setDuration(4);
        story3.setTag("Friendship");
        story3.setEmoji("heart");
        story3.setAuthor("Test Author");
        story3.setTags(List.of("friendship", "kindness"));
        story3.setPages(List.of(
            new StoryPage("page-3-1", 1, "Two friends played together."),
            new StoryPage("page-3-2", 2, "They shared their toys."),
            new StoryPage("page-3-3", 3, "Best friends forever!")
        ));
        stories.add(story3);

        return stories;
    }

    private String calculateStoryChecksum(Story story) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            StringBuilder content = new StringBuilder();
            content.append(story.getId());
            content.append(story.getTitle());
            content.append(story.getCategory());
            content.append(story.getDescription() != null ? story.getDescription() : "");
            content.append(story.getVersion());

            if (story.getPages() != null) {
                story.getPages().forEach(page -> {
                    content.append(page.getId());
                    content.append(page.getText());
                    content.append(page.getPageNumber());
                });
            }

            byte[] hash = digest.digest(content.toString().getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            logger.error("Error calculating story checksum for: {}", story.getId(), e);
            throw new RuntimeException("Failed to calculate checksum", e);
        }
    }

    /**
     * Set simulation flags for this JVM (test profile only).
     */
    @PostMapping("/flags")
    public ResponseEntity<Map<String, Object>> setFlags(@RequestBody Map<String, Object> body) {
        if (body == null) body = new HashMap<>();

        try {
            // Downstream statuses and delays
            if (body.containsKey("googleOauthStatus")) {
                flags.setGoogleOauthStatus(asInteger(body.get("googleOauthStatus")));
            }
            if (body.containsKey("googleOauthDelayMs")) {
                flags.setGoogleOauthDelayMs(asLong(body.get("googleOauthDelayMs")));
            }
            if (body.containsKey("firebaseStatus")) {
                flags.setFirebaseStatus(asInteger(body.get("firebaseStatus")));
            }
            if (body.containsKey("gatewayTimeoutMs")) {
                flags.setGatewayTimeoutMs(asLong(body.get("gatewayTimeoutMs")));
            }
            if (body.containsKey("inboundTimeoutMs")) {
                flags.setInboundTimeoutMs(asLong(body.get("inboundTimeoutMs")));
            }
            if (body.containsKey("maintenanceMode")) {
                flags.setMaintenanceMode(Boolean.TRUE.equals(body.get("maintenanceMode")) ||
                        "true".equalsIgnoreCase(String.valueOf(body.get("maintenanceMode"))));
            }
            if (body.containsKey("circuitOpenGoogle")) {
                flags.setCircuitOpenGoogle(Boolean.TRUE.equals(body.get("circuitOpenGoogle")) ||
                        "true".equalsIgnoreCase(String.valueOf(body.get("circuitOpenGoogle"))));
            }
            if (body.containsKey("overloaded")) {
                flags.setOverloaded(Boolean.TRUE.equals(body.get("overloaded")) ||
                        "true".equalsIgnoreCase(String.valueOf(body.get("overloaded"))));
            }

            if (body.containsKey("authRateLimitPerMinute") || body.containsKey("apiRateLimitPerMinute")) {
                Integer authLimit = asInteger(body.get("authRateLimitPerMinute"));
                Integer apiLimit = asInteger(body.get("apiRateLimitPerMinute"));
                flags.setAuthRateLimitPerMinute(authLimit);
                flags.setApiRateLimitPerMinute(apiLimit);
                rateLimitingFilter.setRateLimitOverridesForTests(authLimit, apiLimit);
            }

            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "ok");
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "error");
            resp.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(resp);
        }
    }

    @GetMapping("/sleep")
    public ResponseEntity<Map<String, Object>> sleep(@RequestParam("ms") long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        Map<String, Object> resp = new HashMap<>();
        resp.put("sleptMs", ms);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/sleepAsync")
    public Callable<ResponseEntity<Map<String, Object>>> sleepAsync(@RequestParam("ms") long ms) {
        return () -> {
            try {
                Thread.sleep(ms);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            Map<String, Object> resp = new HashMap<>();
            resp.put("sleptMs", ms);
            return ResponseEntity.ok(resp);
        };
    }

    /**
     * Seed a single story to Firestore for functional testing.
     * This allows tests to seed specific story data without resetting all state.
     */
    @PostMapping("/seed/story")
    public ResponseEntity<Map<String, Object>> seedStory(@RequestBody Map<String, Object> storyData) {
        if (firestore == null) {
            return ResponseEntity.status(503).body(Map.of("error", "Firestore not available"));
        }

        try {
            String storyId = (String) storyData.get("id");
            if (storyId == null || storyId.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Story id is required"));
            }

            // Create Story object from the request data
            Story story = new Story();
            story.setId(storyId);
            story.setTitle((String) storyData.get("title"));
            story.setCategory((String) storyData.get("category"));
            story.setDescription((String) storyData.get("description"));
            story.setAgeRange((String) storyData.get("ageRange"));
            story.setTag((String) storyData.get("tag"));
            story.setEmoji((String) storyData.get("emoji"));
            story.setAuthor((String) storyData.get("author"));
            story.setCoverImage((String) storyData.get("coverImage"));

            if (storyData.get("duration") != null) {
                story.setDuration(((Number) storyData.get("duration")).intValue());
            }
            if (storyData.get("version") != null) {
                story.setVersion(((Number) storyData.get("version")).intValue());
            }
            if (storyData.get("isAvailable") != null) {
                story.setAvailable(Boolean.TRUE.equals(storyData.get("isAvailable")));
            }
            if (storyData.get("isPremium") != null) {
                story.setPremium(Boolean.TRUE.equals(storyData.get("isPremium")));
            }
            if (storyData.get("tags") instanceof List<?> tagsList) {
                story.setTags(tagsList.stream().map(Object::toString).toList());
            }

            // Parse pages
            if (storyData.get("pages") instanceof List<?> pagesList) {
                List<StoryPage> pages = new ArrayList<>();
                for (Object pageObj : pagesList) {
                    if (pageObj instanceof Map<?, ?> pageMap) {
                        StoryPage page = new StoryPage();
                        page.setId((String) pageMap.get("id"));
                        if (pageMap.get("pageNumber") != null) {
                            page.setPageNumber(((Number) pageMap.get("pageNumber")).intValue());
                        }
                        page.setType((String) pageMap.get("type"));
                        page.setText((String) pageMap.get("text"));
                        page.setBackgroundImage((String) pageMap.get("backgroundImage"));
                        pages.add(page);
                    }
                }
                story.setPages(pages);
            }

            // Calculate checksum if not provided
            String checksum = (String) storyData.get("checksum");
            if (checksum == null || checksum.isBlank()) {
                checksum = calculateStoryChecksum(story);
            }
            story.setChecksum(checksum);

            // Save story to Firestore
            firestore.collection("stories").document(storyId).set(story).get();

            // Update content version with new story checksum
            updateContentVersionWithStory(storyId, checksum);

            logger.info("Seeded story: {} with checksum: {}", storyId, checksum);

            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "created");
            resp.put("storyId", storyId);
            resp.put("checksum", checksum);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            logger.error("Failed to seed story", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Update the content version document with a new or updated story checksum.
     */
    private void updateContentVersionWithStory(String storyId, String checksum) {
        try {
            var docRef = firestore.collection("content_versions").document("current");
            var doc = docRef.get().get();

            ContentVersion contentVersion;
            Map<String, String> storyChecksums;

            if (doc.exists()) {
                contentVersion = doc.toObject(ContentVersion.class);
                storyChecksums = contentVersion.getStoryChecksums();
                if (storyChecksums == null) {
                    storyChecksums = new HashMap<>();
                }
            } else {
                contentVersion = new ContentVersion();
                contentVersion.setId("current");
                contentVersion.setVersion(1);
                storyChecksums = new HashMap<>();
            }

            storyChecksums.put(storyId, checksum);
            contentVersion.setStoryChecksums(storyChecksums);
            contentVersion.setTotalStories(storyChecksums.size());
            contentVersion.setLastUpdated(Instant.now());
            contentVersion.setVersion(contentVersion.getVersion() + 1);

            docRef.set(contentVersion).get();
        } catch (Exception e) {
            logger.warn("Failed to update content version for story {}: {}", storyId, e.getMessage());
        }
    }

    /**
     * Create a test user in Firestore (test profile only)
     */
    @PostMapping("/test/create-user")
    public ResponseEntity<Map<String, Object>> createTestUser(@RequestBody Map<String, Object> body) {
        if (firestore == null) {
            return ResponseEntity.status(503).body(Map.of("error", "Firestore not available"));
        }

        try {
            String userId = (String) body.get("userId");
            String provider = (String) body.get("provider");
            String providerId = (String) body.get("providerId");

            // Create user directly in Firestore (PII-free - no email/name)
            User user = new User();
            user.setId(userId != null ? userId : UUID.randomUUID().toString());
            user.setProvider(provider);
            user.setProviderId(providerId);
            user.setActive(true);
            user.setCreatedAt(Instant.now());
            user.setUpdatedAt(Instant.now());
            user.updateLastLogin();

            // Save directly to Firestore
            firestore.collection("users").document(user.getId()).set(user).get();

            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "created");
            resp.put("userId", user.getId());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            logger.error("Failed to create test user", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Create a test session in Firestore (test profile only)
     */
    @PostMapping("/test/create-session")
    public ResponseEntity<Map<String, Object>> createTestSession(@RequestBody Map<String, Object> body) {
        if (sessionService == null) {
            return ResponseEntity.status(503).body(Map.of("error", "SessionService not available"));
        }

        try {
            String sessionId = (String) body.get("sessionId");
            String userId = (String) body.get("userId");
            String refreshToken = (String) body.get("refreshToken");
            String deviceId = (String) body.get("deviceId");
            String deviceType = (String) body.get("deviceType");
            String platform = (String) body.get("platform");
            String appVersion = (String) body.get("appVersion");

            UserSession session = sessionService.createSession(
                userId,
                refreshToken,
                deviceId,
                deviceType != null ? deviceType : "mobile",
                platform != null ? platform : "ios",
                appVersion != null ? appVersion : "1.0.0"
            ).join();

            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "created");
            resp.put("sessionId", session.getId());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            logger.error("Failed to create test session", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    private Integer asInteger(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(v)); } catch (Exception e) { return null; }
    }

    private Long asLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        try { return Long.parseLong(String.valueOf(v)); } catch (Exception e) { return null; }
    }
}

