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
import org.slf4j.MDC;
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

    private String getRequestId() {
        String requestId = MDC.get("requestId");
        return requestId != null ? requestId : "unknown";
    }

    @GetMapping
    public ResponseEntity<List<Story>> getAllStories() {
        String reqId = getRequestId();
        logger.info("[Stories] [reqId={}] GET /api/stories - Fetching all stories", reqId);
        try {
            List<Story> stories = storyService.getAllAvailableStories().join();
            logger.info("[Stories] [reqId={}] Returning {} stories", reqId, stories.size());
            if (logger.isDebugEnabled()) {
                stories.forEach(story -> {
                    int pageCount = story.getPages() != null ? story.getPages().size() : 0;
                    logger.debug("[Stories] [reqId={}]   -> id={}, title='{}', category={}, pages={}, premium={}",
                            reqId, story.getId(), story.getTitle(), story.getCategory(), pageCount, story.isPremium());
                });
            }
            return ResponseEntity.ok(stories);
        } catch (CompletionException e) {
            logger.error("[Stories] [reqId={}] FAILED: Error fetching all stories - {}", reqId, e.getCause() != null ? e.getCause().getMessage() : e.getMessage(), e.getCause());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{storyId}")
    public ResponseEntity<Story> getStoryById(@PathVariable String storyId) {
        String reqId = getRequestId();
        logger.info("[Stories] [reqId={}] GET /api/stories/{} - Request received", reqId, storyId);
        try {
            Optional<Story> storyOpt = storyService.getStoryById(storyId).join();
            if (storyOpt.isPresent()) {
                Story story = storyOpt.get();
                int pageCount = story.getPages() != null ? story.getPages().size() : 0;
                logger.info("[Stories] [reqId={}] GET /api/stories/{} - Found: title='{}', pages={}",
                        reqId, storyId, story.getTitle(), pageCount);
                return ResponseEntity.ok(story);
            } else {
                logger.warn("[Stories] [reqId={}] GET /api/stories/{} - NOT FOUND", reqId, storyId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
        } catch (CompletionException e) {
            logger.error("[Stories] [reqId={}] GET /api/stories/{} - Error: {}", reqId, storyId, e.getCause() != null ? e.getCause().getMessage() : e.getMessage(), e.getCause());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/sync")
    public ResponseEntity<?> syncStories(@RequestBody StorySyncRequest request) {
        String reqId = getRequestId();
        long startTime = System.currentTimeMillis();
        logger.info("[Sync] [reqId={}] POST /api/stories/sync - Delta sync request received", reqId);

        // Validate required fields
        if (request.getClientVersion() == null || request.getStoryChecksums() == null || request.getLastSyncTimestamp() == null) {
            logger.warn("[Sync] [reqId={}] Validation failed - missing required fields (clientVersion={}, storyChecksums={}, lastSyncTimestamp={})",
                    reqId, request.getClientVersion() != null, request.getStoryChecksums() != null, request.getLastSyncTimestamp() != null);
            ErrorResponse errorResponse = new ErrorResponse();
            errorResponse.setSuccess(false);
            errorResponse.setErrorCode(ErrorCode.MISSING_REQUIRED_FIELD.getCode());
            errorResponse.setError(ErrorCode.MISSING_REQUIRED_FIELD.getDefaultMessage());
            errorResponse.setMessage("Missing required fields: clientVersion, storyChecksums, or lastSyncTimestamp");
            errorResponse.setPath("/api/stories/sync");
            errorResponse.setTimestamp(Instant.now().toString());
            errorResponse.setRequestId(reqId);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        }

        int clientStoriesCount = request.getStoryChecksums().size();
        logger.info("[Sync] [reqId={}] Client state: version={}, cachedStories={}", reqId, request.getClientVersion(), clientStoriesCount);

        try {
            ContentVersion serverVersion = storyService.getCurrentContentVersion().join();
            logger.info("[Sync] [reqId={}] Server state: version={}, totalStories={}", reqId, serverVersion.getVersion(), serverVersion.getTotalStories());

            List<Story> storiesToSync = storyService.getStoriesToSync(request.getStoryChecksums()).join();

            StorySyncResponse response = new StorySyncResponse();
            response.setServerVersion(serverVersion.getVersion());
            response.setStories(storiesToSync);
            response.setStoryChecksums(serverVersion.getStoryChecksums());
            response.setTotalStories(serverVersion.getTotalStories());
            response.setLastUpdated(serverVersion.getLastUpdated().toDate().getTime());

            long durationMs = System.currentTimeMillis() - startTime;
            metricsService.recordStorySync(clientStoriesCount, storiesToSync.size(), durationMs);

            if (storiesToSync.isEmpty()) {
                logger.info("[Sync] [reqId={}] COMPLETE - No changes, client up-to-date, durationMs={}", reqId, durationMs);
            } else {
                logger.info("[Sync] [reqId={}] COMPLETE - Syncing {} stories, serverVersion={}, durationMs={}",
                        reqId, storiesToSync.size(), response.getServerVersion(), durationMs);
                if (logger.isDebugEnabled()) {
                    storiesToSync.forEach(story -> logger.debug("[Sync] [reqId={}]   -> id={}, title='{}'", reqId, story.getId(), story.getTitle()));
                }
            }

            return ResponseEntity.ok(response);
        } catch (CompletionException e) {
            long durationMs = System.currentTimeMillis() - startTime;
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            logger.error("[Sync] [reqId={}] FAILED - Error syncing stories after {}ms: {}", reqId, durationMs, cause.getMessage(), cause);
            ErrorResponse errorResponse = new ErrorResponse();
            errorResponse.setSuccess(false);
            errorResponse.setErrorCode(ErrorCode.INTERNAL_SERVER_ERROR.getCode());
            errorResponse.setError(ErrorCode.INTERNAL_SERVER_ERROR.getDefaultMessage());
            errorResponse.setMessage("Error syncing stories: " + cause.getMessage());
            errorResponse.setPath("/api/stories/sync");
            errorResponse.setTimestamp(Instant.now().toString());
            errorResponse.setRequestId(reqId);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/version")
    public ResponseEntity<ContentVersion> getContentVersion(
            @RequestParam(required = false) Integer clientVersion) {
        String reqId = getRequestId();
        logger.info("[Stories] [reqId={}] GET /api/stories/version - clientVersion={}", reqId, clientVersion);
        try {
            ContentVersion version = storyService.getCurrentContentVersion().join();

            boolean clientUpToDate = clientVersion != null && clientVersion.equals(version.getVersion());
            if (clientUpToDate) {
                metricsService.recordStorySyncSkipped();
                logger.info("[Stories] [reqId={}] Version check: serverVersion={}, clientVersion={}, upToDate=true (sync skipped)",
                        reqId, version.getVersion(), clientVersion);
            } else {
                logger.info("[Stories] [reqId={}] Version check: serverVersion={}, clientVersion={}, upToDate=false",
                        reqId, version.getVersion(), clientVersion);
            }

            return ResponseEntity.ok(version);
        } catch (CompletionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            logger.error("[Stories] [reqId={}] GET /api/stories/version - FAILED: {}", reqId, cause.getMessage(), cause);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<Story>> getStoriesByCategory(@PathVariable String category) {
        String reqId = getRequestId();
        logger.info("[Stories] [reqId={}] GET /api/stories/category/{} - Request received", reqId, category);
        try {
            List<Story> stories = storyService.getStoriesByCategory(category).join();
            logger.info("[Stories] [reqId={}] GET /api/stories/category/{} - Found {} stories", reqId, category, stories.size());
            return ResponseEntity.ok(stories);
        } catch (CompletionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            logger.error("[Stories] [reqId={}] GET /api/stories/category/{} - FAILED: {}", reqId, category, cause.getMessage(), cause);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

