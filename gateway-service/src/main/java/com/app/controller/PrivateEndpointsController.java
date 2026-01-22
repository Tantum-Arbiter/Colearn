package com.app.controller;

import com.app.health.FirestoreHealthIndicator;
import com.app.health.GcsHealthIndicator;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;
import org.springframework.boot.actuate.info.InfoEndpoint;
import org.springframework.boot.actuate.metrics.MetricsEndpoint;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.ObjectProvider;
import io.micrometer.prometheusmetrics.PrometheusMeterRegistry;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/private")
public class PrivateEndpointsController {

    private final InfoEndpoint infoEndpoint;
    private final ObjectProvider<PrometheusMeterRegistry> prometheusRegistryProvider;

    private final MetricsEndpoint metricsEndpoint;
    private final FirestoreHealthIndicator firestoreHealthIndicator;
    private final GcsHealthIndicator gcsHealthIndicator;

    public PrivateEndpointsController(InfoEndpoint infoEndpoint,
                                      MetricsEndpoint metricsEndpoint,
                                      ObjectProvider<PrometheusMeterRegistry> prometheusRegistryProvider,
                                      FirestoreHealthIndicator firestoreHealthIndicator,
                                      GcsHealthIndicator gcsHealthIndicator) {
        this.infoEndpoint = infoEndpoint;
        this.metricsEndpoint = metricsEndpoint;
        this.prometheusRegistryProvider = prometheusRegistryProvider;
        this.firestoreHealthIndicator = firestoreHealthIndicator;
        this.gcsHealthIndicator = gcsHealthIndicator;
    }

    @GetMapping(value = "/info")
    public ResponseEntity<Map<String, Object>> info() {
        Map<String, Object> info = infoEndpoint.info();
        return ResponseEntity.ok(info);
    }

    @GetMapping(value = "/healthcheck")
    public ResponseEntity<Map<String, Object>> healthcheck() {
        Map<String, Object> resp = new LinkedHashMap<>();

        // Check downstream services
        Health firestoreHealth = firestoreHealthIndicator.health();
        Health gcsHealth = gcsHealthIndicator.health();

        // Build downstream status map
        Map<String, Object> downstreams = new LinkedHashMap<>();
        downstreams.put("firestore", buildHealthDetails(firestoreHealth));
        downstreams.put("gcs", buildHealthDetails(gcsHealth));

        // Determine overall status - DOWN if any downstream is DOWN
        boolean allUp = firestoreHealth.getStatus().equals(Status.UP)
                && gcsHealth.getStatus().equals(Status.UP);

        String overallStatus = allUp ? "UP" : "DOWN";

        resp.put("status", overallStatus);
        resp.put("downstreams", downstreams);

        // Return 503 if any downstream is down
        if (!allUp) {
            return ResponseEntity.status(503).body(resp);
        }
        return ResponseEntity.ok(resp);
    }

    private Map<String, Object> buildHealthDetails(Health health) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("status", health.getStatus().getCode());
        details.putAll(health.getDetails());
        return details;
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

