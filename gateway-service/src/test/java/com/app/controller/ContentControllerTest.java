package com.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.ActiveProfiles;


import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;

@SpringBootTest(classes = com.app.service.GatewayServiceApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ContentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @WithMockUser(username = "test-user-123")
    void getStoriesBatch_WithDefaultParameters_ShouldReturnStories() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/stories/batch"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.metadata.totalCount").exists())
                .andExpect(jsonPath("$.metadata.page").value(0))
                .andExpect(jsonPath("$.metadata.size").value(100));
    }

    @Test
    @WithMockUser(username = "test-user-123")
    void getStoriesBatch_WithCustomParameters_ShouldReturnFilteredStories() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/stories/batch")
                .param("page", "1")
                .param("size", "50")
                .param("category", "bedtime")
                .param("ageRange", "3-5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.metadata.page").value(1))
                .andExpect(jsonPath("$.metadata.size").value(50));
    }

    @Test
    void getStoriesBatch_WithoutAuthentication_ShouldReturnUnauthorized() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/stories/batch"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "test-user-123")
    void getStoriesBatch_WithInvalidPageSize_ShouldUseDefaults() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/stories/batch")
                .param("page", "-1")
                .param("size", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.metadata.page").value(0))
                .andExpect(jsonPath("$.metadata.size").value(100));
    }

    @Test
    @WithMockUser(username = "test-user-123")
    void getStoriesBatch_WithLargePageSize_ShouldLimitSize() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/stories/batch")
                .param("size", "1000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.metadata.size").value(500)); // Should be limited to max
    }

    @Test
    @WithMockUser(username = "test-user-123")
    void getContentMetadata_ShouldReturnMetadata() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/content/metadata"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.categories").isArray())
                .andExpect(jsonPath("$.data.settings").exists())
                .andExpect(jsonPath("$.data.announcements").isArray());
    }

    @Test
    void getContentMetadata_WithoutAuthentication_ShouldReturnUnauthorized() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/content/metadata"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "test-user-123")
    void updateUserPreferences_WithValidData_ShouldReturnSuccess() throws Exception {
        // Given
        Map<String, Object> preferences = new HashMap<>();
        preferences.put("theme", "dark");
        preferences.put("notifications", true);
        preferences.put("language", "en");

        // When & Then
        mockMvc.perform(post("/api/v1/user/preferences")
                .contentType(MediaType.APPLICATION_JSON).with(csrf())
                .content(objectMapper.writeValueAsString(preferences)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Preferences updated successfully"));
    }

    @Test
    void updateUserPreferences_WithoutAuthentication_ShouldReturnUnauthorized() throws Exception {
        // Given
        Map<String, Object> preferences = new HashMap<>();
        preferences.put("theme", "dark");

        // When & Then
        mockMvc.perform(post("/api/v1/user/preferences")
                .contentType(MediaType.APPLICATION_JSON).with(csrf())
                .content(objectMapper.writeValueAsString(preferences)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "test-user-123")
    void updateUserPreferences_WithEmptyData_ShouldReturnBadRequest() throws Exception {
        // When & Then
        mockMvc.perform(post("/api/v1/user/preferences")
                .contentType(MediaType.APPLICATION_JSON).with(csrf())
                .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @WithMockUser(username = "test-user-123")
    void updateUserPreferences_WithInvalidJson_ShouldReturnBadRequest() throws Exception {
        // When & Then
        mockMvc.perform(post("/api/v1/user/preferences")
                .contentType(MediaType.APPLICATION_JSON).with(csrf())
                .content("invalid json"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "test-user-123")
    void processBatchRequest_WithValidRequests_ShouldReturnBatchResponse() throws Exception {
        // Given
        Map<String, Object> batchRequest = new HashMap<>();
        batchRequest.put("requests", java.util.Arrays.asList(
            java.util.Map.of("endpoint", "/api/v1/stories/batch", "method", "GET"),
            java.util.Map.of("endpoint", "/api/v1/content/metadata", "method", "GET")
        ));

        // When & Then
        mockMvc.perform(post("/api/v1/batch")
                .contentType(MediaType.APPLICATION_JSON).with(csrf())
                .content(objectMapper.writeValueAsString(batchRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.responses").isArray())
                .andExpect(jsonPath("$.responses.length()").value(2));
    }

    @Test
    void processBatchRequest_WithoutAuthentication_ShouldReturnUnauthorized() throws Exception {
        // Given
        Map<String, Object> batchRequest = new HashMap<>();
        batchRequest.put("requests", java.util.Arrays.asList(
            java.util.Map.of("endpoint", "/api/v1/stories/batch", "method", "GET")
        ));

        // When & Then
        mockMvc.perform(post("/api/v1/batch")
                .contentType(MediaType.APPLICATION_JSON).with(csrf())
                .content(objectMapper.writeValueAsString(batchRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "test-user-123")
    void processBatchRequest_WithEmptyRequests_ShouldReturnBadRequest() throws Exception {
        // Given
        Map<String, Object> batchRequest = new HashMap<>();
        batchRequest.put("requests", java.util.Collections.emptyList());

        // When & Then
        mockMvc.perform(post("/api/v1/batch")
                .contentType(MediaType.APPLICATION_JSON).with(csrf())
                .content(objectMapper.writeValueAsString(batchRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @WithMockUser(username = "test-user-123")
    void processBatchRequest_WithTooManyRequests_ShouldReturnBadRequest() throws Exception {
        // Given - Create more than 10 requests (assuming limit is 10)
        java.util.List<Map<String, String>> requests = new java.util.ArrayList<>();
        for (int i = 0; i < 15; i++) {
            requests.add(java.util.Map.of("endpoint", "/api/v1/stories/batch", "method", "GET"));
        }
        
        Map<String, Object> batchRequest = new HashMap<>();
        batchRequest.put("requests", requests);

        // When & Then
        mockMvc.perform(post("/api/v1/batch")
                .contentType(MediaType.APPLICATION_JSON).with(csrf())
                .content(objectMapper.writeValueAsString(batchRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @WithMockUser(username = "test-user-123")
    void processBatchRequest_WithInvalidEndpoint_ShouldReturnPartialSuccess() throws Exception {
        // Given
        Map<String, Object> batchRequest = new HashMap<>();
        batchRequest.put("requests", java.util.Arrays.asList(
            java.util.Map.of("endpoint", "/api/v1/stories/batch", "method", "GET"),
            java.util.Map.of("endpoint", "/api/v1/invalid/endpoint", "method", "GET")
        ));

        // When & Then
        mockMvc.perform(post("/api/v1/batch")
                .contentType(MediaType.APPLICATION_JSON).with(csrf())
                .content(objectMapper.writeValueAsString(batchRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.responses").isArray())
                .andExpect(jsonPath("$.responses.length()").value(2))
                .andExpect(jsonPath("$.responses[0].success").value(true))
                .andExpect(jsonPath("$.responses[1].success").value(false));
    }

    @Test
    @WithMockUser(username = "test-user-123")
    void getStoriesBatch_ShouldReturnStoryMetadataStructure() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/stories/batch"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").exists())
                .andExpect(jsonPath("$.data[0].title").exists())
                .andExpect(jsonPath("$.data[0].category").exists())
                .andExpect(jsonPath("$.data[0].tag").exists())
                .andExpect(jsonPath("$.data[0].emoji").exists())
                .andExpect(jsonPath("$.data[0].coverImage").exists())
                .andExpect(jsonPath("$.data[0].isAvailable").exists())
                .andExpect(jsonPath("$.data[0].ageRange").exists())
                .andExpect(jsonPath("$.data[0].duration").exists())
                .andExpect(jsonPath("$.data[0].description").exists())
                .andExpect(jsonPath("$.data[0].pages").isArray())
                .andExpect(jsonPath("$.data[0].createdAt").exists())
                .andExpect(jsonPath("$.data[0].updatedAt").exists());
    }

    @Test
    @WithMockUser(username = "test-user-123")
    void getContentMetadata_ShouldReturnCompleteMetadataStructure() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/content/metadata"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.categories[0].id").exists())
                .andExpect(jsonPath("$.data.categories[0].name").exists())
                .andExpect(jsonPath("$.data.categories[0].description").exists())
                .andExpect(jsonPath("$.data.categories[0].emoji").exists())
                .andExpect(jsonPath("$.data.settings.appVersion").exists())
                .andExpect(jsonPath("$.data.settings.maintenanceMode").exists())
                .andExpect(jsonPath("$.data.announcements[0].id").exists())
                .andExpect(jsonPath("$.data.announcements[0].title").exists())
                .andExpect(jsonPath("$.data.announcements[0].message").exists());
    }
}
