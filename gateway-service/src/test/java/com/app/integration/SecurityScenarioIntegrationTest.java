 package com.app.integration;

import com.app.config.JwtConfig;
import com.app.service.SecurityMonitoringService;
import com.app.security.RateLimitingFilter;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import com.app.service.GatewayServiceApplication;

import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = GatewayServiceApplication.class)
@ActiveProfiles("test")
@AutoConfigureMockMvc
class SecurityScenarioIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtConfig jwtConfig;

    @Autowired
    private RateLimitingFilter rateLimitingFilter;

    @MockBean
    private SecurityMonitoringService securityMonitoringService;

    private String validAccessToken;

    @BeforeEach
    void setUp() {
        // Reset rate limiting state between tests to avoid cross-test interference
        if (rateLimitingFilter != null) {
            rateLimitingFilter.resetForTests();
        }
        validAccessToken = "valid-test-access-token";
    }



    @Test
    void xssAttackScenario_ShouldBeBlocked() throws Exception {
        String[] xssPayloads = {
            "<script>alert('xss')</script>",
            "<img src=x onerror=alert('xss')>",
            "javascript:alert('xss')",
            "<iframe src='javascript:alert(\"xss\")'></iframe>",
            "<svg onload=alert('xss')>",
            "<body onload=alert('xss')>"
        };

        for (String payload : xssPayloads) {
            // Test in URL parameter
            mockMvc.perform(get("/api/auth/me?comment=" + payload)
                    .header("Authorization", "Bearer " + validAccessToken)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                    .andExpect(status().isBadRequest());

            // Test in request body
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("content", payload);

            mockMvc.perform(get("/api/auth/me")
                    .header("Authorization", "Bearer " + validAccessToken)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(requestBody)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void pathTraversalAttackScenario_ShouldBeBlocked() throws Exception {
        String[] pathTraversalPayloads = {
            "../../../etc/passwd",
            "..\\..\\..\\windows\\system32\\config\\sam",
            "....//....//....//etc/passwd",
            "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
            "..%252f..%252f..%252fetc%252fpasswd"
        };

        for (String payload : pathTraversalPayloads) {
            // Test in URL path
            mockMvc.perform(get("/api/v1/" + payload)
                    .header("Authorization", "Bearer " + validAccessToken)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                    .andExpect(status().isBadRequest());

            // Test in URL parameter
            mockMvc.perform(get("/api/auth/me?file=" + payload)
                    .header("Authorization", "Bearer " + validAccessToken)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void commandInjectionAttackScenario_ShouldBeBlocked() throws Exception {
        String[] commandInjectionPayloads = {
            "; ls -la",
            "| cat /etc/passwd",
            "&& rm -rf /",
            "`whoami`",
            "$(id)",
            "; ping -c 1 google.com"
        };

        for (String payload : commandInjectionPayloads) {
            // Test in URL parameter
            mockMvc.perform(get("/api/auth/me?cmd=" + payload)
                    .header("Authorization", "Bearer " + validAccessToken)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123"))
                    .andExpect(status().isBadRequest());

            // Test in request body
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("command", payload);

            mockMvc.perform(get("/api/auth/me")
                    .header("Authorization", "Bearer " + validAccessToken)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.0.0")
                .header("X-Device-ID", "test-device-123")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(requestBody)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void bruteForceAttackScenario_ShouldBeTriggerRateLimiting() throws Exception {
        // Set lower rate limits for this test
        rateLimitingFilter.setRateLimitOverridesForTests(10, 100);

        String attackerIp = "192.168.100.100";

        // Simulate brute force attack on auth endpoint (10 requests to hit the limit)
        for (int i = 0; i < 10; i++) {
            Map<String, String> authRequest = new HashMap<>();
            authRequest.put("idToken", "fake.token." + i);
            authRequest.put("clientId", "fake-client-id");

            mockMvc.perform(post("/auth/google")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(authRequest))
                    .with(request -> {
                        request.setRemoteAddr(attackerIp);
                        return request;
                    }));
        }

        // Next request should be rate limited
        Map<String, String> authRequest = new HashMap<>();
        authRequest.put("idToken", "fake.token.final");
        authRequest.put("clientId", "fake-client-id");

        mockMvc.perform(post("/auth/google")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(authRequest))
                .with(request -> {
                    request.setRemoteAddr(attackerIp);
                    return request;
                }))
                .andExpect(status().isTooManyRequests());
    }






}
