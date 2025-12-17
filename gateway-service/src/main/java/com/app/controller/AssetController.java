package com.app.controller;

import com.app.dto.AssetSyncRequest;
import com.app.dto.AssetSyncResponse;
import com.app.dto.AssetSyncResponse.AssetInfo;
import com.app.exception.ErrorCode;
import com.app.exception.ErrorResponse;
import com.app.model.AssetVersion;
import com.app.service.AssetService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletionException;

@RestController
@RequestMapping("/api/assets")
public class AssetController {

    private static final Logger logger = LoggerFactory.getLogger(AssetController.class);

    private final AssetService assetService;

    @Autowired
    public AssetController(AssetService assetService) {
        this.assetService = assetService;
    }

    @GetMapping("/url")
    public ResponseEntity<?> getSignedUrl(@RequestParam String path) {
        logger.debug("GET /api/assets/url - Generating signed URL for: {}", path);

        if (path == null || path.isBlank()) {
            ErrorResponse error = createErrorResponse("Missing required parameter: path", "/api/assets/url");
            return ResponseEntity.badRequest().body(error);
        }

        try {
            String signedUrl = assetService.generateSignedUrl(path);
            return ResponseEntity.ok(new SignedUrlResponse(path, signedUrl));
        } catch (Exception e) {
            logger.error("Error generating signed URL for: {}", path, e);
            ErrorResponse error = createErrorResponse("Failed to generate signed URL", "/api/assets/url");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/version")
    public ResponseEntity<AssetVersion> getAssetVersion() {
        logger.debug("GET /api/assets/version - Getting asset version");
        try {
            AssetVersion version = assetService.getCurrentAssetVersion().join();
            logger.debug("Asset version: {}", version.getVersion());
            return ResponseEntity.ok(version);
        } catch (CompletionException e) {
            logger.error("Error getting asset version", e.getCause());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/sync")
    public ResponseEntity<?> syncAssets(@RequestBody AssetSyncRequest request) {
        if (request.getClientVersion() == null || request.getAssetChecksums() == null || request.getLastSyncTimestamp() == null) {
            logger.warn("POST /api/assets/sync - Missing required fields");
            ErrorResponse error = createErrorResponse(
                    "Missing required fields: clientVersion, assetChecksums, or lastSyncTimestamp",
                    "/api/assets/sync"
            );
            return ResponseEntity.badRequest().body(error);
        }

        logger.debug("POST /api/assets/sync - Client version: {}, Client has {} assets",
                request.getClientVersion(), request.getAssetChecksums().size());

        try {
            AssetVersion serverVersion = assetService.getCurrentAssetVersion().join();
            List<AssetInfo> assetsToSync = assetService.getAssetsToSync(request.getAssetChecksums()).join();

            AssetSyncResponse response = new AssetSyncResponse();
            response.setServerVersion(serverVersion.getVersion());
            response.setUpdatedAssets(assetsToSync);
            response.setAssetChecksums(serverVersion.getAssetChecksums());
            response.setTotalAssets(serverVersion.getTotalAssets());
            response.setLastUpdated(serverVersion.getLastUpdated().toEpochMilli());

            logger.debug("Returning {} assets to sync", assetsToSync.size());
            return ResponseEntity.ok(response);
        } catch (CompletionException e) {
            logger.error("Error syncing assets", e.getCause());
            ErrorResponse error = createErrorResponse("Failed to sync assets", "/api/assets/sync");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    private ErrorResponse createErrorResponse(String message, String path) {
        ErrorResponse error = new ErrorResponse();
        error.setSuccess(false);
        error.setErrorCode(ErrorCode.MISSING_REQUIRED_FIELD.getCode());
        error.setError(ErrorCode.MISSING_REQUIRED_FIELD.getDefaultMessage());
        error.setMessage(message);
        error.setPath(path);
        error.setTimestamp(Instant.now().toString());
        error.setRequestId(UUID.randomUUID().toString());
        return error;
    }

    public record SignedUrlResponse(String path, String signedUrl) {}
}

