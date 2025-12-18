package com.app.controller;

import com.app.dto.StorySyncRequest;
import com.app.dto.StorySyncResponse;
import com.app.exception.ErrorCode;
import com.app.exception.ErrorResponse;
import com.app.model.ContentVersion;
import com.app.model.Story;
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

    @Autowired
    public StoryController(StoryService storyService) {
        this.storyService = storyService;
    }

    @GetMapping
    public ResponseEntity<List<Story>> getAllStories() {
        logger.debug("GET /api/stories - Getting all available stories");
        try {
            List<Story> stories = storyService.getAllAvailableStories().join();
            logger.debug("Returning {} available stories", stories.size());
            return ResponseEntity.ok(stories);
        } catch (CompletionException e) {
            logger.error("Error getting all stories", e.getCause());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/{storyId}")
    public ResponseEntity<Story> getStoryById(@PathVariable String storyId) {
        logger.debug("GET /api/stories/{} - Getting story by ID", storyId);
        try {
            Optional<Story> storyOpt = storyService.getStoryById(storyId).join();
            if (storyOpt.isPresent()) {
                logger.debug("Story found: {}", storyId);
                return ResponseEntity.ok(storyOpt.get());
            } else {
                logger.debug("Story not found: {}", storyId);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
        } catch (CompletionException e) {
            logger.error("Error getting story: {}", storyId, e.getCause());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/sync")
    public ResponseEntity<?> syncStories(@RequestBody StorySyncRequest request) {
        // Validate required fields
        if (request.getClientVersion() == null || request.getStoryChecksums() == null || request.getLastSyncTimestamp() == null) {
            logger.warn("POST /api/stories/sync - Missing required fields in request");
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

        logger.debug("POST /api/stories/sync - Client version: {}, Client has {} stories",
                request.getClientVersion(), request.getStoryChecksums().size());
        try {
            ContentVersion serverVersion = storyService.getCurrentContentVersion().join();
            List<Story> storiesToSync = storyService.getStoriesToSync(request.getStoryChecksums()).join();

            StorySyncResponse response = new StorySyncResponse();
            response.setServerVersion(serverVersion.getVersion());
            response.setStories(storiesToSync);
            response.setStoryChecksums(serverVersion.getStoryChecksums());
            response.setTotalStories(serverVersion.getTotalStories());
            response.setLastUpdated(serverVersion.getLastUpdated().toEpochMilli());

            logger.debug("Sync response: serverVersion={}, updatedStories={}, totalStories={}",
                    response.getServerVersion(),
                    response.getUpdatedStories(),
                    response.getTotalStories());

            return ResponseEntity.ok(response);
        } catch (CompletionException e) {
            logger.error("Error syncing stories", e.getCause());
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
        logger.debug("GET /api/stories/version - Getting content version");
        try {
            ContentVersion version = storyService.getCurrentContentVersion().join();
            logger.debug("Content version: {}", version.getVersion());
            return ResponseEntity.ok(version);
        } catch (CompletionException e) {
            logger.error("Error getting content version", e.getCause());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/category/{category}")
    public ResponseEntity<List<Story>> getStoriesByCategory(@PathVariable String category) {
        logger.debug("GET /api/stories/category/{} - Getting stories by category", category);
        try {
            List<Story> stories = storyService.getStoriesByCategory(category).join();
            logger.debug("Found {} stories in category: {}", stories.size(), category);
            return ResponseEntity.ok(stories);
        } catch (CompletionException e) {
            logger.error("Error getting stories by category: {}", category, e.getCause());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

