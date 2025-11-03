package com.app.service;

import com.app.dto.BulkDataDTOs.*;
import com.app.model.Story;
import com.app.repository.StoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BulkDataServiceTest {
    
    @Mock
    private StoryRepository storyRepository;
    
    @Mock
    private ApplicationMetricsService metricsService;
    
    private BulkDataService bulkDataService;
    
    @BeforeEach
    void setUp() {
        bulkDataService = new BulkDataService(storyRepository, metricsService);
    }
    
    @Test
    void processBulkDataRequest_WithStoriesDataType_ShouldReturnStoriesData() {
        // Arrange
        BulkDataRequest request = new BulkDataRequest();
        request.setDataTypes(List.of("stories"));
        request.setLastSyncTimestamp("2023-01-01T00:00:00Z");
        request.setLimit(10);
        
        List<Story> mockStories = createMockStories();
        when(storyRepository.findForBulkSync(any(Instant.class), eq(10), isNull()))
                .thenReturn(CompletableFuture.completedFuture(mockStories));
        
        // Act
        CompletableFuture<BulkDataResponse> result = bulkDataService.processBulkDataRequest(request);
        BulkDataResponse response = result.join();
        
        // Assert
        assertNotNull(response);
        assertNotNull(response.getData());
        assertTrue(response.getData().containsKey("stories"));
        
        DataTypeResponse storiesResponse = response.getData().get("stories");
        assertEquals("stories", storiesResponse.getDataType());
        assertEquals(mockStories.size(), storiesResponse.getTotalCount());
        assertNotNull(storiesResponse.getItems());
        
        // Verify metrics were recorded
        verify(metricsService).recordBulkDataRequest(eq("stories"), eq(mockStories.size()), anyLong());
    }
    
    @Test
    void processBulkDataRequest_WithStorySummariesDataType_ShouldReturnStorySummaries() {
        // Arrange
        BulkDataRequest request = new BulkDataRequest();
        request.setDataTypes(List.of("story_summaries"));
        request.setLastSyncTimestamp("2023-01-01T00:00:00Z");
        request.setLimit(20);
        
        List<Story> mockStories = createMockStories();
        when(storyRepository.findForBulkSync(any(Instant.class), eq(20), isNull()))
                .thenReturn(CompletableFuture.completedFuture(mockStories));
        
        // Act
        CompletableFuture<BulkDataResponse> result = bulkDataService.processBulkDataRequest(request);
        BulkDataResponse response = result.join();
        
        // Assert
        assertNotNull(response);
        assertNotNull(response.getData());
        assertTrue(response.getData().containsKey("story_summaries"));
        
        DataTypeResponse summariesResponse = response.getData().get("story_summaries");
        assertEquals("story_summaries", summariesResponse.getDataType());
        assertEquals(mockStories.size(), summariesResponse.getTotalCount());
        assertNotNull(summariesResponse.getItems());
        
        // Verify the items are StorySummary objects (lightweight)
        List<Object> items = summariesResponse.getItems();
        assertFalse(items.isEmpty());
        
        // Verify metrics were recorded
        verify(metricsService).recordBulkDataRequest(eq("story_summaries"), eq(mockStories.size()), anyLong());
    }
    
    @Test
    void processBulkDataRequest_WithMultipleDataTypes_ShouldReturnAllDataTypes() {
        // Arrange
        BulkDataRequest request = new BulkDataRequest();
        request.setDataTypes(List.of("stories", "story_summaries"));
        request.setLastSyncTimestamp("2023-01-01T00:00:00Z");
        request.setLimit(15);
        
        List<Story> mockStories = createMockStories();
        when(storyRepository.findForBulkSync(any(Instant.class), eq(15), isNull()))
                .thenReturn(CompletableFuture.completedFuture(mockStories));
        
        // Act
        CompletableFuture<BulkDataResponse> result = bulkDataService.processBulkDataRequest(request);
        BulkDataResponse response = result.join();
        
        // Assert
        assertNotNull(response);
        assertNotNull(response.getData());
        assertEquals(2, response.getData().size());
        assertTrue(response.getData().containsKey("stories"));
        assertTrue(response.getData().containsKey("story_summaries"));
        
        // Verify metrics were recorded for both data types
        verify(metricsService).recordBulkDataRequest(eq("stories"), eq(mockStories.size()), anyLong());
        verify(metricsService).recordBulkDataRequest(eq("story_summaries"), eq(mockStories.size()), anyLong());
    }
    
    @Test
    void processBulkDataRequest_WithFilters_ShouldApplyFilters() {
        // Arrange
        BulkDataRequest request = new BulkDataRequest();
        request.setDataTypes(List.of("stories"));
        request.setLastSyncTimestamp("2023-01-01T00:00:00Z");
        request.setLimit(10);
        
        Map<String, Object> filters = new HashMap<>();
        filters.put("category", "bedtime");
        filters.put("available", true);
        request.setFilters(filters);
        
        List<Story> mockStories = createMockStoriesWithDifferentCategories();
        when(storyRepository.findForBulkSync(any(Instant.class), eq(10), isNull()))
                .thenReturn(CompletableFuture.completedFuture(mockStories));
        
        // Act
        CompletableFuture<BulkDataResponse> result = bulkDataService.processBulkDataRequest(request);
        BulkDataResponse response = result.join();
        
        // Assert
        assertNotNull(response);
        DataTypeResponse storiesResponse = response.getData().get("stories");
        
        // Should only return bedtime stories that are available
        List<Object> items = storiesResponse.getItems();
        assertTrue(items.size() < mockStories.size()); // Filtered results should be fewer
        
        // Verify all returned stories match the filter criteria
        for (Object item : items) {
            Story story = (Story) item;
            assertEquals("bedtime", story.getCategory());
            assertTrue(story.isAvailable());
        }
    }
    
    @Test
    void processBulkDataRequest_WithInvalidDataType_ShouldThrowException() {
        // Arrange
        BulkDataRequest request = new BulkDataRequest();
        request.setDataTypes(List.of("invalid_data_type"));
        request.setLastSyncTimestamp("2023-01-01T00:00:00Z");
        
        // Act & Assert
        CompletableFuture<BulkDataResponse> result = bulkDataService.processBulkDataRequest(request);
        
        assertThrows(RuntimeException.class, result::join);
        
        // Verify error metrics were recorded
        verify(metricsService).recordBulkDataError(eq("unknown"), anyString());
    }
    
    @Test
    void processBulkDataRequest_WithRepositoryError_ShouldRecordErrorMetrics() {
        // Arrange
        BulkDataRequest request = new BulkDataRequest();
        request.setDataTypes(List.of("stories"));
        request.setLastSyncTimestamp("2023-01-01T00:00:00Z");
        
        when(storyRepository.findForBulkSync(any(Instant.class), anyInt(), isNull()))
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("Database error")));
        
        // Act & Assert
        CompletableFuture<BulkDataResponse> result = bulkDataService.processBulkDataRequest(request);
        
        assertThrows(RuntimeException.class, result::join);
        
        // Verify error metrics were recorded
        verify(metricsService).recordBulkDataError(eq("stories"), eq("CompletionException"));
    }
    
    @Test
    void processBulkDataRequest_ShouldSetCorrectMetadata() {
        // Arrange
        BulkDataRequest request = new BulkDataRequest();
        request.setDataTypes(List.of("stories"));
        request.setLastSyncTimestamp("2023-01-01T00:00:00Z");
        
        List<Story> mockStories = createMockStories();
        when(storyRepository.findForBulkSync(any(Instant.class), anyInt(), isNull()))
                .thenReturn(CompletableFuture.completedFuture(mockStories));
        
        // Act
        CompletableFuture<BulkDataResponse> result = bulkDataService.processBulkDataRequest(request);
        BulkDataResponse response = result.join();
        
        // Assert
        assertNotNull(response.getMetadata());
        assertEquals("1.0.0", response.getMetadata().getServerVersion());
        assertNotNull(response.getMetadata().getProcessingTimeMs());
        assertTrue(response.getMetadata().getProcessingTimeMs() >= 0);
        assertEquals(85, response.getMetadata().getCompressionRatio());
        assertNotNull(response.getMetadata().getServerInfo());
        
        assertNotNull(response.getSyncTimestamp());
        assertNotNull(response.getPagination());
    }
    
    @Test
    void getStoryStatistics_ShouldReturnCorrectStatistics() {
        // Arrange
        StoryRepository.StoryStats mockStats = new StoryRepository.StoryStats(
                100L, 85L, 15L, 5000L, 4.2, "bedtime"
        );
        when(storyRepository.getStoryStats())
                .thenReturn(CompletableFuture.completedFuture(mockStats));
        
        // Act
        CompletableFuture<Map<String, Object>> result = bulkDataService.getStoryStatistics();
        Map<String, Object> stats = result.join();
        
        // Assert
        assertNotNull(stats);
        assertEquals(100L, stats.get("totalStories"));
        assertEquals(85L, stats.get("availableStories"));
        assertEquals(15L, stats.get("unavailableStories"));
        assertEquals(5000L, stats.get("totalDownloads"));
        assertEquals(4.2, stats.get("averageRating"));
        assertEquals("bedtime", stats.get("mostPopularCategory"));
    }
    
    @Test
    void healthCheck_WhenRepositoryIsHealthy_ShouldReturnTrue() {
        // Arrange
        when(storyRepository.count())
                .thenReturn(CompletableFuture.completedFuture(10L));
        
        // Act
        CompletableFuture<Boolean> result = bulkDataService.healthCheck();
        Boolean isHealthy = result.join();
        
        // Assert
        assertTrue(isHealthy);
    }
    
    @Test
    void healthCheck_WhenRepositoryFails_ShouldReturnFalse() {
        // Arrange
        when(storyRepository.count())
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("Database error")));
        
        // Act
        CompletableFuture<Boolean> result = bulkDataService.healthCheck();
        Boolean isHealthy = result.join();
        
        // Assert
        assertFalse(isHealthy);
    }
    
    // Helper methods
    private List<Story> createMockStories() {
        List<Story> stories = new ArrayList<>();
        
        for (int i = 1; i <= 3; i++) {
            Story story = new Story("story-" + i, "Test Story " + i, "bedtime");
            story.setAvailable(true);
            story.setDownloadCount((long) (i * 10));
            story.setRating(4.0 + (i * 0.1));
            story.setCreatedAt(Instant.now().minusSeconds(3600 * i));
            story.setUpdatedAt(Instant.now().minusSeconds(1800 * i));
            stories.add(story);
        }
        
        return stories;
    }
    
    private List<Story> createMockStoriesWithDifferentCategories() {
        List<Story> stories = new ArrayList<>();
        
        // Bedtime stories (available)
        Story bedtime1 = new Story("bedtime-1", "Bedtime Story 1", "bedtime");
        bedtime1.setAvailable(true);
        stories.add(bedtime1);
        
        Story bedtime2 = new Story("bedtime-2", "Bedtime Story 2", "bedtime");
        bedtime2.setAvailable(true);
        stories.add(bedtime2);
        
        // Adventure stories (available)
        Story adventure1 = new Story("adventure-1", "Adventure Story 1", "adventure");
        adventure1.setAvailable(true);
        stories.add(adventure1);
        
        // Bedtime story (not available)
        Story bedtime3 = new Story("bedtime-3", "Bedtime Story 3", "bedtime");
        bedtime3.setAvailable(false);
        stories.add(bedtime3);
        
        return stories;
    }
}
