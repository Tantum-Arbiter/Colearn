package com.app.controller;

import com.app.dto.BulkDataDTOs.*;
import com.app.service.ApplicationMetricsService;
import com.app.service.BulkDataService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * Controller for bulk data operations
 */
@RestController
@RequestMapping("/api/v1/bulk")
public class BulkDataController {
    
    private static final Logger logger = LoggerFactory.getLogger(BulkDataController.class);
    
    private final BulkDataService bulkDataService;
    private final ApplicationMetricsService metricsService;
    
    @Autowired
    public BulkDataController(BulkDataService bulkDataService, ApplicationMetricsService metricsService) {
        this.bulkDataService = bulkDataService;
        this.metricsService = metricsService;
    }
    
    /**
     * Bulk data polling endpoint
     * POST /api/v1/bulk/poll
     */
    @PostMapping("/poll")
    public CompletableFuture<ResponseEntity<BulkDataResponse>> pollBulkData(@RequestBody BulkDataRequest request) {
        long startTime = System.currentTimeMillis();
        
        logger.info("Received bulk data request for data types: {}", request.getDataTypes());
        
        return bulkDataService.processBulkDataRequest(request)
                .thenApply(response -> {
                    long processingTime = System.currentTimeMillis() - startTime;
                    logger.info("Bulk data request processed in {}ms, returned {} data types", 
                            processingTime, response.getData() != null ? response.getData().size() : 0);
                    
                    // Record success metrics
                    metricsService.recordCustomTimer("bulk.data.request.duration", processingTime, 
                            "endpoint", "poll", "success", "true");
                    
                    return ResponseEntity.ok(response);
                })
                .exceptionally(throwable -> {
                    long processingTime = System.currentTimeMillis() - startTime;
                    logger.error("Failed to process bulk data request", throwable);
                    
                    // Record error metrics
                    metricsService.recordCustomTimer("bulk.data.request.duration", processingTime, 
                            "endpoint", "poll", "success", "false");
                    metricsService.recordCustomMetric("bulk.data.request.errors", 
                            "endpoint", "poll", "error_type", throwable.getClass().getSimpleName());
                    
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(createErrorResponse("Failed to process bulk data request: " + throwable.getMessage()));
                });
    }
    
    /**
     * Get bulk data statistics
     * GET /api/v1/bulk/stats
     */
    @GetMapping("/stats")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getBulkDataStats() {
        long startTime = System.currentTimeMillis();
        
        logger.info("Received request for bulk data statistics");
        
        return bulkDataService.getStoryStatistics()
                .thenApply(stats -> {
                    long processingTime = System.currentTimeMillis() - startTime;
                    logger.info("Bulk data statistics retrieved in {}ms", processingTime);
                    
                    // Record success metrics
                    metricsService.recordCustomTimer("bulk.data.stats.duration", processingTime, 
                            "endpoint", "stats", "success", "true");
                    
                    return ResponseEntity.ok(stats);
                })
                .exceptionally(throwable -> {
                    long processingTime = System.currentTimeMillis() - startTime;
                    logger.error("Failed to retrieve bulk data statistics", throwable);
                    
                    // Record error metrics
                    metricsService.recordCustomTimer("bulk.data.stats.duration", processingTime, 
                            "endpoint", "stats", "success", "false");
                    metricsService.recordCustomMetric("bulk.data.stats.errors", 
                            "endpoint", "stats", "error_type", throwable.getClass().getSimpleName());
                    
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
                });
    }
    
