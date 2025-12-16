package com.app.controller;

import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
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
 */
@RestController
@RequestMapping("/private")
@Profile("test")
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

            // Clear Firestore test data and seed test stories
            if (firestore != null) {
                try {
                    clearFirestoreCollections();
                    seedTestStories();
                    logger.info("Cleared and seeded Firestore test data");
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
     * Clear Firestore collections for test isolation
     */
    private void clearFirestoreCollections() {
        try {
            int profilesDeleted = 0;
            int usersDeleted = 0;
            int sessionsDeleted = 0;

            // Clear user_profiles collection
            for (var docRef : firestore.collection("user_profiles").listDocuments()) {
                try {
                    docRef.delete().get();
                    profilesDeleted++;
                } catch (Exception e) {
                    logger.warn("Failed to delete user_profiles document: {}", e.getMessage());
                }
            }

            // Clear users collection
            for (var docRef : firestore.collection("users").listDocuments()) {
                try {
                    docRef.delete().get();
                    usersDeleted++;
                } catch (Exception e) {
                    logger.warn("Failed to delete users document: {}", e.getMessage());
                }
            }

            // Clear user_sessions collection
            for (var docRef : firestore.collection("user_sessions").listDocuments()) {
                try {
                    docRef.delete().get();
                    sessionsDeleted++;
                } catch (Exception e) {
                    logger.warn("Failed to delete user_sessions document: {}", e.getMessage());
                }
            }

            logger.info("Deleted {} profiles, {} users, {} sessions", profilesDeleted, usersDeleted, sessionsDeleted);
        } catch (Exception e) {
            logger.error("Error clearing Firestore collections", e);
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

