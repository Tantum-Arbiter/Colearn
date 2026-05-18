package com.app.controller;

import com.app.security.JwtAuthenticationFilter;
import com.app.service.ContentAnalyticsService;
import com.app.service.GatewayServiceApplication;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = GatewayServiceApplication.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class AnalyticsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ContentAnalyticsService contentAnalyticsService;

    @BeforeEach
    void setUp() {
        reset(contentAnalyticsService);
        setAuthenticatedUser("test-user-123");
    }

    private void setAuthenticatedUser(String userId) {
        var authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"));
        var auth = new UsernamePasswordAuthenticationToken(userId, null, authorities);
        var details = new JwtAuthenticationFilter.UserAuthenticationDetails();
        details.setUserId(userId);
        details.setProvider("google");
        auth.setDetails(details);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("POST /api/analytics/events -accepts valid batch")
    void testIngestValidBatch() throws Exception {
        when(contentAnalyticsService.processBatch(any())).thenReturn(3);

        Map<String, Object> batch = Map.of(
            "sessionId", "uuid-123",
            "platform", "ios",
            "appVersion", "1.1.0",
            "locale", "en",
            "events", List.of(
                Map.of("event", "story_opened", "properties", Map.of("storyId", "abc")),
                Map.of("event", "story_completed", "properties", Map.of("storyId", "abc")),
                Map.of("event", "session_ended", "properties", Map.of("durationBucket", "5-10min"))
            )
        );

        mockMvc.perform(post("/api/analytics/events")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(batch)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("accepted"))
            .andExpect(jsonPath("$.processed").value(3))
            .andExpect(jsonPath("$.total").value(3));

        verify(contentAnalyticsService, times(1)).processBatch(any());
    }

    @Test
    @DisplayName("POST /api/analytics/events -rejects empty events list")
    void testRejectEmptyEvents() throws Exception {
        Map<String, Object> batch = Map.of(
            "sessionId", "uuid-123",
            "platform", "ios",
            "events", List.of()
        );

        mockMvc.perform(post("/api/analytics/events")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(batch)))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/analytics/events -rejects missing sessionId")
    void testRejectMissingSessionId() throws Exception {
        Map<String, Object> batch = Map.of(
            "platform", "ios",
            "events", List.of(Map.of("event", "session_started"))
        );

        mockMvc.perform(post("/api/analytics/events")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(batch)))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/analytics/events -rejects missing platform")
    void testRejectMissingPlatform() throws Exception {
        Map<String, Object> batch = Map.of(
            "sessionId", "uuid-123",
            "events", List.of(Map.of("event", "session_started"))
        );

        mockMvc.perform(post("/api/analytics/events")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(batch)))
            .andExpect(status().isBadRequest());
    }
}
