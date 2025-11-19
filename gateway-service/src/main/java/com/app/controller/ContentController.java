package com.app.controller;

import com.app.security.JwtAuthenticationFilter;
import com.app.dto.ContentDTOs.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

/**
 * Content Management System Controller
 * Handles batch API requests for story metadata and content
 */
@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ContentController {

    private static final Logger logger = LoggerFactory.getLogger(ContentController.class);

    /**
     * Get all stories metadata in batch
     */
    @GetMapping("/stories/batch")
    public ResponseEntity<?> getStoriesBatch(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String ageRange) {

        try {
            String userId = getCurrentUserId();
            logger.info("Stories batch request from user: {}, page: {}, size: {}", userId, page, size);

            int safePage = Math.max(0, page);
            int safeSize = size <= 0 ? 100 : Math.min(size, 500);

            // Mock story data - in production, this would come from a database
            List<StoryMetadata> stories = generateMockStories(safePage, safeSize, category, ageRange);

            BatchResponse response = new BatchResponse();
            response.setSuccess(true);
            response.setData(stories);
            response.setMetadata(createMetadata(stories.size(), safePage, safeSize));
            response.setMessage("Stories retrieved successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error retrieving stories batch: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to retrieve stories", e.getMessage()));
        }
    }

    /**
     * Get content metadata batch
     */
    @GetMapping("/content/metadata")
    public ResponseEntity<?> getContentMetadata() {
        try {
            String userId = getCurrentUserId();
            logger.info("Content metadata request from user: {}", userId);

            CMSContent content = new CMSContent();
            content.setStories(generateMockStories(0, 50, null, null));
            content.setCategories(generateMockCategories());
            content.setSettings(generateMockSettings());
            content.setAnnouncements(generateMockAnnouncements());
            content.setVersion("1.0.0");
            content.setLastUpdated(Instant.now().toString());

            BatchResponse response = new BatchResponse();
            response.setSuccess(true);
            response.setData(content);
            response.setMessage("Content metadata retrieved successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error retrieving content metadata: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to retrieve content metadata", e.getMessage()));
        }
    }

    /**
     * Update user preferences
     */
    @PostMapping("/user/preferences")
    public ResponseEntity<?> updateUserPreferences(@RequestBody UserPreferences preferences) {
        try {
            String userId = getCurrentUserId();
            logger.info("User preferences update from user: {}", userId);

            // In production, save to database
            // For now, just return success
            if (preferences == null || isEmptyPreferences(preferences)) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Invalid preferences", "Empty preferences"));
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Preferences updated successfully");
            response.put("userId", userId);
            response.put("timestamp", Instant.now().toString());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error updating user preferences: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to update preferences", e.getMessage()));
        }
    }

    /**
     * Generic batch API endpoint
     */
    @PostMapping("/batch")
    public ResponseEntity<?> processBatchRequest(@RequestBody BatchRequest batchRequest) {
        try {
            String userId = getCurrentUserId();
            if (batchRequest == null || batchRequest.getRequests() == null) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Invalid batch", "Missing requests"));
            }
            int size = batchRequest.getRequests().size();
            logger.info("Batch request from user: {} with {} operations", userId, size);
            if (size == 0) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Invalid batch", "Empty requests"));
            }
            if (size > 10) {
                return ResponseEntity.badRequest()
                        .body(createErrorResponse("Invalid batch", "Too many operations"));
            }

            List<BatchResponseItem> responses = new ArrayList<>();
            for (BatchRequestItem request : batchRequest.getRequests()) {
                BatchResponseItem responseItem = processBatchItem(request);
                responses.add(responseItem);
            }

            BatchResponse response = new BatchResponse();
            response.setSuccess(true);
            response.setResponses(responses);
            response.setMessage("Batch request processed successfully");

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error processing batch request: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse("Failed to process batch request", e.getMessage()));
        }
    }

    // Helper methods

    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof String) {
            return (String) authentication.getPrincipal();
        }
        return "anonymous";
    }
    private boolean isEmptyPreferences(UserPreferences p) {
        if (p == null) return true;
        return p.getTheme() == null
                && p.getPreferredLanguage() == null
                && p.getChildName() == null
                && p.getChildAge() == null
                && p.getMusicVolume() == 0
                && !p.isScreenTimeEnabled()
                && !p.isNotificationsEnabled();
    }


    private List<StoryMetadata> generateMockStories(int page, int size, String category, String ageRange) {
        List<StoryMetadata> stories = new ArrayList<>();

        String[] titles = {
            "The Sleepy Moon Bear", "Freya's Garden Adventure", "The Magic Paintbrush",
            "Dancing with Fireflies", "The Gentle Giant", "Whispers in the Wind",
            "The Rainbow Bridge", "Starlight Lullaby", "The Friendly Dragon",
            "Ocean Dreams", "The Singing Tree", "Butterfly Wishes"
        };

        String[] categories = {"bedtime", "adventure", "friendship", "nature", "magic"};
        String[] emojis = {"🌙", "🌸", "🎨", "✨", "🐻", "🌈", "⭐", "🐉", "🌊", "🦋", "🌳", "💫"};

        int startIndex = page * size;
        int endIndex = Math.min(startIndex + size, titles.length);

        for (int i = startIndex; i < endIndex; i++) {
            StoryMetadata story = new StoryMetadata();
            story.setId("story_" + (i + 1));
            story.setTitle(titles[i % titles.length]);
            story.setCategory(categories[i % categories.length]);
            story.setTag("tag_" + (i % 3 + 1));
            story.setEmoji(emojis[i % emojis.length]);
            story.setCoverImage("https://example.com/covers/story_" + (i + 1) + ".jpg");
            story.setAvailable(true);
            story.setAgeRange("12-36 months");
            story.setDuration(180 + (i * 30)); // 3-6 minutes
            story.setDescription("A magical bedtime story perfect for little dreamers.");
            story.setPages(generateMockPages(story.getId(), 8 + (i % 4)));
            story.setCreatedAt(Instant.now().minusSeconds(i * 86400).toString());
            story.setUpdatedAt(Instant.now().toString());

            stories.add(story);
        }

        return stories;
    }

    private List<StoryPageMetadata> generateMockPages(String storyId, int pageCount) {
        List<StoryPageMetadata> pages = new ArrayList<>();

        for (int i = 1; i <= pageCount; i++) {
            StoryPageMetadata page = new StoryPageMetadata();
            page.setId(storyId + "_page_" + i);
            page.setPageNumber(i);
            page.setBackgroundImage("https://example.com/backgrounds/" + storyId + "_" + i + ".jpg");
            page.setText("Once upon a time, in a magical land far away...");
            page.setAudioFile("https://example.com/audio/" + storyId + "_" + i + ".mp3");
            page.setAnimations(generateMockAnimations());

            pages.add(page);
        }

        return pages;
    }

    private List<AnimationMetadata> generateMockAnimations() {
        List<AnimationMetadata> animations = new ArrayList<>();

        String[] types = {"swaying", "blinking", "floating"};
        String[] elements = {"tree", "star", "cloud", "butterfly"};

        for (int i = 0; i < 2; i++) {
            AnimationMetadata animation = new AnimationMetadata();
            animation.setType(types[i % types.length]);
            animation.setElement(elements[i % elements.length]);
            animation.setDuration(2000 + (i * 500));
            animation.setDelay(i * 1000);

            animations.add(animation);
        }

        return animations;
    }

    private List<ContentCategory> generateMockCategories() {
        List<ContentCategory> categories = new ArrayList<>();

        String[][] categoryData = {
            {"bedtime", "Bedtime Stories", "🌙", "Gentle stories for peaceful sleep"},
            {"adventure", "Adventures", "🌟", "Exciting journeys and discoveries"},
            {"friendship", "Friendship", "💝", "Stories about caring and sharing"},
            {"nature", "Nature", "🌸", "Exploring the natural world"},
            {"magic", "Magic", "✨", "Enchanting tales of wonder"}
        };

        for (int i = 0; i < categoryData.length; i++) {
            ContentCategory category = new ContentCategory();
            category.setId(categoryData[i][0]);
            category.setName(categoryData[i][1]);
            category.setEmoji(categoryData[i][2]);
            category.setDescription(categoryData[i][3]);
            category.setSortOrder(i + 1);
            category.setActive(true);

            categories.add(category);
        }

        return categories;
    }
    private List<Announcement> generateMockAnnouncements() {
        List<Announcement> anns = new ArrayList<>();
        Announcement a = new Announcement();
        a.setId("ann_1");
        a.setTitle("Welcome");
        a.setMessage("Welcome to Grow with Freya!");
        a.setType("info");
        a.setStartDate(Instant.now().toString());
        anns.add(a);
        return anns;
    }


    private AppSettings generateMockSettings() {
        AppSettings settings = new AppSettings();
        settings.setMaintenanceMode(false);
        settings.setAppVersion("1.0.0");
        settings.setMaxDailyUsage(7200); // 2 hours in seconds
        settings.setFeaturesEnabled(Arrays.asList("stories", "music", "emotions", "screen_time"));
        settings.setAnnouncements(new ArrayList<>());

        return settings;
    }

    private BatchResponseItem processBatchItem(BatchRequestItem request) {
        BatchResponseItem response = new BatchResponseItem();
        response.setId(request.getId());

        try {
            String endpoint = request.getEndpoint() != null ? request.getEndpoint() : request.getUrl();
            if ("/api/v1/stories/batch".equals(endpoint) || "/api/v1/content/metadata".equals(endpoint)) {
                Map<String, Object> mockData = new HashMap<>();
                mockData.put("processed", true);
                mockData.put("timestamp", Instant.now().toString());
                response.setStatus(200);
                response.setSuccess(true);
                response.setBody(mockData);
            } else if ("/api/v1/user/preferences".equals(endpoint)) {
                Map<String, Object> mockData = new HashMap<>();
                mockData.put("updated", true);
                mockData.put("timestamp", Instant.now().toString());
                response.setStatus(200);
                response.setSuccess(true);
                response.setBody(mockData);
            } else {
                response.setStatus(400);
                response.setSuccess(false);
                response.setError(createAPIError("Invalid endpoint", "Unsupported endpoint: " + endpoint));
            }
        } catch (Exception e) {
            response.setStatus(500);
            response.setSuccess(false);
            response.setError(createAPIError("Processing failed", e.getMessage()));
        }

        return response;
    }

    private Map<String, Object> createMetadata(int count, int page, int size) {
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("totalCount", count);
        metadata.put("page", page);
        metadata.put("size", size);
        metadata.put("timestamp", Instant.now().toString());
        return metadata;
    }

    private Map<String, Object> createErrorResponse(String error, String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("error", error);
        response.put("message", message);
        response.put("timestamp", Instant.now().toString());
        return response;
    }

    private APIError createAPIError(String error, String message) {
        APIError apiError = new APIError();
        apiError.setError(error);
        apiError.setMessage(message);
        apiError.setStatusCode(500);
        apiError.setTimestamp(Instant.now().toString());
        return apiError;
    }

    // DTOs (Data Transfer Objects)

    public static class BatchRequest {
        private List<BatchRequestItem> requests;
        private Map<String, Object> metadata;

        public List<BatchRequestItem> getRequests() { return requests; }
        public void setRequests(List<BatchRequestItem> requests) { this.requests = requests; }
        public Map<String, Object> getMetadata() { return metadata; }
        public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
    }

    public static class BatchRequestItem {
        private String id;
        private String method;
        private String url;
        private String endpoint;
        private Map<String, String> headers;
        private Object body;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getMethod() { return method; }
        public void setMethod(String method) { this.method = method; }
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
        public String getEndpoint() { return endpoint; }
        public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
        public Map<String, String> getHeaders() { return headers; }
        public void setHeaders(Map<String, String> headers) { this.headers = headers; }
        public Object getBody() { return body; }
        public void setBody(Object body) { this.body = body; }
    }

    public static class BatchResponse {
        private boolean success;
        private Object data;
        private Map<String, Object> metadata;
        private String message;
        private List<BatchResponseItem> responses;

        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public Object getData() { return data; }
        public void setData(Object data) { this.data = data; }
        public Map<String, Object> getMetadata() { return metadata; }
        public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public List<BatchResponseItem> getResponses() { return responses; }
        public void setResponses(List<BatchResponseItem> responses) { this.responses = responses; }
    }

    public static class BatchResponseItem {
        private String id;
        private int status;
        private boolean success;
        private Map<String, String> headers;
        private Object body;
        private APIError error;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public int getStatus() { return status; }
        public void setStatus(int status) { this.status = status; }
        public boolean isSuccess() { return success; }
        public void setSuccess(boolean success) { this.success = success; }
        public Map<String, String> getHeaders() { return headers; }
        public void setHeaders(Map<String, String> headers) { this.headers = headers; }
        public Object getBody() { return body; }
        public void setBody(Object body) { this.body = body; }
        public APIError getError() { return error; }
        public void setError(APIError error) { this.error = error; }
    }

    // Additional DTOs would be defined here...
    // (StoryMetadata, StoryPageMetadata, AnimationMetadata, etc.)
    // For brevity, I'll create them in a separate file if needed
}
