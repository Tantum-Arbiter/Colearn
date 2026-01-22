package com.app.controller;

import com.app.health.FirestoreHealthIndicator;
import com.app.health.GcsHealthIndicator;
import io.micrometer.prometheusmetrics.PrometheusMeterRegistry;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;
import org.springframework.boot.actuate.info.InfoEndpoint;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
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
    private final ObjectProvider<PrometheusMeterRegistry> prometheusRegistryProvider;
    private final FirestoreHealthIndicator firestoreHealthIndicator;
    private final GcsHealthIndicator gcsHealthIndicator;

    public ActuatorProxyController(InfoEndpoint infoEndpoint,
                                   ObjectProvider<PrometheusMeterRegistry> prometheusRegistryProvider,
                                   FirestoreHealthIndicator firestoreHealthIndicator,
                                   GcsHealthIndicator gcsHealthIndicator) {
        this.infoEndpoint = infoEndpoint;
        this.prometheusRegistryProvider = prometheusRegistryProvider;
        this.firestoreHealthIndicator = firestoreHealthIndicator;
        this.gcsHealthIndicator = gcsHealthIndicator;
    }

    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> info() {
        Map<String, Object> info = infoEndpoint.info();
        return ResponseEntity.ok(info);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
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
            // When Prometheus is not enabled/available in the context
            return ResponseEntity.status(503).contentType(MediaType.TEXT_PLAIN).body("prometheus registry not available");
        }
        // Use Micrometer registry directly to generate Prometheus exposition format
        String scrape = registry.scrape();
        return ResponseEntity.ok(scrape);
    }
}

