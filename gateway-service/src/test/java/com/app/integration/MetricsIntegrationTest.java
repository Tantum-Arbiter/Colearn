package com.app.integration;

import com.app.service.GatewayServiceApplication;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = GatewayServiceApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MetricsIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void testMetricsAreCollectedForApiRequests() throws Exception {
        // Given - make some API requests to generate metrics
        mockMvc.perform(get("/api/content")
                .header("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)")
                .header("X-Platform", "ios")
                .header("X-App-Version", "1.2.3"))
                .andExpect(status().isUnauthorized()); // Expected since no auth token

        mockMvc.perform(get("/api/stories")
                .header("User-Agent", "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)")
                .header("X-Platform", "ios")
                .header("X-App-Version", "1.2.3"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/user/profile")
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                .header("X-Platform", "windows")
                .header("X-App-Version", "2.0.0"))
                .andExpect(status().isUnauthorized());

        // When - check custom metrics
        MvcResult result = mockMvc.perform(get("/actuator/custom/metrics"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        // Then - verify metrics were collected
        String responseBody = result.getResponse().getContentAsString();
        @SuppressWarnings("unchecked")
        Map<String, Object> metrics = objectMapper.readValue(responseBody, Map.class);

        assertNotNull(metrics);
        assertNotNull(metrics.get("application"));
        assertNotNull(metrics.get("security"));
        assertNotNull(metrics.get("system"));
        assertNotNull(metrics.get("timestamp"));

        @SuppressWarnings("unchecked")
        Map<String, Object> appMetrics = (Map<String, Object>) metrics.get("application");
        assertNotNull(appMetrics.get("device_types"));
        assertNotNull(appMetrics.get("platforms"));
        assertNotNull(appMetrics.get("app_versions"));
    }

    @Test
    void testDeviceMetricsEndpoint() throws Exception {
        // Given - make requests from different devices
        mockMvc.perform(get("/api/test")
                .header("User-Agent", "Mozilla/5.0 (iPhone)")
                .header("X-Platform", "ios")
                .header("X-App-Version", "1.0.0"));

        mockMvc.perform(get("/api/test")
                .header("User-Agent", "Mozilla/5.0 (Android)")
                .header("X-Platform", "android")
                .header("X-App-Version", "1.0.0"));

        // When
        MvcResult result = mockMvc.perform(get("/actuator/custom/devices"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        // Then
        String responseBody = result.getResponse().getContentAsString();
        @SuppressWarnings("unchecked")
        Map<String, Object> deviceMetrics = objectMapper.readValue(responseBody, Map.class);

        assertNotNull(deviceMetrics);
        assertNotNull(deviceMetrics.get("device_types"));
        assertNotNull(deviceMetrics.get("platforms"));
        assertNotNull(deviceMetrics.get("app_versions"));
        assertNotNull(deviceMetrics.get("timestamp"));
    }

    @Test
    void testRequestMetricsEndpoint() throws Exception {
        // Given - make some requests
        mockMvc.perform(get("/api/content"));
        mockMvc.perform(post("/api/data").contentType(MediaType.APPLICATION_JSON).content("{}"));

        // When
        MvcResult result = mockMvc.perform(get("/actuator/custom/requests"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        // Then
        String responseBody = result.getResponse().getContentAsString();
        @SuppressWarnings("unchecked")
        Map<String, Object> requestMetrics = objectMapper.readValue(responseBody, Map.class);

        assertNotNull(requestMetrics);
        assertNotNull(requestMetrics.get("requests"));
        assertNotNull(requestMetrics.get("timestamp"));
    }

    @Test
    void testAuthenticationMetricsEndpoint() throws Exception {
        // When
        MvcResult result = mockMvc.perform(get("/actuator/custom/authentication"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        // Then
        String responseBody = result.getResponse().getContentAsString();
        @SuppressWarnings("unchecked")
        Map<String, Object> authMetrics = objectMapper.readValue(responseBody, Map.class);

        assertNotNull(authMetrics);
        assertNotNull(authMetrics.get("authentication"));
        assertNotNull(authMetrics.get("security"));
        assertNotNull(authMetrics.get("timestamp"));
    }

    @Test
    void testErrorMetricsEndpoint() throws Exception {
        // When
        MvcResult result = mockMvc.perform(get("/actuator/custom/errors"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        // Then
        String responseBody = result.getResponse().getContentAsString();
        @SuppressWarnings("unchecked")
        Map<String, Object> errorMetrics = objectMapper.readValue(responseBody, Map.class);

        assertNotNull(errorMetrics);
        assertNotNull(errorMetrics.get("errors"));
        assertNotNull(errorMetrics.get("timestamp"));
    }

    @Test
    void testPerformanceMetricsEndpoint() throws Exception {
        // Given - make some requests to generate performance data
        mockMvc.perform(get("/api/content"));

        // When
        MvcResult result = mockMvc.perform(get("/actuator/custom/performance"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        // Then
        String responseBody = result.getResponse().getContentAsString();
        @SuppressWarnings("unchecked")
        Map<String, Object> perfMetrics = objectMapper.readValue(responseBody, Map.class);

        assertNotNull(perfMetrics);
        assertNotNull(perfMetrics.get("response_times"));
        assertNotNull(perfMetrics.get("active_sessions"));
        assertNotNull(perfMetrics.get("active_connections"));
        assertNotNull(perfMetrics.get("timestamp"));
    }

    @Test
    void testMetricsHealthEndpoint() throws Exception {
        // When
        MvcResult result = mockMvc.perform(get("/actuator/custom/health"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andReturn();

        // Then
        String responseBody = result.getResponse().getContentAsString();
        @SuppressWarnings("unchecked")
        Map<String, Object> health = objectMapper.readValue(responseBody, Map.class);

        assertNotNull(health);
        assertEquals("UP", health.get("status"));
        assertNotNull(health.get("meter_count"));
        assertNotNull(health.get("active_sessions"));
        assertNotNull(health.get("active_connections"));
        assertNotNull(health.get("timestamp"));
    }

    @Test
    void testPrometheusMetricsEndpoint() throws Exception {
        // Given - make some requests to generate metrics
        mockMvc.perform(get("/api/content")
                .header("User-Agent", "Mozilla/5.0 (iPhone)")
                .header("X-Platform", "ios"));

        // When
        MvcResult result = mockMvc.perform(get("/actuator/prometheus"))
                .andExpect(status().isOk())
                .andReturn();

        // Then
        String responseBody = result.getResponse().getContentAsString();
        assertNotNull(responseBody);
        assertTrue(responseBody.contains("app_requests_total"));
        assertTrue(responseBody.contains("app_response_time"));
        assertTrue(responseBody.contains("device_type"));
        assertTrue(responseBody.contains("platform"));
    }

    @Test
    void testMetricsFilterSkipsActuatorEndpoints() throws Exception {
        // When - access actuator endpoints
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/actuator/info"))
                .andExpect(status().isOk());

        // Then - verify these don't appear in custom metrics
        MvcResult result = mockMvc.perform(get("/actuator/custom/requests"))
                .andExpect(status().isOk())
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        @SuppressWarnings("unchecked")
        Map<String, Object> requestMetrics = objectMapper.readValue(responseBody, Map.class);

        // Should not contain metrics for actuator endpoints
        @SuppressWarnings("unchecked")
        Map<String, Double> requests = (Map<String, Double>) requestMetrics.get("requests");
        
        // Check that no actuator endpoints are in the metrics
        boolean hasActuatorMetrics = requests.keySet().stream()
                .anyMatch(key -> key.contains("actuator"));
        assertFalse(hasActuatorMetrics, "Actuator endpoints should not be included in metrics");
    }

    @Test
    void testDifferentUserAgentsAreClassifiedCorrectly() throws Exception {
        // Given - requests from different user agents
        String[] userAgents = {
            "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)", // mobile
            "Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)",          // tablet
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",              // desktop
            "Googlebot/2.1 (+http://www.google.com/bot.html)"         // bot
        };

        for (String userAgent : userAgents) {
            mockMvc.perform(get("/api/test")
                    .header("User-Agent", userAgent)
                    .header("X-App-Version", "1.0.0"));
        }

        // When
        MvcResult result = mockMvc.perform(get("/actuator/custom/devices"))
                .andExpect(status().isOk())
                .andReturn();

        // Then
        String responseBody = result.getResponse().getContentAsString();
        @SuppressWarnings("unchecked")
        Map<String, Object> deviceMetrics = objectMapper.readValue(responseBody, Map.class);

        @SuppressWarnings("unchecked")
        Map<String, Integer> deviceTypes = (Map<String, Integer>) deviceMetrics.get("device_types");
        
        // Should have classified different device types
        assertTrue(deviceTypes.size() > 1, "Should have multiple device types");
    }

    @Test
    void testResponseTimeMetricsAreRecorded() throws Exception {
        // Given - make a request
        mockMvc.perform(get("/api/content")
                .header("User-Agent", "Mozilla/5.0 (iPhone)")
                .header("X-Platform", "ios"));

        // When
        MvcResult result = mockMvc.perform(get("/actuator/custom/performance"))
                .andExpect(status().isOk())
                .andReturn();

        // Then
        String responseBody = result.getResponse().getContentAsString();
        @SuppressWarnings("unchecked")
        Map<String, Object> perfMetrics = objectMapper.readValue(responseBody, Map.class);

        @SuppressWarnings("unchecked")
        Map<String, Object> responseTimes = (Map<String, Object>) perfMetrics.get("response_times");
        assertNotNull(responseTimes);
        
        // Should have at least one response time entry
        assertFalse(responseTimes.isEmpty(), "Should have response time metrics");
    }
}
