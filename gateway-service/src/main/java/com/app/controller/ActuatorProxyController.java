package com.app.controller;

import io.micrometer.prometheusmetrics.PrometheusMeterRegistry;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.actuate.health.HealthComponent;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.actuate.info.InfoEndpoint;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Lightweight proxy for key actuator endpoints so that MockMvc tests can hit
 * /actuator/* paths even when the real Actuator servlet endpoints are not
 * registered in the mock web environment.
 */
@RestController
@RequestMapping("/actuator")
public class ActuatorProxyController {

    private final InfoEndpoint infoEndpoint;
    private final HealthEndpoint healthEndpoint;
    private final ObjectProvider<PrometheusMeterRegistry> prometheusRegistryProvider;

    public ActuatorProxyController(InfoEndpoint infoEndpoint,
                                   HealthEndpoint healthEndpoint,
                                   ObjectProvider<PrometheusMeterRegistry> prometheusRegistryProvider) {
        this.infoEndpoint = infoEndpoint;
        this.healthEndpoint = healthEndpoint;
        this.prometheusRegistryProvider = prometheusRegistryProvider;
    }

    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> info() {
        Map<String, Object> info = infoEndpoint.info();
        return ResponseEntity.ok(info);
    }

    @GetMapping("/health")
    public ResponseEntity<HealthComponent> health() {
        HealthComponent health = healthEndpoint.health();
        return ResponseEntity.ok(health);
    }

    @GetMapping(value = "/prometheus", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> prometheus() {
        PrometheusMeterRegistry registry = prometheusRegistryProvider.getIfAvailable();
        if (registry == null) {
            // When Prometheus is not enabled/available in the context
            return ResponseEntity.status(503).contentType(MediaType.TEXT_PLAIN).body("prometheus registry not available");
        }
        // Use Micrometer registry directly to generate Prometheus exposition format
        String scrape = registry.scrape();
        return ResponseEntity.ok(scrape);
    }
}

