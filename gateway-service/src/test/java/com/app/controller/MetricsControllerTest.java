package com.app.controller;

import com.app.service.ApplicationMetricsService;
import com.app.service.SecurityMonitoringService;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MetricsControllerTest {

    @Mock
    private ApplicationMetricsService mockApplicationMetricsService;

    @Mock
    private SecurityMonitoringService mockSecurityMonitoringService;

    private MeterRegistry meterRegistry;
    private MetricsController metricsController;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        metricsController = new MetricsController(mockApplicationMetricsService,
                                                mockSecurityMonitoringService,
                                                meterRegistry);
    }

    @Test
    void testGetApplicationMetrics() {
        // Given
        Map<String, Object> appMetrics = new HashMap<>();
        appMetrics.put("active_sessions", 5L);
        appMetrics.put("active_connections", 10L);
        
        Map<String, Object> securityMetrics = new HashMap<>();
        securityMetrics.put("successfulLogins", 100L);
        securityMetrics.put("failedLogins", 5L);

        when(mockApplicationMetricsService.getMetricsSummary()).thenReturn(appMetrics);
        when(mockSecurityMonitoringService.getSecurityMetrics()).thenReturn(securityMetrics);

        // When
        ResponseEntity<Map<String, Object>> response = metricsController.getApplicationMetrics();

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        
        Map<String, Object> body = response.getBody();
        assertEquals(appMetrics, body.get("application"));
        assertEquals(securityMetrics, body.get("security"));
        assertNotNull(body.get("system"));
        assertNotNull(body.get("timestamp"));
    }

    @Test
    void testGetDeviceMetrics() {
        // Given
        Map<String, Object> summary = new HashMap<>();
        Map<String, Long> deviceTypes = new HashMap<>();
        deviceTypes.put("mobile", 50L);
        deviceTypes.put("tablet", 20L);
        deviceTypes.put("desktop", 30L);
        
        Map<String, Long> platforms = new HashMap<>();
        platforms.put("ios", 40L);
        platforms.put("android", 35L);
        platforms.put("windows", 25L);
        
        Map<String, Long> appVersions = new HashMap<>();
        appVersions.put("1.2.3", 60L);
        appVersions.put("1.2.2", 30L);
        appVersions.put("1.2.1", 10L);
        
        summary.put("device_types", deviceTypes);
        summary.put("platforms", platforms);
        summary.put("app_versions", appVersions);

        when(mockApplicationMetricsService.getMetricsSummary()).thenReturn(summary);

        // When
        ResponseEntity<Map<String, Object>> response = metricsController.getDeviceMetrics();

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        
        Map<String, Object> body = response.getBody();
        assertEquals(deviceTypes, body.get("device_types"));
        assertEquals(platforms, body.get("platforms"));
        assertEquals(appVersions, body.get("app_versions"));
        assertNotNull(body.get("timestamp"));
    }

    @Test
    void testGetRequestMetrics() {
        // Given - add some meters to the registry
        meterRegistry.counter("app.requests.total", "device_type", "mobile").increment(10);
        meterRegistry.counter("app.requests.total", "device_type", "desktop").increment(5);

        // When
        ResponseEntity<Map<String, Object>> response = metricsController.getRequestMetrics();

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        
        Map<String, Object> body = response.getBody();
        assertNotNull(body.get("requests"));
        assertNotNull(body.get("timestamp"));
        
        @SuppressWarnings("unchecked")
        Map<String, Double> requests = (Map<String, Double>) body.get("requests");
        assertTrue(requests.size() >= 2); // Should have at least our 2 counters
    }

    @Test
    void testGetAuthenticationMetrics() {
        // Given
        Map<String, Object> securityMetrics = new HashMap<>();
        securityMetrics.put("successfulLogins", 150L);
        securityMetrics.put("failedLogins", 10L);
        securityMetrics.put("suspiciousRequests", 2L);

        when(mockSecurityMonitoringService.getSecurityMetrics()).thenReturn(securityMetrics);

        // Add some authentication meters
        meterRegistry.counter("app.authentication.total", "provider", "google").increment(100);
        meterRegistry.counter("app.authentication.total", "provider", "apple").increment(50);

        // When
        ResponseEntity<Map<String, Object>> response = metricsController.getAuthenticationMetrics();

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        
        Map<String, Object> body = response.getBody();
        assertNotNull(body.get("authentication"));
        assertEquals(securityMetrics, body.get("security"));
        assertNotNull(body.get("timestamp"));
    }

    @Test
    void testGetErrorMetrics() {
        // Given - add some error meters
        meterRegistry.counter("app.errors.total", "error_type", "ValidationException").increment(5);
        meterRegistry.counter("app.rate_limit.violations", "limit_type", "AUTH_RATE_LIMIT").increment(2);

        // When
        ResponseEntity<Map<String, Object>> response = metricsController.getErrorMetrics();

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        
        Map<String, Object> body = response.getBody();
        assertNotNull(body.get("errors"));
        assertNotNull(body.get("timestamp"));
        
        @SuppressWarnings("unchecked")
        Map<String, Double> errors = (Map<String, Double>) body.get("errors");
        assertTrue(errors.size() >= 2); // Should have at least our 2 counters
    }

    @Test
    void testGetPerformanceMetrics() {
        // Given
        Map<String, Object> summary = new HashMap<>();
        summary.put("active_sessions", 25L);
        summary.put("active_connections", 50L);

        when(mockApplicationMetricsService.getMetricsSummary()).thenReturn(summary);

        // Add some response time meters
        meterRegistry.timer("app.response.time", "endpoint", "/api/content").record(100, java.util.concurrent.TimeUnit.MILLISECONDS);
        meterRegistry.timer("app.response.time", "endpoint", "/api/auth").record(200, java.util.concurrent.TimeUnit.MILLISECONDS);

        // When
        ResponseEntity<Map<String, Object>> response = metricsController.getPerformanceMetrics();

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        
        Map<String, Object> body = response.getBody();
        assertNotNull(body.get("response_times"));
        assertEquals(25L, body.get("active_sessions"));
        assertEquals(50L, body.get("active_connections"));
        assertNotNull(body.get("timestamp"));
    }

    @Test
    void testGetMetricsHealth_Healthy() {
        // Given
        Map<String, Object> summary = new HashMap<>();
        summary.put("active_sessions", 10L);
        summary.put("active_connections", 20L);

        when(mockApplicationMetricsService.getMetricsSummary()).thenReturn(summary);

        // Add some meters to the registry
        meterRegistry.counter("test.counter").increment();

        // When
        ResponseEntity<Map<String, Object>> response = metricsController.getMetricsHealth();

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        
        Map<String, Object> body = response.getBody();
        assertEquals("UP", body.get("status"));
        assertTrue((Long) body.get("meter_count") > 0);
        assertEquals(10L, body.get("active_sessions"));
        assertEquals(20L, body.get("active_connections"));
        assertNotNull(body.get("timestamp"));
    }

    @Test
    void testGetMetricsHealth_Unhealthy() {
        // Given - mock service to throw exception
        when(mockApplicationMetricsService.getMetricsSummary()).thenThrow(new RuntimeException("Service unavailable"));

        // When
        ResponseEntity<Map<String, Object>> response = metricsController.getMetricsHealth();

        // Then
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertNotNull(response.getBody());
        
        Map<String, Object> body = response.getBody();
        assertEquals("DOWN", body.get("status"));
        assertEquals("Service unavailable", body.get("error"));
        assertNotNull(body.get("timestamp"));
    }

    @Test
    void testSystemMetrics() {
        // When
        ResponseEntity<Map<String, Object>> response = metricsController.getApplicationMetrics();

        // Then
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        
        Map<String, Object> body = response.getBody();
        @SuppressWarnings("unchecked")
        Map<String, Object> systemMetrics = (Map<String, Object>) body.get("system");
        
        assertNotNull(systemMetrics);
        assertNotNull(systemMetrics.get("jvm_memory_used"));
        assertNotNull(systemMetrics.get("jvm_memory_free"));
        assertNotNull(systemMetrics.get("jvm_memory_total"));
        assertNotNull(systemMetrics.get("jvm_memory_max"));
        assertNotNull(systemMetrics.get("jvm_processors"));
        assertNotNull(systemMetrics.get("java_version"));
        assertNotNull(systemMetrics.get("os_name"));
        assertNotNull(systemMetrics.get("os_arch"));
    }

    @Test
    void testMetricsEndpointsReturnValidTimestamps() {
        // Given
        when(mockApplicationMetricsService.getMetricsSummary()).thenReturn(new HashMap<>());
        when(mockSecurityMonitoringService.getSecurityMetrics()).thenReturn(new HashMap<>());

        // When
        long beforeTime = System.currentTimeMillis();
        
        ResponseEntity<Map<String, Object>> appResponse = metricsController.getApplicationMetrics();
        ResponseEntity<Map<String, Object>> deviceResponse = metricsController.getDeviceMetrics();
        ResponseEntity<Map<String, Object>> requestResponse = metricsController.getRequestMetrics();
        ResponseEntity<Map<String, Object>> authResponse = metricsController.getAuthenticationMetrics();
        ResponseEntity<Map<String, Object>> errorResponse = metricsController.getErrorMetrics();
        ResponseEntity<Map<String, Object>> perfResponse = metricsController.getPerformanceMetrics();
        ResponseEntity<Map<String, Object>> healthResponse = metricsController.getMetricsHealth();
        
        long afterTime = System.currentTimeMillis();

        // Then - all responses should have valid timestamps
        ResponseEntity<?>[] responses = {appResponse, deviceResponse, requestResponse, 
                                       authResponse, errorResponse, perfResponse, healthResponse};
        
        for (ResponseEntity<?> response : responses) {
            assertEquals(HttpStatus.OK, response.getStatusCode());
            @SuppressWarnings("unchecked")
            Map<String, Object> body = (Map<String, Object>) response.getBody();
            assertNotNull(body);
            
            String timestamp = (String) body.get("timestamp");
            assertNotNull(timestamp);
            
            // Parse timestamp and verify it's within reasonable range
            java.time.Instant instant = java.time.Instant.parse(timestamp);
            long timestampMillis = instant.toEpochMilli();
            assertTrue(timestampMillis >= beforeTime && timestampMillis <= afterTime);
        }
    }
}
