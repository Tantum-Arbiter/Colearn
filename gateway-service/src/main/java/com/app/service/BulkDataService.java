package com.app.service;

import com.app.dto.BulkDataDTOs.*;
import com.app.model.Story;
import com.app.repository.StoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Service for handling bulk data operations
 */
@Service
public class BulkDataService {
    
    private final StoryRepository storyRepository;
    private final ApplicationMetricsService metricsService;
    
    @Autowired
    public BulkDataService(StoryRepository storyRepository, ApplicationMetricsService metricsService) {
        this.storyRepository = storyRepository;
        this.metricsService = metricsService;
    }
    
    /**
     * Process bulk data request and return response
     */
    public CompletableFuture<BulkDataResponse> processBulkDataRequest(BulkDataRequest request) {
        long startTime = System.currentTimeMillis();
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                BulkDataResponse response = new BulkDataResponse();
                Map<String, DataTypeResponse> dataMap = new HashMap<>();
                
                // Parse last sync timestamp
                Instant lastSync = parseLastSyncTimestamp(request.getLastSyncTimestamp());
                
                // Process each requested data type
                if (request.getDataTypes() != null) {
                    for (String dataType : request.getDataTypes()) {
                        DataTypeResponse dataTypeResponse = processDataType(dataType, lastSync, request);
                        dataMap.put(dataType, dataTypeResponse);
                        
                        // Record metrics for each data type
                        long processingTime = System.currentTimeMillis() - startTime;
                        metricsService.recordBulkDataRequest(dataType, 
                                dataTypeResponse.getTotalCount() != null ? dataTypeResponse.getTotalCount() : 0, 
                                processingTime);
                    }
                }
                
                response.setData(dataMap);
                response.setSyncTimestamp(Instant.now().toString());
                
                // Set pagination info
                PaginationInfo pagination = createPaginationInfo(request, dataMap);
                response.setPagination(pagination);
                
                // Set metadata
                SyncMetadata metadata = createSyncMetadata(startTime);
                response.setMetadata(metadata);
                
                // Determine if there's more data
                response.setHasMore(hasMoreData(dataMap, request));
                response.setNextCursor(generateNextCursor(dataMap));
                
                return response;
                
            } catch (Exception e) {
                // Record error metrics
                long processingTime = System.currentTimeMillis() - startTime;
                metricsService.recordBulkDataError("unknown", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to process bulk data request", e);
            }
        });
    }
    
    /**
     * Process a specific data type
     */
    private DataTypeResponse processDataType(String dataType, Instant lastSync, BulkDataRequest request) {
        switch (dataType.toLowerCase()) {
            case "stories":
                return processStoriesData(lastSync, request);
            case "story_summaries":
                return processStorySummariesData(lastSync, request);
            default:
                throw new IllegalArgumentException("Unsupported data type: " + dataType);
        }
    }
    
    /**
     * Process stories data
     */
    private DataTypeResponse processStoriesData(Instant lastSync, BulkDataRequest request) {
        try {
            int limit = request.getLimit() != null ? request.getLimit() : 100;
            String cursor = request.getCursor();
            
            List<Story> stories = storyRepository.findForBulkSync(lastSync, limit, cursor).join();
            
            // Apply filters if provided
            if (request.getFilters() != null) {
                stories = applyStoryFilters(stories, request.getFilters());
            }
            
            DataTypeResponse response = new DataTypeResponse("stories", new ArrayList<>(stories));
            response.setTotalCount(stories.size());
            response.setNewCount(countNewStories(stories, lastSync));
            response.setUpdatedCount(countUpdatedStories(stories, lastSync));
            response.setLastModified(getLastModifiedTimestamp(stories));
            
            // Add summary statistics
            Map<String, Object> summary = createStoriesSummary(stories);
            response.setSummary(summary);
            
            return response;
            
        } catch (Exception e) {
            metricsService.recordBulkDataError("stories", e.getClass().getSimpleName());
            throw new RuntimeException("Failed to process stories data", e);
        }
    }
    
    /**
     * Process story summaries data (lightweight version)
     */
    private DataTypeResponse processStorySummariesData(Instant lastSync, BulkDataRequest request) {
        try {
            int limit = request.getLimit() != null ? request.getLimit() : 500; // Higher limit for summaries
            String cursor = request.getCursor();
            
            List<Story> stories = storyRepository.findForBulkSync(lastSync, limit, cursor).join();
            
            // Convert to summaries
            List<StorySummary> summaries = stories.stream()
                    .map(StorySummary::new)
                    .collect(Collectors.toList());
            
            // Apply filters if provided
            if (request.getFilters() != null) {
                summaries = applyStorySummaryFilters(summaries, request.getFilters());
            }
            
            DataTypeResponse response = new DataTypeResponse("story_summaries", new ArrayList<>(summaries));
            response.setTotalCount(summaries.size());
            response.setNewCount(countNewStories(stories, lastSync));
            response.setUpdatedCount(countUpdatedStories(stories, lastSync));
            response.setLastModified(getLastModifiedTimestamp(stories));
            
            // Add summary statistics
            Map<String, Object> summary = createStorySummariesSummary(summaries);
            response.setSummary(summary);
            
            return response;
            
        } catch (Exception e) {
            metricsService.recordBulkDataError("story_summaries", e.getClass().getSimpleName());
            throw new RuntimeException("Failed to process story summaries data", e);
        }
    }
    
    /**
     * Apply filters to stories
     */
    private List<Story> applyStoryFilters(List<Story> stories, Map<String, Object> filters) {
        return stories.stream()
                .filter(story -> {
                    // Category filter
                    if (filters.containsKey("category")) {
                        String categoryFilter = (String) filters.get("category");
                        if (!story.getCategory().equals(categoryFilter)) {
                            return false;
                        }
                    }
                    
                    // Available filter
                    if (filters.containsKey("available")) {
                        Boolean availableFilter = (Boolean) filters.get("available");
                        if (story.isAvailable() != availableFilter) {
                            return false;
                        }
                    }
                    
                    // Age range filter
                    if (filters.containsKey("ageRange")) {
                        String ageRangeFilter = (String) filters.get("ageRange");
                        if (!Objects.equals(story.getAgeRange(), ageRangeFilter)) {
                            return false;
                        }
                    }
                    
                    return true;
                })
                .collect(Collectors.toList());
    }
    
    /**
     * Apply filters to story summaries
     */
    private List<StorySummary> applyStorySummaryFilters(List<StorySummary> summaries, Map<String, Object> filters) {
        return summaries.stream()
                .filter(summary -> {
                    // Category filter
                    if (filters.containsKey("category")) {
                        String categoryFilter = (String) filters.get("category");
                        if (!summary.getCategory().equals(categoryFilter)) {
                            return false;
                        }
                    }
                    
                    // Available filter
                    if (filters.containsKey("available")) {
                        Boolean availableFilter = (Boolean) filters.get("available");
                        if (summary.isAvailable() != availableFilter) {
                            return false;
                        }
                    }
                    
                    return true;
                })
                .collect(Collectors.toList());
    }
    
    /**
     * Count new stories since last sync
     */
    private int countNewStories(List<Story> stories, Instant lastSync) {
        return (int) stories.stream()
                .filter(story -> story.getCreatedAt() != null && story.getCreatedAt().isAfter(lastSync))
                .count();
    }
    
    /**
     * Count updated stories since last sync
     */
    private int countUpdatedStories(List<Story> stories, Instant lastSync) {
        return (int) stories.stream()
                .filter(story -> story.getUpdatedAt() != null && 
                        story.getUpdatedAt().isAfter(lastSync) &&
                        (story.getCreatedAt() == null || !story.getCreatedAt().isAfter(lastSync)))
                .count();
    }
    
    /**
     * Get last modified timestamp from stories
     */
    private String getLastModifiedTimestamp(List<Story> stories) {
        return stories.stream()
                .map(Story::getUpdatedAt)
                .filter(Objects::nonNull)
                .max(Instant::compareTo)
                .map(Instant::toString)
                .orElse(null);
    }
    
    /**
     * Create stories summary statistics
     */
    private Map<String, Object> createStoriesSummary(List<Story> stories) {
        Map<String, Object> summary = new HashMap<>();
        
        // Category breakdown
        Map<String, Long> categoryBreakdown = stories.stream()
                .collect(Collectors.groupingBy(Story::getCategory, Collectors.counting()));
        summary.put("categoryBreakdown", categoryBreakdown);
        
        // Availability stats
        long availableCount = stories.stream().mapToLong(s -> s.isAvailable() ? 1 : 0).sum();
        summary.put("availableCount", availableCount);
        summary.put("unavailableCount", stories.size() - availableCount);
        
        // Download stats
        long totalDownloads = stories.stream()
                .mapToLong(s -> s.getDownloadCount() != null ? s.getDownloadCount() : 0)
                .sum();
        summary.put("totalDownloads", totalDownloads);
        
        // Rating stats
        OptionalDouble avgRating = stories.stream()
                .filter(s -> s.getRating() != null && s.getRating() > 0)
                .mapToDouble(Story::getRating)
                .average();
        summary.put("averageRating", avgRating.isPresent() ? avgRating.getAsDouble() : 0.0);
        
        return summary;
    }
    
    /**
     * Create story summaries summary statistics
     */
    private Map<String, Object> createStorySummariesSummary(List<StorySummary> summaries) {
        Map<String, Object> summary = new HashMap<>();
        
        // Category breakdown
        Map<String, Long> categoryBreakdown = summaries.stream()
                .collect(Collectors.groupingBy(StorySummary::getCategory, Collectors.counting()));
        summary.put("categoryBreakdown", categoryBreakdown);
        
        // Availability stats
        long availableCount = summaries.stream().mapToLong(s -> s.isAvailable() ? 1 : 0).sum();
        summary.put("availableCount", availableCount);
        summary.put("unavailableCount", summaries.size() - availableCount);
        
        return summary;
    }

    /**
     * Parse last sync timestamp
     */
    private Instant parseLastSyncTimestamp(String timestamp) {
        if (timestamp == null || timestamp.trim().isEmpty()) {
            return Instant.EPOCH; // Return epoch if no timestamp provided
        }

        try {
            return Instant.parse(timestamp);
        } catch (Exception e) {
            // If parsing fails, return epoch
            return Instant.EPOCH;
        }
    }

    /**
     * Create pagination info
     */
    private PaginationInfo createPaginationInfo(BulkDataRequest request, Map<String, DataTypeResponse> dataMap) {
        // For simplicity, we'll use basic pagination
        // In a real implementation, you'd calculate this based on actual data
        int totalItems = dataMap.values().stream()
                .mapToInt(response -> response.getTotalCount() != null ? response.getTotalCount() : 0)
                .sum();

        int pageSize = request.getLimit() != null ? request.getLimit() : 100;
        int currentPage = 1; // Simplified - would calculate based on cursor

        return new PaginationInfo(currentPage, pageSize, (long) totalItems);
    }

    /**
     * Create sync metadata
     */
    private SyncMetadata createSyncMetadata(long startTime) {
        SyncMetadata metadata = new SyncMetadata();
        metadata.setServerVersion("1.0.0");
        metadata.setProcessingTimeMs(System.currentTimeMillis() - startTime);
        metadata.setCompressionRatio(85); // Simulated compression ratio
        metadata.setServerInfo(Map.of(
                "server", "gateway-service",
                "timestamp", Instant.now().toString(),
                "timezone", "UTC"
        ));
        return metadata;
    }

    /**
     * Check if there's more data available
     */
    private boolean hasMoreData(Map<String, DataTypeResponse> dataMap, BulkDataRequest request) {
        // Simplified logic - in reality, you'd check if any data type has more records
        int limit = request.getLimit() != null ? request.getLimit() : 100;

        return dataMap.values().stream()
                .anyMatch(response -> response.getTotalCount() != null && response.getTotalCount() >= limit);
    }

    /**
     * Generate next cursor for pagination
     */
    private String generateNextCursor(Map<String, DataTypeResponse> dataMap) {
        // Simplified cursor generation - use the latest timestamp
        return dataMap.values().stream()
                .map(DataTypeResponse::getLastModified)
                .filter(Objects::nonNull)
                .max(String::compareTo)
                .orElse(null);
    }

    /**
     * Get story statistics for monitoring
     */
    public CompletableFuture<Map<String, Object>> getStoryStatistics() {
        return storyRepository.getStoryStats()
                .thenApply(stats -> {
                    Map<String, Object> result = new HashMap<>();
                    result.put("totalStories", stats.getTotalStories());
                    result.put("availableStories", stats.getAvailableStories());
                    result.put("unavailableStories", stats.getUnavailableStories());
                    result.put("totalDownloads", stats.getTotalDownloads());
                    result.put("averageRating", stats.getAverageRating());
                    result.put("mostPopularCategory", stats.getMostPopularCategory());
                    return result;
                });
    }

    /**
     * Health check for bulk data service
     */
    public CompletableFuture<Boolean> healthCheck() {
        return storyRepository.count()
                .thenApply(count -> count >= 0)
                .exceptionally(throwable -> false);
    }
}
