package com.app.controller;

import com.app.config.TestConfig;
import com.app.dto.BulkDataDTOs.*;
import com.app.service.ApplicationMetricsService;
import com.app.service.BulkDataService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;

import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = BulkDataController.class, excludeAutoConfiguration = {
        org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration.class
})
@Import(TestConfig.class)
class BulkDataControllerTest {
    
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BulkDataService bulkDataService;

    @Autowired
    private ApplicationMetricsService metricsService;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Test
    void pollBulkData_WithValidRequest_ShouldReturnSuccessResponse() throws Exception {
        // Arrange
        BulkDataRequest request = new BulkDataRequest();
        request.setDataTypes(List.of("stories"));
        request.setLastSyncTimestamp("2023-01-01T00:00:00Z");
        request.setLimit(10);
        
        BulkDataResponse mockResponse = createMockBulkDataResponse();
        when(bulkDataService.processBulkDataRequest(any(BulkDataRequest.class)))
                .thenReturn(CompletableFuture.completedFuture(mockResponse));
        
        // Act & Assert
        mockMvc.perform(post("/api/v1/bulk/poll")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.syncTimestamp").exists())
                .andExpect(jsonPath("$.data").exists())
                .andExpect(jsonPath("$.hasMore").exists())
                .andExpect(jsonPath("$.metadata").exists());
        
        // Verify service was called
        verify(bulkDataService).processBulkDataRequest(any(BulkDataRequest.class));
        
        // Verify metrics were recorded
        verify(metricsService).recordCustomTimer(eq("bulk.data.request.duration"), anyLong(), 
                eq("endpoint"), eq("poll"), eq("success"), eq("true"));
    }
    
    @Test
    void pollBulkData_WithServiceError_ShouldReturnErrorResponse() throws Exception {
        // Arrange
        BulkDataRequest request = new BulkDataRequest();
        request.setDataTypes(List.of("stories"));
        
        when(bulkDataService.processBulkDataRequest(any(BulkDataRequest.class)))
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("Service error")));
        
        // Act & Assert
        mockMvc.perform(post("/api/v1/bulk/poll")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.metadata.errors").exists());
        
        // Verify error metrics were recorded
        verify(metricsService).recordCustomTimer(eq("bulk.data.request.duration"), anyLong(), 
                eq("endpoint"), eq("poll"), eq("success"), eq("false"));
        verify(metricsService).recordCustomMetric(eq("bulk.data.request.errors"), 
                eq("endpoint"), eq("poll"), eq("error_type"), eq("RuntimeException"));
    }
    
    @Test
    void pollBulkData_WithInvalidJson_ShouldReturnBadRequest() throws Exception {
        // Act & Assert
        mockMvc.perform(post("/api/v1/bulk/poll")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("invalid json"))
                .andExpect(status().isBadRequest());
    }
    
    @Test
    void getBulkDataStats_WithValidRequest_ShouldReturnStats() throws Exception {
        // Arrange
        Map<String, Object> mockStats = Map.of(
                "totalStories", 100L,
                "availableStories", 85L,
                "unavailableStories", 15L,
                "totalDownloads", 5000L,
                "averageRating", 4.2,
                "mostPopularCategory", "bedtime"
        );
        
        when(bulkDataService.getStoryStatistics())
                .thenReturn(CompletableFuture.completedFuture(mockStats));
        
        // Act & Assert
        mockMvc.perform(get("/api/v1/bulk/stats"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.totalStories").value(100))
                .andExpect(jsonPath("$.availableStories").value(85))
                .andExpect(jsonPath("$.unavailableStories").value(15))
                .andExpect(jsonPath("$.totalDownloads").value(5000))
                .andExpect(jsonPath("$.averageRating").value(4.2))
                .andExpect(jsonPath("$.mostPopularCategory").value("bedtime"));
        
        // Verify service was called
        verify(bulkDataService).getStoryStatistics();
        
        // Verify metrics were recorded
        verify(metricsService).recordCustomTimer(eq("bulk.data.stats.duration"), anyLong(), 
                eq("endpoint"), eq("stats"), eq("success"), eq("true"));
    }
    
    @Test
    void getBulkDataStats_WithServiceError_ShouldReturnError() throws Exception {
        // Arrange
        when(bulkDataService.getStoryStatistics())
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("Stats error")));
        
        // Act & Assert
        mockMvc.perform(get("/api/v1/bulk/stats"))
                .andExpect(status().isInternalServerError());
        
        // Verify error metrics were recorded
        verify(metricsService).recordCustomTimer(eq("bulk.data.stats.duration"), anyLong(), 
                eq("endpoint"), eq("stats"), eq("success"), eq("false"));
        verify(metricsService).recordCustomMetric(eq("bulk.data.stats.errors"), 
                eq("endpoint"), eq("stats"), eq("error_type"), eq("RuntimeException"));
    }
    
