package com.app.integration;

import com.app.dto.BulkDataDTOs.*;
import com.app.model.Story;
import com.app.repository.StoryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
        "firebase.use-emulator=true",
        "firebase.emulator-host=localhost:8080",
        "firebase.project-id=test-project"
})
class BulkDataIntegrationTest {
    
    @Autowired
    private WebApplicationContext webApplicationContext;
    
    @Autowired
    private StoryRepository storyRepository;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    private MockMvc mockMvc;
    
    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        
        // Clean up and set up test data
        setupTestData();
    }
    
    @Test
    void pollBulkData_WithStoriesDataType_ShouldReturnStoriesFromFirestore() throws Exception {
        // Arrange
        BulkDataRequest request = new BulkDataRequest();
        request.setDataTypes(List.of("stories"));
        request.setLastSyncTimestamp("2020-01-01T00:00:00Z"); // Old timestamp to get all stories
        request.setLimit(10);
        
        // Act & Assert
        mockMvc.perform(post("/api/v1/bulk/poll")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.syncTimestamp").exists())
                .andExpect(jsonPath("$.data.stories").exists())
                .andExpect(jsonPath("$.data.stories.dataType").value("stories"))
                .andExpect(jsonPath("$.data.stories.totalCount").exists())
                .andExpect(jsonPath("$.data.stories.items").isArray())
                .andExpect(jsonPath("$.hasMore").exists())
                .andExpect(jsonPath("$.metadata").exists())
                .andExpect(jsonPath("$.metadata.serverVersion").value("1.0.0"))
                .andExpect(jsonPath("$.metadata.processingTimeMs").exists())
                .andExpect(jsonPath("$.pagination").exists());
    }
    
    @Test
    void pollBulkData_WithStorySummariesDataType_ShouldReturnSummariesFromFirestore() throws Exception {
        // Arrange
        BulkDataRequest request = new BulkDataRequest();
        request.setDataTypes(List.of("story_summaries"));
        request.setLastSyncTimestamp("2020-01-01T00:00:00Z");
        request.setLimit(20);
        
        // Act & Assert
        mockMvc.perform(post("/api/v1/bulk/poll")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.data.story_summaries").exists())
                .andExpect(jsonPath("$.data.story_summaries.dataType").value("story_summaries"))
                .andExpect(jsonPath("$.data.story_summaries.totalCount").exists())
                .andExpect(jsonPath("$.data.story_summaries.items").isArray());
    }
    
    @Test
    void pollBulkData_WithFilters_ShouldReturnFilteredResults() throws Exception {
        // Arrange
        BulkDataRequest request = new BulkDataRequest();
        request.setDataTypes(List.of("stories"));
        request.setLastSyncTimestamp("2020-01-01T00:00:00Z");
        request.setLimit(10);
        
        // Add category filter
        request.setFilters(java.util.Map.of("category", "bedtime", "available", true));
        
        // Act & Assert
        mockMvc.perform(post("/api/v1/bulk/poll")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.stories.items").isArray())
                .andExpect(jsonPath("$.data.stories.summary.categoryBreakdown.bedtime").exists())
                .andExpect(jsonPath("$.data.stories.summary.availableCount").exists());
    }
    
    @Test
    void pollBulkData_WithMultipleDataTypes_ShouldReturnAllRequestedTypes() throws Exception {
        // Arrange
        BulkDataRequest request = new BulkDataRequest();
        request.setDataTypes(List.of("stories", "story_summaries"));
        request.setLastSyncTimestamp("2020-01-01T00:00:00Z");
        request.setLimit(15);
        
        // Act & Assert
        mockMvc.perform(post("/api/v1/bulk/poll")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.stories").exists())
                .andExpect(jsonPath("$.data.story_summaries").exists())
                .andExpect(jsonPath("$.data.stories.dataType").value("stories"))
                .andExpect(jsonPath("$.data.story_summaries.dataType").value("story_summaries"));
    }
    
    @Test
    void getBulkDataStats_ShouldReturnActualStatisticsFromFirestore() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/v1/bulk/stats"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.totalStories").exists())
                .andExpect(jsonPath("$.availableStories").exists())
                .andExpect(jsonPath("$.unavailableStories").exists())
                .andExpect(jsonPath("$.totalDownloads").exists())
                .andExpect(jsonPath("$.averageRating").exists())
                .andExpect(jsonPath("$.mostPopularCategory").exists());
    }
    
    @Test
    void healthCheck_ShouldReturnUpStatusWhenFirestoreIsAvailable() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/v1/bulk/health"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("bulk-data-service"))
                .andExpect(jsonPath("$.timestamp").exists())
                .andExpect(jsonPath("$.responseTimeMs").exists());
    }
    
    @Test
    void getSupportedDataTypes_ShouldReturnCorrectDataTypesInfo() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/v1/bulk/data-types"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.supportedDataTypes.stories.description").exists())
                .andExpect(jsonPath("$.supportedDataTypes.stories.fields").isArray())
                .andExpect(jsonPath("$.supportedDataTypes.stories.maxLimit").value(100))
                .andExpect(jsonPath("$.supportedDataTypes.story_summaries.description").exists())
                .andExpect(jsonPath("$.supportedDataTypes.story_summaries.fields").isArray())
                .andExpect(jsonPath("$.supportedDataTypes.story_summaries.maxLimit").value(500))
                .andExpect(jsonPath("$.version").value("1.0.0"))
                .andExpect(jsonPath("$.timestamp").exists());
    }
    
    @Test
    void pollBulkData_WithRecentSyncTimestamp_ShouldReturnOnlyRecentlyUpdatedStories() throws Exception {
        // Arrange - Use a recent timestamp to filter out older stories
        String recentTimestamp = Instant.now().minusSeconds(3600).toString(); // 1 hour ago
        
        BulkDataRequest request = new BulkDataRequest();
        request.setDataTypes(List.of("stories"));
        request.setLastSyncTimestamp(recentTimestamp);
        request.setLimit(10);
        
        // Act & Assert
        mockMvc.perform(post("/api/v1/bulk/poll")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.stories.items").isArray())
                .andExpect(jsonPath("$.data.stories.newCount").exists())
                .andExpect(jsonPath("$.data.stories.updatedCount").exists())
                .andExpect(jsonPath("$.data.stories.lastModified").exists());
    }
    
    @Test
    void pollBulkData_WithInvalidDataType_ShouldReturnError() throws Exception {
        // Arrange
        BulkDataRequest request = new BulkDataRequest();
        request.setDataTypes(List.of("invalid_data_type"));
        request.setLastSyncTimestamp("2020-01-01T00:00:00Z");
        
        // Act & Assert
        mockMvc.perform(post("/api/v1/bulk/poll")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.metadata.errors").exists());
    }
    
    private void setupTestData() {
        try {
            // Create test stories
            Story bedtimeStory1 = new Story("bedtime-1", "The Sleepy Bear", "bedtime");
            bedtimeStory1.setAvailable(true);
            bedtimeStory1.setDownloadCount(50L);
            bedtimeStory1.setRating(4.5);
            bedtimeStory1.setAgeRange("2-5");
            bedtimeStory1.setDuration(300);
            bedtimeStory1.setDescription("A gentle bedtime story about a sleepy bear");
            bedtimeStory1.setCreatedAt(Instant.now().minusSeconds(7200)); // 2 hours ago
            bedtimeStory1.setUpdatedAt(Instant.now().minusSeconds(3600)); // 1 hour ago
            
            Story adventureStory1 = new Story("adventure-1", "The Brave Little Mouse", "adventure");
            adventureStory1.setAvailable(true);
            adventureStory1.setDownloadCount(75L);
            adventureStory1.setRating(4.2);
            adventureStory1.setAgeRange("3-6");
            adventureStory1.setDuration(450);
            adventureStory1.setDescription("An exciting adventure story");
            adventureStory1.setCreatedAt(Instant.now().minusSeconds(10800)); // 3 hours ago
            adventureStory1.setUpdatedAt(Instant.now().minusSeconds(5400)); // 1.5 hours ago
            
            Story bedtimeStory2 = new Story("bedtime-2", "Moonlight Dreams", "bedtime");
            bedtimeStory2.setAvailable(false); // Not available
            bedtimeStory2.setDownloadCount(25L);
            bedtimeStory2.setRating(4.0);
            bedtimeStory2.setAgeRange("2-4");
            bedtimeStory2.setDuration(250);
            bedtimeStory2.setDescription("A dreamy bedtime story");
            bedtimeStory2.setCreatedAt(Instant.now().minusSeconds(14400)); // 4 hours ago
            bedtimeStory2.setUpdatedAt(Instant.now().minusSeconds(7200)); // 2 hours ago
            
            // Save stories to repository
            CompletableFuture.allOf(
                    storyRepository.save(bedtimeStory1),
                    storyRepository.save(adventureStory1),
                    storyRepository.save(bedtimeStory2)
            ).join();
            
            // Wait a bit for Firestore to process
            Thread.sleep(1000);
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to setup test data", e);
        }
    }
}
