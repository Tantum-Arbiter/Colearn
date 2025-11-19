package com.app.controller;

import org.springframework.boot.actuate.health.HealthComponent;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.actuate.info.InfoEndpoint;
import org.springframework.boot.actuate.metrics.MetricsEndpoint;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.ObjectProvider;
import io.micrometer.prometheusmetrics.PrometheusMeterRegistry;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/private")
public class PrivateEndpointsController {

    private final InfoEndpoint infoEndpoint;
    private final ObjectProvider<PrometheusMeterRegistry> prometheusRegistryProvider;

    private final HealthEndpoint healthEndpoint;
    private final MetricsEndpoint metricsEndpoint;

    public PrivateEndpointsController(InfoEndpoint infoEndpoint,
                                      HealthEndpoint healthEndpoint,
                                      MetricsEndpoint metricsEndpoint,
                                      ObjectProvider<PrometheusMeterRegistry> prometheusRegistryProvider) {
        this.infoEndpoint = infoEndpoint;
        this.healthEndpoint = healthEndpoint;
        this.metricsEndpoint = metricsEndpoint;
        this.prometheusRegistryProvider = prometheusRegistryProvider;
    }

    @GetMapping(value = "/info")
    public ResponseEntity<Map<String, Object>> info() {
        Map<String, Object> info = infoEndpoint.info();
        return ResponseEntity.ok(info);
    }

    @GetMapping(value = "/healthcheck")
    public ResponseEntity<Map<String, Object>> healthcheck() {
        HealthComponent health = healthEndpoint.health();
        Map<String, Object> resp = new HashMap<>();
        resp.put("status", health.getStatus().getCode());
        return ResponseEntity.ok(resp);
    }

    @GetMapping(value = "/prometheus", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> prometheus() {
        PrometheusMeterRegistry registry = prometheusRegistryProvider.getIfAvailable();
        if (registry == null) {
            return ResponseEntity.status(503).contentType(MediaType.TEXT_PLAIN).body("prometheus registry not available");
        }
        String scrape = registry.scrape();
        return ResponseEntity.ok(scrape);
    }

    @GetMapping(value = "/metrics", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> metrics() {
        // Use the endpoint to list metric names and render as plain text for test expectations
        Set<String> set = metricsEndpoint.listNames().getNames();
        String body = String.join("\n", set);
        return ResponseEntity.ok(body);
    }
}

