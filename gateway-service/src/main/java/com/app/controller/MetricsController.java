package com.app.controller;

import com.app.service.ApplicationMetricsService;
import com.app.service.SecurityMonitoringService;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Meter;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Metrics Controller
 * Exposes custom application metrics
 */
@RestController
@RequestMapping("/actuator/custom")
public class MetricsController {

    final ApplicationMetricsService applicationMetricsService;
    final SecurityMonitoringService securityMonitoringService;
    final MeterRegistry meterRegistry;

    public MetricsController(ApplicationMetricsService applicationMetricsService,
                           SecurityMonitoringService securityMonitoringService,
                           MeterRegistry meterRegistry) {
        this.applicationMetricsService = applicationMetricsService;
        this.securityMonitoringService = securityMonitoringService;
        this.meterRegistry = meterRegistry;
    }

    /**
     * Get application metrics summary
     */
    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> getApplicationMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        
        // Application metrics
        metrics.put("application", applicationMetricsService.getMetricsSummary());
        
        // Security metrics
        metrics.put("security", securityMonitoringService.getSecurityMetrics());
        
        // System metrics
        metrics.put("system", getSystemMetrics());
        
        // Timestamp
        metrics.put("timestamp", Instant.now().toString());
        
        return ResponseEntity.ok(metrics);
    }

    /**
     * Get device and platform statistics
     */
    @GetMapping("/devices")
    public ResponseEntity<Map<String, Object>> getDeviceMetrics() {
        Map<String, Object> deviceMetrics = new HashMap<>();
        
        Map<String, Object> summary = applicationMetricsService.getMetricsSummary();
        deviceMetrics.put("device_types", summary.get("device_types"));
        deviceMetrics.put("platforms", summary.get("platforms"));
        deviceMetrics.put("app_versions", summary.get("app_versions"));
        deviceMetrics.put("timestamp", Instant.now().toString());
        
        return ResponseEntity.ok(deviceMetrics);
    }

    /**
     * Get request statistics
     */
    @GetMapping("/requests")
    public ResponseEntity<Map<String, Object>> getRequestMetrics() {
        Map<String, Object> requestMetrics = new HashMap<>();
        
        // Get request-related meters
        Map<String, Double> requests = meterRegistry.getMeters().stream()
                .filter(meter -> meter.getId().getName().startsWith("app.requests"))
                .collect(Collectors.toMap(
                    meter -> meter.getId().getName() + "_" + meter.getId().getTags().toString(),
                    meter -> {
                        if (meter instanceof io.micrometer.core.instrument.Counter) {
                            return ((io.micrometer.core.instrument.Counter) meter).count();
                        } else if (meter instanceof io.micrometer.core.instrument.Timer) {
                            return ((io.micrometer.core.instrument.Timer) meter).totalTime(java.util.concurrent.TimeUnit.MILLISECONDS);
                        }
                        return 0.0;
                    }
                ));
        
        requestMetrics.put("requests", requests);
        requestMetrics.put("timestamp", Instant.now().toString());
        
        return ResponseEntity.ok(requestMetrics);
    }

    /**
     * Get authentication statistics
     */
    @GetMapping("/authentication")
    public ResponseEntity<Map<String, Object>> getAuthenticationMetrics() {
        Map<String, Object> authMetrics = new HashMap<>();
        
        // Get authentication-related meters
        Map<String, Double> authentication = meterRegistry.getMeters().stream()
                .filter(meter -> meter.getId().getName().startsWith("app.authentication"))
                .collect(Collectors.toMap(
                    meter -> meter.getId().getName() + "_" + meter.getId().getTags().toString(),
                    meter -> {
                        if (meter instanceof io.micrometer.core.instrument.Counter) {
                            return ((io.micrometer.core.instrument.Counter) meter).count();
                        } else if (meter instanceof io.micrometer.core.instrument.Timer) {
                            return ((io.micrometer.core.instrument.Timer) meter).totalTime(java.util.concurrent.TimeUnit.MILLISECONDS);
                        }
                        return 0.0;
                    }
                ));
        
        authMetrics.put("authentication", authentication);
        authMetrics.put("security", securityMonitoringService.getSecurityMetrics());
        authMetrics.put("timestamp", Instant.now().toString());
        
        return ResponseEntity.ok(authMetrics);
    }

    /**
     * Get error statistics
     */
    @GetMapping("/errors")
    public ResponseEntity<Map<String, Object>> getErrorMetrics() {
        Map<String, Object> errorMetrics = new HashMap<>();
        
        // Get error-related meters
        Map<String, Double> errors = meterRegistry.getMeters().stream()
                .filter(meter -> meter.getId().getName().startsWith("app.errors") || 
                               meter.getId().getName().startsWith("app.rate_limit"))
                .collect(Collectors.toMap(
                    meter -> meter.getId().getName() + "_" + meter.getId().getTags().toString(),
                    meter -> {
                        if (meter instanceof io.micrometer.core.instrument.Counter) {
                            return ((io.micrometer.core.instrument.Counter) meter).count();
                        }
                        return 0.0;
                    }
                ));
        
        errorMetrics.put("errors", errors);
        errorMetrics.put("timestamp", Instant.now().toString());
        
        return ResponseEntity.ok(errorMetrics);
    }

    /**
     * Get performance statistics
     */
    @GetMapping("/performance")
    public ResponseEntity<Map<String, Object>> getPerformanceMetrics() {
        Map<String, Object> performanceMetrics = new HashMap<>();
        
        // Get response time related meters
        Map<String, Object> responseTimes = meterRegistry.getMeters().stream()
                .filter(meter -> meter.getId().getName().startsWith("app.response.time"))
                .collect(Collectors.toMap(
                    meter -> meter.getId().getTags().toString(),
                    meter -> {
                        if (meter instanceof io.micrometer.core.instrument.Timer) {
                            io.micrometer.core.instrument.Timer timer = (io.micrometer.core.instrument.Timer) meter;
                            Map<String, Object> timerStats = new HashMap<>();
                            timerStats.put("count", timer.count());
                            timerStats.put("total_time_ms", timer.totalTime(java.util.concurrent.TimeUnit.MILLISECONDS));
                            timerStats.put("mean_ms", timer.mean(java.util.concurrent.TimeUnit.MILLISECONDS));
                            timerStats.put("max_ms", timer.max(java.util.concurrent.TimeUnit.MILLISECONDS));
                            return timerStats;
                        }
                        return new HashMap<>();
                    }
                ));
        
        performanceMetrics.put("response_times", responseTimes);
        performanceMetrics.put("active_sessions", applicationMetricsService.getMetricsSummary().get("active_sessions"));
        performanceMetrics.put("active_connections", applicationMetricsService.getMetricsSummary().get("active_connections"));
        performanceMetrics.put("timestamp", Instant.now().toString());
        
        return ResponseEntity.ok(performanceMetrics);
    }

    /**
     * Get system metrics
     */
    private Map<String, Object> getSystemMetrics() {
        Map<String, Object> systemMetrics = new HashMap<>();
        
        // JVM metrics
        Runtime runtime = Runtime.getRuntime();
        systemMetrics.put("jvm_memory_used", runtime.totalMemory() - runtime.freeMemory());
        systemMetrics.put("jvm_memory_free", runtime.freeMemory());
        systemMetrics.put("jvm_memory_total", runtime.totalMemory());
        systemMetrics.put("jvm_memory_max", runtime.maxMemory());
        systemMetrics.put("jvm_processors", runtime.availableProcessors());
        
        // System properties
        systemMetrics.put("java_version", System.getProperty("java.version"));
        systemMetrics.put("os_name", System.getProperty("os.name"));
        systemMetrics.put("os_arch", System.getProperty("os.arch"));
        
        return systemMetrics;
    }

    /**
     * Health check for metrics system
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getMetricsHealth() {
        Map<String, Object> health = new HashMap<>();
        
        try {
            // Check if metrics are being collected
            long meterCount = meterRegistry.getMeters().size();
            Map<String, Object> summary = applicationMetricsService.getMetricsSummary();
            
            health.put("status", "UP");
            health.put("meter_count", meterCount);
            health.put("active_sessions", summary.get("active_sessions"));
            health.put("active_connections", summary.get("active_connections"));
            health.put("timestamp", Instant.now().toString());
            
            return ResponseEntity.ok(health);
        } catch (Exception e) {
            health.put("status", "DOWN");
            health.put("error", e.getMessage());
            health.put("timestamp", Instant.now().toString());
            
            return ResponseEntity.status(503).body(health);
        }
    }
}
