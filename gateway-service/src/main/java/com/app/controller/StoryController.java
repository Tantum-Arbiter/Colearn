package com.app.controller;

import com.app.dto.StorySyncRequest;
import com.app.dto.StorySyncResponse;
import com.app.exception.ErrorCode;
import com.app.exception.ErrorResponse;
import com.app.model.ContentVersion;
import com.app.model.Story;
import com.app.service.ApplicationMetricsService;
import com.app.service.StoryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletionException;

@RestController
@RequestMapping("/api/stories")
public class StoryController {

    private static final Logger logger = LoggerFactory.getLogger(StoryController.class);

    private final StoryService storyService;
    private final ApplicationMetricsService metricsService;

    @Autowired
    public StoryController(StoryService storyService, ApplicationMetricsService metricsService) {
        this.storyService = storyService;
        this.metricsService = metricsService;
    }

    @GetMapping
    public ResponseEntity<List<Story>> getAllStories() {
        logger.info("[User Journey Flow 3] Step 1: CMS call - GET /api/stories - Fetching all stories");
        try {
            List<Story> stories = storyService.getAllAvailableStories().join();
            logger.info("[User Journey Flow 3] Step 2: CMS response - Returning {} stories", stories.size());
            stories.forEach(story -> {
                int pageCount = story.getPages() != null ? story.getPages().size() : 0;
                logger.info("[User Journey Flow 3]   -> Story: id={}, title='{}', category={}, pages={}, premium={}",
                        story.getId(), story.getTitle(), story.getCategory(), pageCount, story.isPremium());
            });
            logger.info("[User Journey Flow 3] Step 3: CMS call COMPLETE - {} stories returned", stories.size());
            return ResponseEntity.ok(stories);
        } catch (CompletionException e) {
            logger.error("[User Journey Flow 3] FAILED: Error getting all stories", e.getCause());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{storyId}")
    public ResponseEntity<Story> getStoryById(@PathVariable String storyId) {
        logger.info("[CMS] GET /api/stories/{} - Request received", storyId);
        try {
            Optional<Story> storyOpt = storyService.getStoryById(storyId).join();
            if (storyOpt.isPresent()) {
                Story story = storyOpt.get();
                int pageCount = story.getPages() != null ? story.getPages().size() : 0;
                logger.info("[CMS] GET /api/stories/{} - Found: title='{}', pages={}, coverImage={}",
                        storyId, story.getTitle(), pageCount, story.getCoverImage());
                if (story.getPages() != null) {
                    story.getPages().forEach(page ->
                        logger.info("[CMS]   -> Page {}: backgroundImage={}",
                                page.getPageNumber(), page.getBackgroundImage()));
                }
                return ResponseEntity.ok(story);
            } else {
                logger.warn("[CMS] GET /api/stories/{} - Story NOT FOUND", storyId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
        } catch (CompletionException e) {
            logger.error("[CMS] GET /api/stories/{} - Error", storyId, e.getCause());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/sync")
    public ResponseEntity<?> syncStories(@RequestBody StorySyncRequest request) {
        long startTime = System.currentTimeMillis();
        logger.info("[User Journey Flow 4] Step 1: Delta sync request received - POST /api/stories/sync");

        // Validate required fields
        if (request.getClientVersion() == null || request.getStoryChecksums() == null || request.getLastSyncTimestamp() == null) {
            logger.warn("[User Journey Flow 4] Step 1 FAILED: Missing required fields in request");
            ErrorResponse errorResponse = new ErrorResponse();
            errorResponse.setSuccess(false);
            errorResponse.setErrorCode(ErrorCode.MISSING_REQUIRED_FIELD.getCode());
            errorResponse.setError(ErrorCode.MISSING_REQUIRED_FIELD.getDefaultMessage());
            errorResponse.setMessage("Missing required fields: clientVersion, storyChecksums, or lastSyncTimestamp");
            errorResponse.setPath("/api/stories/sync");
            errorResponse.setTimestamp(Instant.now().toString());
            errorResponse.setRequestId(UUID.randomUUID().toString());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }

        int storiesRequested = request.getStoryChecksums().size();
        logger.info("[User Journey Flow 4] Step 2: Client version={}, client has {} cached stories",
                request.getClientVersion(), storiesRequested);

        if (!request.getStoryChecksums().isEmpty()) {
            logger.info("[User Journey Flow 4]   -> Client cached story IDs: {}", request.getStoryChecksums().keySet());
        }

        try {
            logger.info("[User Journey Flow 4] Step 3: Fetching server content version from Firestore...");
            ContentVersion serverVersion = storyService.getCurrentContentVersion().join();
            logger.info("[User Journey Flow 4] Step 4: Server version={}, totalStories={}",
                    serverVersion.getVersion(), serverVersion.getTotalStories());

            logger.info("[User Journey Flow 4] Step 5: Comparing checksums to detect changes...");
            List<Story> storiesToSync = storyService.getStoriesToSync(request.getStoryChecksums()).join();

            StorySyncResponse response = new StorySyncResponse();
            response.setServerVersion(serverVersion.getVersion());
            response.setStories(storiesToSync);
            response.setStoryChecksums(serverVersion.getStoryChecksums());
            response.setTotalStories(serverVersion.getTotalStories());
            response.setLastUpdated(serverVersion.getLastUpdated().toEpochMilli());

            // Record story sync metrics
            long durationMs = System.currentTimeMillis() - startTime;
            metricsService.recordStorySync(storiesRequested, storiesToSync.size(), durationMs);

            if (storiesToSync.isEmpty()) {
                logger.info("[User Journey Flow 4] Step 6: No changes detected - client is up to date");
            } else {
                logger.info("[User Journey Flow 4] Step 6: {} stories need syncing (new/modified/deleted)", storiesToSync.size());
                storiesToSync.forEach(story -> {
                    int pageCount = story.getPages() != null ? story.getPages().size() : 0;
                    logger.info("[User Journey Flow 4]   -> Syncing story: id={}, title='{}', pages={}",
                            story.getId(), story.getTitle(), pageCount);
                });
            }

            logger.info("[User Journey Flow 4] Step 7: Delta sync COMPLETE - serverVersion={}, updatedStories={}, totalStories={}, durationMs={}",
                    response.getServerVersion(), response.getUpdatedStories(), response.getTotalStories(), durationMs);

            return ResponseEntity.ok(response);
        } catch (CompletionException e) {
            logger.error("[User Journey Flow 4] FAILED: Error syncing stories", e.getCause());
            ErrorResponse errorResponse = new ErrorResponse();
            errorResponse.setSuccess(false);
            errorResponse.setErrorCode(ErrorCode.INTERNAL_SERVER_ERROR.getCode());
            errorResponse.setError(ErrorCode.INTERNAL_SERVER_ERROR.getDefaultMessage());
            errorResponse.setMessage("Error syncing stories");
            errorResponse.setPath("/api/stories/sync");
            errorResponse.setTimestamp(Instant.now().toString());
            errorResponse.setRequestId(UUID.randomUUID().toString());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/version")
    public ResponseEntity<ContentVersion> getContentVersion() {
        logger.info("[CMS] GET /api/stories/version - Request received");
        try {
            ContentVersion version = storyService.getCurrentContentVersion().join();
            logger.info("[CMS] GET /api/stories/version - Version: {}, totalStories: {}",
                    version.getVersion(), version.getTotalStories());
            return ResponseEntity.ok(version);
        } catch (CompletionException e) {
            logger.error("[CMS] GET /api/stories/version - Error", e.getCause());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<Story>> getStoriesByCategory(@PathVariable String category) {
        logger.info("[CMS] GET /api/stories/category/{} - Request received", category);
        try {
            List<Story> stories = storyService.getStoriesByCategory(category).join();
            logger.info("[CMS] GET /api/stories/category/{} - Found {} stories", category, stories.size());
            stories.forEach(story ->
                logger.info("[CMS]   -> Story: id={}, title='{}'", story.getId(), story.getTitle()));
            return ResponseEntity.ok(stories);
        } catch (CompletionException e) {
            logger.error("[CMS] GET /api/stories/category/{} - Error", category, e.getCause());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

