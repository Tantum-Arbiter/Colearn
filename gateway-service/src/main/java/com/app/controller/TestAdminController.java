package com.app.controller;

import com.app.config.GcsConfig.GcsProperties;
import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.model.AssetVersion;
import com.app.model.ContentVersion;
import com.app.model.InteractiveElement;
import com.app.model.LocalizedText;
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

@RestController
@RequestMapping("/private")
@Profile({"test", "gcp-dev"})
public class TestAdminController {

    private static final Logger logger = LoggerFactory.getLogger(TestAdminController.class);
    private static volatile boolean firestoreSeeded = false;

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

    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> reset(
            @org.springframework.web.bind.annotation.RequestParam(name = "force", required = false) String forceParam,
            @org.springframework.web.bind.annotation.RequestParam(name = "clearOnly", required = false) String clearOnlyParam) {
        boolean force = "true".equalsIgnoreCase(forceParam);
        boolean clearOnly = "true".equalsIgnoreCase(clearOnlyParam);
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

            // Handle CMS data based on parameters
            boolean shouldClearAndSeed = firestore != null && (force || !firestoreSeeded);
            boolean shouldClearOnly = firestore != null && clearOnly;

            if (shouldClearOnly) {
                try {
                    // When clearOnly, only clear stories/content_versions, preserve asset_versions
                    clearCmsCollections(true);
                    logger.info("Cleared CMS story collections (clearOnly=true)");
                } catch (Exception ex) {
                    logger.warn("Failed to clear Firestore data: {}", ex.getMessage());
                }
            } else if (shouldClearAndSeed) {
                try {
                    // Clear all CMS collections including assets
                    clearCmsCollections(false);
                    seedTestStories();
                    seedTestAssets();
                    firestoreSeeded = true;
                    logger.info("Cleared CMS data and seeded test stories/assets (force={}, firestoreSeeded={})", force, firestoreSeeded);
                } catch (Exception ex) {
                    logger.warn("Failed to clear/seed Firestore data: {}", ex.getMessage());
                }
            } else {
                logger.debug("Skipping Firestore seeding (already done this run)");
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

    private void clearCmsCollections(boolean storiesOnly) {
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

            // Clear asset_versions collection (unless storiesOnly)
            if (!storiesOnly) {
                for (var docRef : firestore.collection("asset_versions").listDocuments()) {
                    try {
                        docRef.delete().get();
                        assetVersionsDeleted++;
                    } catch (Exception e) {
                        logger.warn("Failed to delete asset_versions document: {}", e.getMessage());
                    }
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
            contentVersion.setLastUpdated(com.google.cloud.Timestamp.now());
            contentVersion.setStoryChecksums(storyChecksums);
            contentVersion.setTotalStories(testStories.size());

            firestore.collection("content_versions").document("current").set(contentVersion).get();

            logger.info("Seeded {} test stories and content version", testStories.size());
        } catch (Exception e) {
            logger.error("Error seeding test stories", e);
        }
    }

    private void seedTestAssets() {
        // Define test assets
        List<String[]> testAssets = List.of(
            new String[]{"stories/test-story-1/cover.webp", "image/webp"},
            new String[]{"stories/test-story-1/page-1/background.webp", "image/webp"},
            new String[]{"stories/test-story-1/page-2/background.webp", "image/webp"},
            new String[]{"stories/test-story-2/cover.webp", "image/webp"},
            new String[]{"stories/test-story-2/page-1/background.webp", "image/webp"},
            new String[]{"stories/test-story-3/cover.webp", "image/webp"}
        );

        Map<String, String> assetChecksums = new HashMap<>();

        // Generate checksums for all assets (needed for Firestore even if GCS fails)
        for (String[] asset : testAssets) {
            String path = asset[0];
            byte[] content = ("Test asset content for " + path).getBytes(StandardCharsets.UTF_8);
            String checksum = calculateAssetChecksum(content);
            assetChecksums.put(path, checksum);
        }

        // Try to seed to GCS if storage is available (optional - may fail in emulator)
        if (storage != null && gcsProperties != null) {
            try {
                String bucket = gcsProperties.bucketName();

                // Create test bucket if it doesn't exist (for emulator)
                try {
                    if (storage.get(bucket) == null) {
                        storage.create(com.google.cloud.storage.BucketInfo.of(bucket));
                        logger.info("Created test bucket: {}", bucket);
                    }
                } catch (Exception e) {
                    logger.debug("Bucket might already exist: {}", e.getMessage());
                }

                for (String[] asset : testAssets) {
                    String path = asset[0];
                    String contentType = asset[1];
                    byte[] content = ("Test asset content for " + path).getBytes(StandardCharsets.UTF_8);

                    BlobId blobId = BlobId.of(bucket, path);
                    BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                            .setContentType(contentType)
                            .build();

                    storage.create(blobInfo, content);
                    logger.debug("Seeded asset to bucket '{}' with path '{}'", bucket, path);
                }
                logger.info("Seeded {} test assets to GCS bucket", testAssets.size());
            } catch (Exception e) {
                logger.warn("Failed to seed assets to GCS (continuing with Firestore seeding): {}", e.getMessage());
            }
        } else {
            logger.debug("Storage not available, skipping GCS upload");
        }

        // Always save asset version to Firestore (even if GCS upload failed)
        if (firestore != null) {
            try {
                AssetVersion assetVersion = new AssetVersion();
                assetVersion.setId("current");
                assetVersion.setVersion(1);
                assetVersion.setLastUpdated(Instant.now());
                assetVersion.setAssetChecksums(assetChecksums);
                assetVersion.setTotalAssets(testAssets.size());

                firestore.collection("asset_versions").document("current").set(assetVersion).get();
                logger.info("Seeded asset_versions document with {} assets", testAssets.size());
            } catch (Exception e) {
                logger.error("Error seeding asset_versions to Firestore", e);
            }
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

        // Story 1: The Sleepy Bear (with localized content for i18n testing)
        Story story1 = new Story("test-story-1", "The Sleepy Bear", "bedtime");
        story1.setDescription("A cozy bedtime story about a sleepy bear");
        story1.setAgeRange("2-5");
        story1.setDuration(5);
        story1.setTag("Bedtime");
        story1.setEmoji("moon");
        story1.setAuthor("Test Author");
        story1.setTags(List.of("bedtime", "animals", "sleep"));

        // Add localized title and description for i18n testing
        story1.setLocalizedTitle(new LocalizedText(
            "The Sleepy Bear",
            "Śpiący Miś",
            "El Oso Dormido",
            "Der schläfrige Bär",
            "L'Ours Endormi",
            "L'Orso Assonnato",
            "O Urso Sonolento",
            "眠いクマ",
            "الدب النعسان",
            "Uyku Ayısı",
            "De Slaperige Beer",
            "Den Søvnige Bjørn",
            "Ursus Somnolentus",
            "困倦的熊"
        ));
        story1.setLocalizedDescription(new LocalizedText(
            "A cozy bedtime story about a sleepy bear",
            "Przytulna historia na dobranoc o śpiącym misiu",
            "Un cuento acogedor para dormir sobre un oso dormido",
            "Eine gemütliche Gute-Nacht-Geschichte über einen schläfrigen Bären",
            "Une histoire de coucher confortable sur un ours endormi",
            "Una storia della buonanotte accogliente su un orso assonnato",
            "Uma história aconchegante de dormir sobre um urso sonolento",
            "眠いクマについての居心地の良い就寝時の物語",
            "قصة نوم مريحة عن دب نعسان",
            "Uyku Ayısı hakkında rahat bir uyku saati hikayesi",
            "Een gezellig slaapverhaal over een slaperige beer",
            "En hyggelig godnathistorie om en søvnig bjørn",
            "Fabula somni cozy de urso somnolento",
            "关于一只困倦的熊的舒适睡前故事"
        ));

        // Create pages with localized text
        StoryPage page1 = new StoryPage("page-1-1", 1, "Once upon a time, there was a sleepy bear.");
        page1.setLocalizedText(new LocalizedText(
            "Once upon a time, there was a sleepy bear.",
            "Dawno, dawno temu żył sobie śpiący miś.",
            "Había una vez un oso muy dormido.",
            "Es war einmal ein schläfriger Bär.",
            "Il y avait une fois un ours très endormi.",
            "C'era una volta un orso molto assonnato.",
            "Era uma vez um urso muito sonolento.",
            "昔々、とても眠いクマがいました。",
            "كان هناك ذات مرة دب نعسان جداً.",
            "Bir zamanlar çok uyku ayısı vardı.",
            "Er was eens een erg slaperige beer.",
            "Der var engang en meget søvnig bjørn.",
            "Olim erat ursus valde somnolentus.",
            "从前有一只非常困倦的熊。"
        ));

        StoryPage page2 = new StoryPage("page-1-2", 2, "The bear yawned and stretched.");
        page2.setBackgroundImage("assets/stories/test-story-1/page-2/background.webp");
        page2.setLocalizedText(new LocalizedText(
            "The bear yawned and stretched.",
            "Miś ziewnął i przeciągnął się.",
            "El oso bostezó y se estiró.",
            "Der Bär gähnte und streckte sich.",
            "L'ours a bâillé et s'est étiré.",
            "L'orso ha sbadigliato e si è allungato.",
            "O urso bocejou e se espreguiçou.",
            "クマはあくびをして伸びをしました。",
            "تثاءب الدب وتمدد.",
            "Ayı esnedi ve uzandı.",
            "De beer geeuwde en rekte zich uit.",
            "Bjørnen gjalp og strakte sig.",
            "Ursus oscitavit et se extendit.",
            "熊打了个哈欠，伸了个懒腰。"
        ));

        // Add interactive element to page 2 for functional tests
        InteractiveElement doorElement = new InteractiveElement("door", "reveal", "assets/stories/test-story-1/page-2/door-open.webp");
        doorElement.setPosition(new InteractiveElement.Position(0.481, 0.337));
        doorElement.setSize(new InteractiveElement.Size(0.273, 0.301));
        page2.setInteractiveElements(List.of(doorElement));

        StoryPage page3 = new StoryPage("page-1-3", 3, "Time for bed, said the bear.");
        page3.setLocalizedText(new LocalizedText(
            "Time for bed, said the bear.",
            "Pora spać, powiedział miś.",
            "Es hora de dormir, dijo el oso.",
            "Zeit für's Bett, sagte der Bär.",
            "C'est l'heure du lit, dit l'ours.",
            "È ora di andare a letto, disse l'orso.",
            "É hora de dormir, disse o urso.",
            "寝る時間だ、とクマは言いました。",
            "حان وقت النوم، قال الدب.",
            "Yatış zamanı, dedi ayı.",
            "Tijd voor bed, zei de beer.",
            "Tid til at gå i seng, sagde bjørnen.",
            "Tempus cubile, inquit ursus.",
            "该睡觉了，熊说。"
        ));

        story1.setPages(List.of(page1, page2, page3));
        stories.add(story1);

        // Story 2: The Brave Bunny
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

        // Story 3: Friends Forever
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
            content.append(serializeLocalizedText(story.getLocalizedTitle()));
            content.append(story.getCategory());
            content.append(story.getDescription() != null ? story.getDescription() : "");
            content.append(serializeLocalizedText(story.getLocalizedDescription()));
            content.append(story.getVersion());

            if (story.getPages() != null) {
                story.getPages().forEach(page -> {
                    content.append(page.getId());
                    content.append(page.getText());
                    content.append(serializeLocalizedText(page.getLocalizedText()));
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

    private String serializeLocalizedText(LocalizedText localizedText) {
        if (localizedText == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        if (localizedText.getEn() != null) sb.append("en:").append(localizedText.getEn()).append("|");
        if (localizedText.getPl() != null) sb.append("pl:").append(localizedText.getPl()).append("|");
        if (localizedText.getEs() != null) sb.append("es:").append(localizedText.getEs()).append("|");
        if (localizedText.getDe() != null) sb.append("de:").append(localizedText.getDe()).append("|");
        return sb.toString();
    }

    private LocalizedText parseLocalizedText(Map<?, ?> map) {
        LocalizedText lt = new LocalizedText();
        if (map.get("en") != null) lt.setEn((String) map.get("en"));
        if (map.get("pl") != null) lt.setPl((String) map.get("pl"));
        if (map.get("es") != null) lt.setEs((String) map.get("es"));
        if (map.get("de") != null) lt.setDe((String) map.get("de"));
        if (map.get("fr") != null) lt.setFr((String) map.get("fr"));
        if (map.get("it") != null) lt.setIt((String) map.get("it"));
        if (map.get("pt") != null) lt.setPt((String) map.get("pt"));
        if (map.get("ja") != null) lt.setJa((String) map.get("ja"));
        if (map.get("ar") != null) lt.setAr((String) map.get("ar"));
        if (map.get("tr") != null) lt.setTr((String) map.get("tr"));
        if (map.get("nl") != null) lt.setNl((String) map.get("nl"));
        if (map.get("da") != null) lt.setDa((String) map.get("da"));
        if (map.get("la") != null) lt.setLa((String) map.get("la"));
        if (map.get("zh") != null) lt.setZh((String) map.get("zh"));
        return lt;
    }

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

            if (storyData.get("localizedTitle") instanceof Map<?, ?> localizedTitleMap) {
                story.setLocalizedTitle(parseLocalizedText(localizedTitleMap));
            }
            if (storyData.get("localizedDescription") instanceof Map<?, ?> localizedDescMap) {
                story.setLocalizedDescription(parseLocalizedText(localizedDescMap));
            }
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
                        page.setCharacterImage((String) pageMap.get("characterImage"));

                        if (pageMap.get("localizedText") instanceof Map<?, ?> localizedTextMap) {
                            page.setLocalizedText(parseLocalizedText(localizedTextMap));
                        }

                        // Parse interactiveElements
                        if (pageMap.get("interactiveElements") instanceof List<?> elementsList) {
                            List<InteractiveElement> elements = new ArrayList<>();
                            for (Object elemObj : elementsList) {
                                if (elemObj instanceof Map<?, ?> elemMap) {
                                    InteractiveElement elem = new InteractiveElement();
                                    elem.setId((String) elemMap.get("id"));
                                    elem.setType((String) elemMap.get("type"));
                                    elem.setImage((String) elemMap.get("image"));

                                    // Parse position
                                    if (elemMap.get("position") instanceof Map<?, ?> posMap) {
                                        InteractiveElement.Position pos = new InteractiveElement.Position();
                                        if (posMap.get("x") != null) {
                                            pos.setX(((Number) posMap.get("x")).doubleValue());
                                        }
                                        if (posMap.get("y") != null) {
                                            pos.setY(((Number) posMap.get("y")).doubleValue());
                                        }
                                        elem.setPosition(pos);
                                    }

                                    // Parse size
                                    if (elemMap.get("size") instanceof Map<?, ?> sizeMap) {
                                        InteractiveElement.Size size = new InteractiveElement.Size();
                                        if (sizeMap.get("width") != null) {
                                            size.setWidth(((Number) sizeMap.get("width")).doubleValue());
                                        }
                                        if (sizeMap.get("height") != null) {
                                            size.setHeight(((Number) sizeMap.get("height")).doubleValue());
                                        }
                                        elem.setSize(size);
                                    }

                                    elements.add(elem);
                                }
                            }
                            page.setInteractiveElements(elements);
                        }

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

            firestore.collection("stories").document(storyId).set(story).get();
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
            contentVersion.setLastUpdated(com.google.cloud.Timestamp.now());
            contentVersion.setVersion(contentVersion.getVersion() + 1);

            docRef.set(contentVersion).get();
        } catch (Exception e) {
            logger.warn("Failed to update content version for story {}: {}", storyId, e.getMessage());
        }
    }

    @PostMapping("/rebuild-content-version")
    public ResponseEntity<Map<String, Object>> rebuildContentVersion() {
        if (firestore == null) {
            return ResponseEntity.status(503).body(Map.of("error", "Firestore not available"));
        }

        try {
            logger.info("Rebuilding content version from actual stories in Firestore...");

            // Get all stories from Firestore
            var storiesSnapshot = firestore.collection("stories").get().get();
            Map<String, String> storyChecksums = new HashMap<>();
            List<String> storyIds = new ArrayList<>();

            for (var doc : storiesSnapshot.getDocuments()) {
                Story story = doc.toObject(Story.class);
                if (story != null && story.getId() != null) {
                    String checksum = calculateStoryChecksum(story);
                    storyChecksums.put(story.getId(), checksum);
                    storyIds.add(story.getId());
                    logger.debug("Found story: {} with checksum: {}", story.getId(), checksum);
                }
            }

            // Get current content version to preserve version number continuity
            var docRef = firestore.collection("content_versions").document("current");
            var doc = docRef.get().get();

            int newVersion = 1;
            List<String> removedStoryIds = new ArrayList<>();

            if (doc.exists()) {
                ContentVersion existing = doc.toObject(ContentVersion.class);
                if (existing != null) {
                    newVersion = existing.getVersion() + 1;

                    // Find stories that were in the old version but not in the new one
                    if (existing.getStoryChecksums() != null) {
                        for (String oldStoryId : existing.getStoryChecksums().keySet()) {
                            if (!storyChecksums.containsKey(oldStoryId)) {
                                removedStoryIds.add(oldStoryId);
                            }
                        }
                    }
                }
            }

            // Create new content version
            ContentVersion contentVersion = new ContentVersion();
            contentVersion.setId("current");
            contentVersion.setVersion(newVersion);
            contentVersion.setLastUpdated(com.google.cloud.Timestamp.now());
            contentVersion.setStoryChecksums(storyChecksums);
            contentVersion.setTotalStories(storyChecksums.size());

            // Save to Firestore
            docRef.set(contentVersion).get();

            logger.info("Rebuilt content version: version={}, totalStories={}, removedStories={}",
                    newVersion, storyChecksums.size(), removedStoryIds);

            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "rebuilt");
            resp.put("version", newVersion);
            resp.put("totalStories", storyChecksums.size());
            resp.put("storyIds", storyIds);
            resp.put("removedStoryIds", removedStoryIds);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            logger.error("Failed to rebuild content version", e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/delete/story/{storyId}")
    public ResponseEntity<Map<String, Object>> deleteStory(@org.springframework.web.bind.annotation.PathVariable String storyId) {
        if (firestore == null) {
            return ResponseEntity.status(503).body(Map.of("error", "Firestore not available"));
        }

        try {
            logger.info("Deleting story: {}", storyId);
            firestore.collection("stories").document(storyId).delete().get();
            var docRef = firestore.collection("content_versions").document("current");
            var doc = docRef.get().get();

            if (doc.exists()) {
                ContentVersion contentVersion = doc.toObject(ContentVersion.class);
                if (contentVersion != null && contentVersion.getStoryChecksums() != null) {
                    contentVersion.getStoryChecksums().remove(storyId);
                    contentVersion.setTotalStories(contentVersion.getStoryChecksums().size());
                    contentVersion.setVersion(contentVersion.getVersion() + 1);
                    contentVersion.setLastUpdated(com.google.cloud.Timestamp.now());
                    docRef.set(contentVersion).get();
                }
            }

            logger.info("Deleted story: {}", storyId);

            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "deleted");
            resp.put("storyId", storyId);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            logger.error("Failed to delete story: {}", storyId, e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/test/create-user")
    public ResponseEntity<Map<String, Object>> createTestUser(@RequestBody Map<String, Object> body) {
        if (firestore == null) {
            return ResponseEntity.status(503).body(Map.of("error", "Firestore not available"));
        }

        try {
            String userId = (String) body.get("userId");
            String provider = (String) body.get("provider");
            String providerId = (String) body.get("providerId");

            User user = new User();
            user.setId(userId != null ? userId : UUID.randomUUID().toString());
            user.setProvider(provider);
            user.setProviderId(providerId);
            user.setActive(true);
            user.setCreatedAt(Instant.now());
            user.setUpdatedAt(Instant.now());
            user.updateLastLogin();

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