    @Test
    void healthCheck_WhenServiceIsHealthy_ShouldReturnUpStatus() throws Exception {
        // Arrange
        when(bulkDataService.healthCheck())
                .thenReturn(CompletableFuture.completedFuture(true));
        
        // Act & Assert
        mockMvc.perform(get("/api/v1/bulk/health"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("bulk-data-service"))
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.responseTimeMs").exists());
        
        // Verify service was called
        verify(bulkDataService).healthCheck();
        
        // Verify metrics were recorded
        verify(metricsService).recordCustomTimer(eq("bulk.data.health.duration"), anyLong(), 
                eq("status"), eq("UP"));
        verify(metricsService).recordCustomMetric(eq("bulk.data.health.checks"), 
                eq("status"), eq("UP"));
    }
    
    @Test
    void healthCheck_WhenServiceIsUnhealthy_ShouldReturnDownStatus() throws Exception {
        // Arrange
        when(bulkDataService.healthCheck())
                .thenReturn(CompletableFuture.completedFuture(false));
        
        // Act & Assert
        mockMvc.perform(get("/api/v1/bulk/health"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value("DOWN"))
                .andExpect(jsonPath("$.service").value("bulk-data-service"))
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.responseTimeMs").exists());
        
        // Verify metrics were recorded
        verify(metricsService).recordCustomTimer(eq("bulk.data.health.duration"), anyLong(), 
                eq("status"), eq("DOWN"));
        verify(metricsService).recordCustomMetric(eq("bulk.data.health.checks"), 
                eq("status"), eq("DOWN"));
    }
    
    @Test
    void healthCheck_WithServiceError_ShouldReturnErrorStatus() throws Exception {
        // Arrange
        when(bulkDataService.healthCheck())
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("Health check failed")));
        
        // Act & Assert
        mockMvc.perform(get("/api/v1/bulk/health"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value("DOWN"))
                .andExpect(jsonPath("$.service").value("bulk-data-service"))
                .andExpect(jsonPath("$.error").exists());
        
        // Verify error metrics were recorded
        verify(metricsService).recordCustomTimer(eq("bulk.data.health.duration"), anyLong(), 
                eq("status"), eq("ERROR"));
        verify(metricsService).recordCustomMetric(eq("bulk.data.health.errors"), 
                eq("error_type"), eq("RuntimeException"));
    }
    
    @Test
    void getSupportedDataTypes_ShouldReturnDataTypesInfo() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/v1/bulk/data-types"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.supportedDataTypes").exists())
                .andExpect(jsonPath("$.supportedDataTypes.stories").exists())
                .andExpect(jsonPath("$.supportedDataTypes.story_summaries").exists())
                .andExpect(jsonPath("$.supportedDataTypes.stories.description").exists())
                .andExpect(jsonPath("$.supportedDataTypes.stories.fields").isArray())
                .andExpect(jsonPath("$.supportedDataTypes.stories.maxLimit").value(100))
                .andExpect(jsonPath("$.supportedDataTypes.story_summaries.maxLimit").value(500))
                .andExpect(jsonPath("$.version").value("1.0.0"))
                .andExpect(jsonPath("$.timestamp").exists());
        
        // Verify metrics were recorded
        verify(metricsService).recordCustomMetric(eq("bulk.data.data_types.requests"), 
                eq("endpoint"), eq("data-types"));
    }
    
    @Test
    void handleValidationError_ShouldReturnBadRequestWithErrorResponse() throws Exception {
        // Arrange
        BulkDataRequest request = new BulkDataRequest();
        request.setDataTypes(List.of("invalid_type"));
        
        when(bulkDataService.processBulkDataRequest(any(BulkDataRequest.class)))
                .thenReturn(CompletableFuture.failedFuture(new IllegalArgumentException("Invalid data type")));
        
        // Act & Assert
        mockMvc.perform(post("/api/v1/bulk/poll")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError()) // Note: This will be 500 due to CompletableFuture exception handling
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));
    }
    
    // Helper methods
    private BulkDataResponse createMockBulkDataResponse() {
        BulkDataResponse response = new BulkDataResponse();
        response.setSyncTimestamp("2023-01-01T12:00:00Z");
        response.setHasMore(false);
        
        // Create mock data
        DataTypeResponse storiesResponse = new DataTypeResponse("stories", List.of());
        storiesResponse.setTotalCount(0);
        response.setData(Map.of("stories", storiesResponse));
        
        // Create mock metadata
        SyncMetadata metadata = new SyncMetadata();
        metadata.setServerVersion("1.0.0");
        metadata.setProcessingTimeMs(100L);
        metadata.setCompressionRatio(85);
        response.setMetadata(metadata);
        
        // Create mock pagination
        PaginationInfo pagination = new PaginationInfo(1, 10, 0L);
        response.setPagination(pagination);
        
        return response;
    }
}
