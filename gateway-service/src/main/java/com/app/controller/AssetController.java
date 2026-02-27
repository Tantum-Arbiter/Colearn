package com.app.controller;

import com.app.dto.BatchUrlsRequest;
import com.app.dto.BatchUrlsResponse;
import com.app.exception.AssetUrlGenerationException;
import com.app.exception.ErrorCode;
import com.app.exception.ErrorResponse;
import com.app.exception.InvalidAssetPathException;
import com.app.model.AssetVersion;
import com.app.service.AssetService;
import com.app.service.ApplicationMetricsService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CompletionException;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/assets")
@Validated
public class AssetController {

    private static final Logger logger = LoggerFactory.getLogger(AssetController.class);

    private final AssetService assetService;
    private final ApplicationMetricsService metricsService;

    @Autowired
    public AssetController(AssetService assetService, ApplicationMetricsService metricsService) {
        this.assetService = assetService;
        this.metricsService = metricsService;
    }

    @GetMapping("/version")
    public ResponseEntity<AssetVersion> getAssetVersion() {
        String reqId = MDC.get("requestId");
        if (reqId == null) reqId = UUID.randomUUID().toString();

        logger.debug("[AssetVersion] [reqId={}] GET /api/assets/version", reqId);
        try {
            AssetVersion version = assetService.getCurrentAssetVersion().join();
            logger.debug("[AssetVersion] [reqId={}] Current version: {}", reqId, version.getVersion());
            return ResponseEntity.ok(version);
        } catch (CompletionException e) {
            logger.error("[AssetVersion] [reqId={}] Error getting asset version", reqId, e.getCause());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/batch-urls")
    public ResponseEntity<?> getBatchSignedUrls(@Valid @RequestBody BatchUrlsRequest request) {
        String reqId = MDC.get("requestId");
        if (reqId == null) reqId = UUID.randomUUID().toString();

        long startTime = System.currentTimeMillis();
        int pathCount = request.getPaths() != null ? request.getPaths().size() : 0;
        logger.info("[BatchUrls] [reqId={}] POST /api/assets/batch-urls - Generating {} signed URLs", reqId, pathCount);

        // Validate request size
        if (pathCount > BatchUrlsRequest.MAX_PATHS) {
            logger.warn("[BatchUrls] [reqId={}] Request exceeds max paths: {} > {}", reqId, pathCount, BatchUrlsRequest.MAX_PATHS);
            ErrorResponse error = createErrorResponse(
                    "paths cannot exceed " + BatchUrlsRequest.MAX_PATHS + " entries",
                    "/api/assets/batch-urls", ErrorCode.FIELD_VALIDATION_FAILED);
            return ResponseEntity.badRequest().body(error);
        }

        BatchUrlsResponse response = new BatchUrlsResponse();
        long expiresAt = System.currentTimeMillis() + TimeUnit.MINUTES.toMillis(60);

        for (String path : request.getPaths()) {
            try {
                String signedUrl = assetService.generateSignedUrl(path);
                response.addUrl(path, signedUrl, expiresAt);
            } catch (InvalidAssetPathException e) {
                logger.warn("[BatchUrls] [reqId={}] Invalid path: {} - {}", reqId, path, e.getReason());
                response.addFailed(path);
            } catch (AssetUrlGenerationException e) {
                logger.error("[BatchUrls] [reqId={}] Failed to generate URL for: {}", reqId, path, e);
                response.addFailed(path);
            } catch (Exception e) {
                logger.error("[BatchUrls] [reqId={}] Unexpected error for path: {}", reqId, path, e);
                response.addFailed(path);
            }
        }

        long durationMs = System.currentTimeMillis() - startTime;
        metricsService.recordBatchUrlGeneration(
                pathCount,
                response.getUrls().size(),
                response.getFailed().size(),
                durationMs);

        logger.info("[BatchUrls] [reqId={}] COMPLETE - Generated {} URLs, {} failed, durationMs={}",
                reqId, response.getUrls().size(), response.getFailed().size(), durationMs);

        return ResponseEntity.ok(response);
    }

    private ErrorResponse createErrorResponse(String message, String path, ErrorCode errorCode) {
        ErrorResponse error = new ErrorResponse();
        error.setSuccess(false);
        error.setErrorCode(errorCode.getCode());
        error.setError(errorCode.getDefaultMessage());
        error.setMessage(message);
        error.setPath(path);
        error.setTimestamp(Instant.now().toString());
        error.setRequestId(UUID.randomUUID().toString());
        return error;
    }
}

