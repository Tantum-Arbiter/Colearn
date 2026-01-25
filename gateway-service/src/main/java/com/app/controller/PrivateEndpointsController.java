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
    private final ObjectProvider<FirestoreHealthIndicator> firestoreHealthIndicatorProvider;
    private final ObjectProvider<GcsHealthIndicator> gcsHealthIndicatorProvider;

    public PrivateEndpointsController(InfoEndpoint infoEndpoint,
                                      MetricsEndpoint metricsEndpoint,
                                      ObjectProvider<PrometheusMeterRegistry> prometheusRegistryProvider,
                                      ObjectProvider<FirestoreHealthIndicator> firestoreHealthIndicatorProvider,
                                      ObjectProvider<GcsHealthIndicator> gcsHealthIndicatorProvider) {
        this.infoEndpoint = infoEndpoint;
        this.metricsEndpoint = metricsEndpoint;
        this.prometheusRegistryProvider = prometheusRegistryProvider;
        this.firestoreHealthIndicatorProvider = firestoreHealthIndicatorProvider;
        this.gcsHealthIndicatorProvider = gcsHealthIndicatorProvider;
    }

    @GetMapping(value = "/info")
    public ResponseEntity<Map<String, Object>> info() {
        Map<String, Object> info = infoEndpoint.info();
        return ResponseEntity.ok(info);
    }

    @GetMapping(value = "/healthcheck")
    public ResponseEntity<Map<String, Object>> healthcheck() {
        Map<String, Object> resp = new LinkedHashMap<>();

        FirestoreHealthIndicator firestoreIndicator = firestoreHealthIndicatorProvider.getIfAvailable();
        GcsHealthIndicator gcsIndicator = gcsHealthIndicatorProvider.getIfAvailable();

        Health firestoreHealth = firestoreIndicator != null
                ? firestoreIndicator.health()
                : Health.unknown().withDetail("reason", "Firestore health indicator not available").build();
        Health gcsHealth = gcsIndicator != null
                ? gcsIndicator.health()
                : Health.unknown().withDetail("reason", "GCS health indicator not available").build();

        Map<String, Object> downstreams = new LinkedHashMap<>();
        downstreams.put("firestore", buildHealthDetails(firestoreHealth));
        downstreams.put("gcs", buildHealthDetails(gcsHealth));

        boolean allUp = (firestoreHealth.getStatus().equals(Status.UP) || firestoreHealth.getStatus().equals(Status.UNKNOWN))
                && (gcsHealth.getStatus().equals(Status.UP) || gcsHealth.getStatus().equals(Status.UNKNOWN));

        String overallStatus = allUp ? "UP" : "DOWN";

        resp.put("status", overallStatus);
        resp.put("downstreams", downstreams);

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
        Set<String> set = metricsEndpoint.listNames().getNames();
        String body = String.join("\n", set);
        return ResponseEntity.ok(body);
    }
}

