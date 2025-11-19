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
        validAccessToken = jwtConfig.generateAccessToken("test-user-123", "test@example.com", "google");
    }

    @Test
    void sqlInjectionAttackScenario_ShouldBeBlocked() throws Exception {
        String[] sqlInjectionPayloads = {
            "1' OR '1'='1",
            "1; DROP TABLE users--",
            "1' UNION SELECT * FROM users--",
            "admin'--",
            "' OR 1=1#",
            "1' AND (SELECT COUNT(*) FROM users) > 0--"
        };

        for (String payload : sqlInjectionPayloads) {
            // Test in URL parameter
            mockMvc.perform(get("/api/v1/stories/batch?id=" + payload)
                    .header("Authorization", "Bearer " + validAccessToken))
                    .andExpect(status().isBadRequest());

            // Test in request body
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("query", payload);

            mockMvc.perform(post("/api/v1/user/preferences")
                    .header("Authorization", "Bearer " + validAccessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(requestBody)))
                    .andExpect(status().isBadRequest());
        }
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
            mockMvc.perform(get("/api/v1/stories/batch?comment=" + payload)
                    .header("Authorization", "Bearer " + validAccessToken))
                    .andExpect(status().isBadRequest());

            // Test in request body
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("content", payload);

            mockMvc.perform(post("/api/v1/user/preferences")
                    .header("Authorization", "Bearer " + validAccessToken)
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
                    .header("Authorization", "Bearer " + validAccessToken))
                    .andExpect(status().isBadRequest());

            // Test in URL parameter
            mockMvc.perform(get("/api/v1/stories/batch?file=" + payload)
                    .header("Authorization", "Bearer " + validAccessToken))
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
            mockMvc.perform(get("/api/v1/stories/batch?cmd=" + payload)
                    .header("Authorization", "Bearer " + validAccessToken))
                    .andExpect(status().isBadRequest());

            // Test in request body
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("command", payload);

            mockMvc.perform(post("/api/v1/user/preferences")
                    .header("Authorization", "Bearer " + validAccessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(requestBody)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void bruteForceAttackScenario_ShouldBeTriggerRateLimiting() throws Exception {
        String attackerIp = "192.168.100.100";

        // Simulate brute force attack on auth endpoint
        for (int i = 0; i < 15; i++) {
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

    @Test
    void suspiciousUserAgentScenario_ShouldBeBlocked() throws Exception {
        String[] suspiciousUserAgents = {
            "sqlmap/1.0",
            "Nikto/2.1.6",
            "Nessus",
            "OpenVAS",
            "w3af.org",
            "ZAP",
            "Burp Suite"
        };

        for (String userAgent : suspiciousUserAgents) {
            mockMvc.perform(get("/api/v1/stories/batch")
                    .header("Authorization", "Bearer " + validAccessToken)
                    .header("User-Agent", userAgent))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void oversizedRequestScenario_ShouldBeBlocked() throws Exception {
        // Create a large request body (over 10MB limit)
        StringBuilder largeContent = new StringBuilder();
        for (int i = 0; i < 1024 * 1024; i++) { // 1MB of 'A' characters
            largeContent.append("A");
        }

        Map<String, String> largeRequest = new HashMap<>();
        largeRequest.put("data", largeContent.toString());

        mockMvc.perform(post("/api/v1/user/preferences")
                .header("Authorization", "Bearer " + validAccessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(largeRequest)))
                .andExpect(status().isRequestEntityTooLarge());
    }

    @Test
    void tokenManipulationScenario_ShouldBeRejected() throws Exception {
        String[] manipulatedTokens = {
            "Bearer invalid.token.format",
            "Bearer " + validAccessToken + "extra",
            "Bearer " + validAccessToken.substring(0, validAccessToken.length() - 5) + "XXXXX",
            "Basic " + validAccessToken, // Wrong auth type
            validAccessToken, // Missing Bearer prefix
            "Bearer ", // Empty token
            "Bearer null",
            "Bearer undefined"
        };

        for (String token : manipulatedTokens) {
            mockMvc.perform(get("/api/v1/stories/batch")
                    .header("Authorization", token))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void headerInjectionScenario_ShouldBeBlocked() throws Exception {
        String[] maliciousHeaders = {
            "test\r\nX-Injected: malicious",
            "test\nX-Injected: malicious",
            "test%0d%0aX-Injected: malicious",
            "test%0aX-Injected: malicious"
        };

        for (String maliciousValue : maliciousHeaders) {
            mockMvc.perform(get("/api/v1/stories/batch")
                    .header("Authorization", "Bearer " + validAccessToken)
                    .header("X-Custom-Header", maliciousValue))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void ldapInjectionScenario_ShouldBeBlocked() throws Exception {
        String[] ldapInjectionPayloads = {
            "*)(uid=*",
            "*)(|(uid=*))",
            "admin)(&(password=*))",
            "*)(objectClass=*",
            "*)(&(objectClass=user)(uid=admin))"
        };

        for (String payload : ldapInjectionPayloads) {
            mockMvc.perform(get("/api/v1/stories/batch?filter=" + payload)
                    .header("Authorization", "Bearer " + validAccessToken))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void multipleAttackVectorsScenario_ShouldBeBlocked() throws Exception {
        // Combine multiple attack vectors in a single request
        String combinedPayload = "1' OR '1'='1 AND <script>alert('xss')</script> AND ../../etc/passwd";

        mockMvc.perform(get("/api/v1/stories/batch?malicious=" + combinedPayload)
                .header("Authorization", "Bearer " + validAccessToken)
                .header("User-Agent", "sqlmap/1.0"))
                .andExpect(status().isBadRequest());

        // Test in request body with multiple malicious fields
        Map<String, String> maliciousRequest = new HashMap<>();
        maliciousRequest.put("sql", "1' OR '1'='1");
        maliciousRequest.put("xss", "<script>alert('xss')</script>");
        maliciousRequest.put("path", "../../etc/passwd");
        maliciousRequest.put("cmd", "; rm -rf /");

        mockMvc.perform(post("/api/v1/user/preferences")
                .header("Authorization", "Bearer " + validAccessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(maliciousRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void legitimateRequestsScenario_ShouldNotBeBlocked() throws Exception {
        // Test that legitimate requests are not blocked by security filters
        String[] legitimateQueries = {
            "bedtime stories",
            "age 3-5",
            "category=adventure",
            "search=princess and dragon",
            "title=The Little Mermaid"
        };

        for (String query : legitimateQueries) {
            mockMvc.perform(get("/api/v1/stories/batch?q=" + query)
                    .header("Authorization", "Bearer " + validAccessToken)
                    .header("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"))
                    .andExpect(status().isOk());
        }

        // Test legitimate request bodies
        Map<String, Object> legitimatePreferences = new HashMap<>();
        legitimatePreferences.put("theme", "light");
        legitimatePreferences.put("notifications", true);
        legitimatePreferences.put("language", "en-US");
        legitimatePreferences.put("ageRange", "3-5");
        legitimatePreferences.put("favoriteCategories", java.util.Arrays.asList("bedtime", "adventure"));

        mockMvc.perform(post("/api/v1/user/preferences")
                .header("Authorization", "Bearer " + validAccessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(legitimatePreferences)))
                .andExpect(status().isOk());
    }

    @Test
    void edgeCaseScenario_ShouldHandleGracefully() throws Exception {
        // Test empty parameters
        mockMvc.perform(get("/api/v1/stories/batch?q=")
                .header("Authorization", "Bearer " + validAccessToken))
                .andExpect(status().isOk());

        // Test null-like values
        mockMvc.perform(get("/api/v1/stories/batch?category=null")
                .header("Authorization", "Bearer " + validAccessToken))
                .andExpect(status().isOk());

        // Test special characters that are legitimate
        mockMvc.perform(get("/api/v1/stories/batch?title=Jack & Jill")
                .header("Authorization", "Bearer " + validAccessToken))
                .andExpect(status().isOk());

        // Test Unicode characters
        mockMvc.perform(get("/api/v1/stories/batch?title=Princesa y el Dragón")
                .header("Authorization", "Bearer " + validAccessToken))
                .andExpect(status().isOk());
    }
}