    /**
     * Health check endpoint for bulk data service
     * GET /api/v1/bulk/health
     */
    @GetMapping("/health")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> healthCheck() {
        long startTime = System.currentTimeMillis();
        
        return bulkDataService.healthCheck()
                .thenApply(isHealthy -> {
                    long processingTime = System.currentTimeMillis() - startTime;
                    
                    Map<String, Object> healthStatus = Map.of(
                            "status", isHealthy ? "UP" : "DOWN",
                            "service", "bulk-data-service",
                            "timestamp", java.time.Instant.now().toString(),
                            "responseTimeMs", processingTime
                    );
                    
                    // Record health check metrics
                    metricsService.recordCustomTimer("bulk.data.health.duration", processingTime, 
                            "status", isHealthy ? "UP" : "DOWN");
                    metricsService.recordCustomMetric("bulk.data.health.checks", 
                            "status", isHealthy ? "UP" : "DOWN");
                    
                    HttpStatus status = isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
                    return ResponseEntity.status(status).body(healthStatus);
                })
                .exceptionally(throwable -> {
                    long processingTime = System.currentTimeMillis() - startTime;
                    logger.error("Health check failed", throwable);
                    
                    Map<String, Object> healthStatus = Map.of(
                            "status", "DOWN",
                            "service", "bulk-data-service",
                            "timestamp", java.time.Instant.now().toString(),
                            "responseTimeMs", processingTime,
                            "error", throwable.getMessage()
                    );
                    
                    // Record error metrics
                    metricsService.recordCustomTimer("bulk.data.health.duration", processingTime, 
                            "status", "ERROR");
                    metricsService.recordCustomMetric("bulk.data.health.errors", 
                            "error_type", throwable.getClass().getSimpleName());
                    
                    return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(healthStatus);
                });
    }
    
    /**
     * Get supported data types
     * GET /api/v1/bulk/data-types
     */
    @GetMapping("/data-types")
    public ResponseEntity<Map<String, Object>> getSupportedDataTypes() {
        Map<String, Object> dataTypes = Map.of(
                "stories", Map.of(
                        "description", "Complete story data with pages and metadata",
                        "fields", new String[]{"id", "title", "category", "pages", "coverImage", "isAvailable", "ageRange", "duration", "description", "downloadCount", "rating"},
                        "maxLimit", 100
                ),
                "story_summaries", Map.of(
                        "description", "Lightweight story summaries without page content",
                        "fields", new String[]{"id", "title", "category", "isAvailable", "version", "lastModified", "downloadCount", "rating"},
                        "maxLimit", 500
                )
        );
        
        Map<String, Object> response = Map.of(
                "supportedDataTypes", dataTypes,
                "version", "1.0.0",
                "timestamp", java.time.Instant.now().toString()
        );
        
        // Record metrics
        metricsService.recordCustomMetric("bulk.data.data_types.requests", 
                "endpoint", "data-types");
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * Create error response
     */
    private BulkDataResponse createErrorResponse(String errorMessage) {
        BulkDataResponse response = new BulkDataResponse();
        
        SyncMetadata metadata = new SyncMetadata();
        metadata.setServerVersion("1.0.0");
        metadata.setProcessingTimeMs(0L);
        metadata.setErrors(java.util.List.of(errorMessage));
        
        response.setMetadata(metadata);
        response.setData(Map.of());
        response.setHasMore(false);
        
        return response;
    }
    
    /**
     * Exception handler for validation errors
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<BulkDataResponse> handleValidationError(IllegalArgumentException e) {
        logger.warn("Validation error in bulk data request: {}", e.getMessage());
        
        // Record validation error metrics
        metricsService.recordCustomMetric("bulk.data.validation.errors", 
                "error_type", "IllegalArgumentException");
        
        BulkDataResponse errorResponse = createErrorResponse("Validation error: " + e.getMessage());
        return ResponseEntity.badRequest().body(errorResponse);
    }
    
    /**
     * Exception handler for general errors
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<BulkDataResponse> handleGeneralError(Exception e) {
        logger.error("Unexpected error in bulk data controller", e);
        
        // Record general error metrics
        metricsService.recordCustomMetric("bulk.data.general.errors", 
                "error_type", e.getClass().getSimpleName());
        
        BulkDataResponse errorResponse = createErrorResponse("Internal server error");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
}
