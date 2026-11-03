package com.app.controller;

import com.app.security.AuthenticatedUser;
import com.app.service.ApplicationMetricsService;
import com.app.service.EntitlementService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/entitlements")
public class EntitlementController {

    private final EntitlementService entitlementService;
    private final ApplicationMetricsService metricsService;

    public EntitlementController(EntitlementService entitlementService, ApplicationMetricsService metricsService) {
        this.entitlementService = entitlementService;
        this.metricsService = metricsService;
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refresh() {
        EntitlementService.Resolution resolution = entitlementService.refresh(AuthenticatedUser.id());
        metricsService.recordEntitlementRefresh(resolution.source());
        return ResponseEntity.ok(Map.of(
                "tier", resolution.tier().name().toLowerCase(Locale.ROOT),
                "source", resolution.source()));
    }
}
