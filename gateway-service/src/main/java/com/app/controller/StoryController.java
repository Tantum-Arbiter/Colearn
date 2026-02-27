package com.app.controller;

import com.app.dto.ContentVersionResponse;
import com.app.dto.DeltaSyncRequest;
import com.app.dto.DeltaSyncResponse;
import com.app.exception.ErrorCode;
import com.app.exception.ErrorResponse;
import com.app.model.AssetVersion;
import com.app.model.ContentVersion;
import com.app.model.Story;
import com.app.service.ApplicationMetricsService;
import com.app.service.AssetService;
import com.app.service.StoryService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletionException;

@RestController
@RequestMapping("/api/stories")
public class StoryController {

    private static final Logger logger = LoggerFactory.getLogger(StoryController.class);

    private final StoryService storyService;
    private final AssetService assetService;
    private final ApplicationMetricsService metricsService;

    @Autowired
    public StoryController(StoryService storyService, AssetService assetService, ApplicationMetricsService metricsService) {
        this.storyService = storyService;
        this.assetService = assetService;
        this.metricsService = metricsService;
    }

    private String getRequestId() {
        String requestId = MDC.get("requestId");
        return requestId != null ? requestId : "unknown";
    }

    @GetMapping
    public ResponseEntity<?> getAllStories() {
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
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            logger.error("[Stories] [reqId={}] FAILED: Error fetching all stories - {}", reqId, cause.getMessage(), cause);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse(ErrorCode.FIREBASE_SERVICE_ERROR, "Failed to fetch stories: " + cause.getMessage(), "/api/stories", reqId));
        }
    }

    @GetMapping("/{storyId}")
    public ResponseEntity<?> getStoryById(@PathVariable String storyId) {
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
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(createErrorResponse(ErrorCode.INVALID_REQUEST, "Story not found: " + storyId, "/api/stories/" + storyId, reqId));
            }
        } catch (CompletionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            logger.error("[Stories] [reqId={}] GET /api/stories/{} - Error: {}", reqId, storyId, cause.getMessage(), cause);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse(ErrorCode.FIREBASE_SERVICE_ERROR, "Failed to fetch story: " + cause.getMessage(), "/api/stories/" + storyId, reqId));
        }
    }

    @GetMapping("/version")
    public ResponseEntity<?> getContentVersion(
            @RequestParam(required = false) Integer clientVersion) {
        String reqId = getRequestId();
        logger.info("[Stories] [reqId={}] GET /api/stories/version - clientVersion={}", reqId, clientVersion);
        try {
            ContentVersion storyVersion = storyService.getCurrentContentVersion().join();
            AssetVersion assetVersionData = assetService.getCurrentAssetVersion().join();

            ContentVersionResponse response = new ContentVersionResponse();
            response.setId("current");
            response.setVersion(storyVersion.getVersion());
            response.setAssetVersion(assetVersionData.getVersion());
            response.setLastUpdated(storyVersion.getLastUpdated().toDate().getTime());
            response.setStoryChecksums(storyVersion.getStoryChecksums());
            response.setTotalStories(storyVersion.getTotalStories());

            boolean clientUpToDate = clientVersion != null && clientVersion.equals(storyVersion.getVersion());
            if (clientUpToDate) {
                metricsService.recordStorySyncSkipped();
                logger.info("[Stories] [reqId={}] Version check: storyVersion={}, assetVersion={}, clientVersion={}, upToDate=true (sync skipped)",
                        reqId, storyVersion.getVersion(), assetVersionData.getVersion(), clientVersion);
            } else {
                logger.info("[Stories] [reqId={}] Version check: storyVersion={}, assetVersion={}, clientVersion={}, upToDate=false",
                        reqId, storyVersion.getVersion(), assetVersionData.getVersion(), clientVersion);
            }

            return ResponseEntity.ok(response);
        } catch (CompletionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            logger.error("[Stories] [reqId={}] GET /api/stories/version - FAILED: {}", reqId, cause.getMessage(), cause);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse(ErrorCode.FIREBASE_SERVICE_ERROR, "Failed to fetch content version: " + cause.getMessage(), "/api/stories/version", reqId));
        }
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<?> getStoriesByCategory(@PathVariable String category) {
        String reqId = getRequestId();
        logger.info("[Stories] [reqId={}] GET /api/stories/category/{} - Request received", reqId, category);
        try {
            List<Story> stories = storyService.getStoriesByCategory(category).join();
            logger.info("[Stories] [reqId={}] GET /api/stories/category/{} - Found {} stories", reqId, category, stories.size());
            return ResponseEntity.ok(stories);
        } catch (CompletionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            logger.error("[Stories] [reqId={}] GET /api/stories/category/{} - FAILED: {}", reqId, category, cause.getMessage(), cause);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse(ErrorCode.FIREBASE_SERVICE_ERROR, "Failed to fetch stories by category: " + cause.getMessage(), "/api/stories/category/" + category, reqId));
        }
    }

    @PostMapping("/delta")
    public ResponseEntity<?> getDeltaContent(@Valid @RequestBody DeltaSyncRequest request) {
        String reqId = getRequestId();
        long startTime = System.currentTimeMillis();
        int clientStoriesCount = request.getStoryChecksums() != null ? request.getStoryChecksums().size() : 0;

        logger.info("[Delta] [reqId={}] POST /api/stories/delta - clientVersion={}, clientStories={}",
                reqId, request.getClientVersion(), clientStoriesCount);

        try {
            ContentVersion serverVersion = storyService.getCurrentContentVersion().join();
            AssetVersion assetVersion = assetService.getCurrentAssetVersion().join();

            if (request.getClientVersion() != null && request.getClientVersion() >= serverVersion.getVersion()) {
                logger.info("[Delta] [reqId={}] Client is up to date (clientVersion={}, serverVersion={})",
                        reqId, request.getClientVersion(), serverVersion.getVersion());

                DeltaSyncResponse response = new DeltaSyncResponse();
                response.setServerVersion(serverVersion.getVersion());
                response.setAssetVersion(assetVersion.getVersion());
                response.setStories(new ArrayList<>());
                response.setDeletedStoryIds(new ArrayList<>());
                response.setStoryChecksums(serverVersion.getStoryChecksums());
                response.setTotalStories(serverVersion.getTotalStories());
                response.setLastUpdated(serverVersion.getLastUpdated().toDate().getTime());

                long durationMs = System.currentTimeMillis() - startTime;
                logger.info("[Delta] [reqId={}] COMPLETE - No changes needed, durationMs={}", reqId, durationMs);
                return ResponseEntity.ok(response);
            }

            List<Story> storiesToSync = storyService.getStoriesToSync(request.getStoryChecksums()).join();
            List<String> deletedStoryIds = new ArrayList<>();
            if (request.getStoryChecksums() != null && !request.getStoryChecksums().isEmpty()) {
                Set<String> serverStoryIds = serverVersion.getStoryChecksums().keySet();
                for (String clientStoryId : request.getStoryChecksums().keySet()) {
                    if (!serverStoryIds.contains(clientStoryId)) {
                        deletedStoryIds.add(clientStoryId);
                    }
                }
            }

            DeltaSyncResponse response = new DeltaSyncResponse();
            response.setServerVersion(serverVersion.getVersion());
            response.setAssetVersion(assetVersion.getVersion());
            response.setStories(storiesToSync);
            response.setDeletedStoryIds(deletedStoryIds);
            response.setStoryChecksums(serverVersion.getStoryChecksums());
            response.setTotalStories(serverVersion.getTotalStories());
            response.setLastUpdated(serverVersion.getLastUpdated().toDate().getTime());

            long durationMs = System.currentTimeMillis() - startTime;
            metricsService.recordStorySync(clientStoriesCount, storiesToSync.size(), durationMs);
            metricsService.recordDeltaSync(
                    request.getClientVersion() != null ? request.getClientVersion() : 0,
                    serverVersion.getVersion(),
                    storiesToSync.size(),
                    deletedStoryIds.size(),
                    durationMs);

            logger.info("[Delta] [reqId={}] COMPLETE - updatedStories={}, deletedStories={}, durationMs={}",
                    reqId, storiesToSync.size(), deletedStoryIds.size(), durationMs);

            return ResponseEntity.ok(response);
        } catch (CompletionException e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            logger.error("[Delta] [reqId={}] FAILED: {}", reqId, cause.getMessage(), cause);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(createErrorResponse(ErrorCode.FIREBASE_SERVICE_ERROR,
                            "Failed to get delta content: " + cause.getMessage(),
                            "/api/stories/delta", reqId));
        }
    }

    private ErrorResponse createErrorResponse(ErrorCode errorCode, String message, String path, String requestId) {
        ErrorResponse response = new ErrorResponse();
        response.setSuccess(false);
        response.setErrorCode(errorCode.getCode());
        response.setError(errorCode.getDefaultMessage());
        response.setMessage(message);
        response.setPath(path);
        response.setTimestamp(Instant.now().toString());
        response.setRequestId(requestId);
        return response;
    }
}

