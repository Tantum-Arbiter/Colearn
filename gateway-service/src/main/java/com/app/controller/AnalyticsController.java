package com.app.controller;

import com.app.dto.AnalyticsEventBatchDTO;
import com.app.service.ContentAnalyticsService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Endpoint for receiving anonymous analytics event batches from the app.
 *
 * POST /api/analytics/events
 *
 * PRIVACY / COMPLIANCE (COPPA, GDPR, UK AADC):
 * - Requires authentication via JWT (the /api/** path is authenticated in SecurityConfig).
 *   The JWT is validated solely to confirm the request is from a legitimate app instance.
 *   The userId from the JWT is transiently present in SecurityContext during request
 *   processing (standard Spring Security behaviour) but is NEVER extracted, logged,
 *   stored, or associated with the analytics data by this controller or ContentAnalyticsService.
 * - The app does NOT send X-Device-ID or any persistent identifier with analytics requests.
 * - All event data is converted to anonymous Prometheus counter increments and discarded.
 * - No IP addresses, user agents, or other request metadata are recorded by this endpoint.
 * - Legal basis for transient JWT processing: GDPR Art. 6(1)(f) legitimate interest (security).
 *
 * Rate limiting is handled by the existing RateLimitingFilter on /api/** paths.
 */
@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private static final Logger logger = LoggerFactory.getLogger(AnalyticsController.class);

    private final ContentAnalyticsService contentAnalyticsService;

    public AnalyticsController(ContentAnalyticsService contentAnalyticsService) {
        this.contentAnalyticsService = contentAnalyticsService;
    }

    @PostMapping("/events")
    public ResponseEntity<Map<String, Object>> ingestEvents(
            @Valid @RequestBody AnalyticsEventBatchDTO batch) {

        int processed = contentAnalyticsService.processBatch(batch);

        return ResponseEntity.ok(Map.of(
            "status", "accepted",
            "processed", processed,
            "total", batch.getEvents() != null ? batch.getEvents().size() : 0
        ));
    }
}
