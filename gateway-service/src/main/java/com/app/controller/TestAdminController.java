package com.app.controller;

import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.security.RateLimitingFilter;
import com.app.testing.TestSimulationFlags;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Callable;

/**
 * Test-only admin endpoints to control server state during functional tests.
 */
@RestController
@RequestMapping("/private")
@Profile("test")
public class TestAdminController {

    private static final Logger logger = LoggerFactory.getLogger(TestAdminController.class);

    private final RateLimitingFilter rateLimitingFilter;
    private final TestSimulationFlags flags;
    private final CircuitBreakerRegistry circuitBreakerRegistry;

    public TestAdminController(RateLimitingFilter rateLimitingFilter,
                               TestSimulationFlags flags,
                               CircuitBreakerRegistry circuitBreakerRegistry) {
        this.rateLimitingFilter = rateLimitingFilter;
        this.flags = flags;
        this.circuitBreakerRegistry = circuitBreakerRegistry;
    }

    /**
     * Reset server-side state that can affect cross-scenario behavior.
     */
    @PostMapping("/reset")
    public ResponseEntity<Map<String, Object>> reset() {
        try {
            rateLimitingFilter.resetForTests();
            flags.reset();
            // Reset all circuit breakers so scenarios do not bleed state
            try {
                for (CircuitBreaker cb : circuitBreakerRegistry.getAllCircuitBreakers()) {
                    cb.reset();
                }
            } catch (Exception ex) {
                logger.warn("Failed to reset circuit breakers: {}", ex.getMessage());
            }
            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "reset");
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            logger.warn("Failed to reset test state: {}", e.getMessage());
            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "partial");
            resp.put("error", e.getMessage());
            return ResponseEntity.ok(resp);
        }
    }

    /**
     * Set simulation flags for this JVM (test profile only).
     */
    @PostMapping("/flags")
    public ResponseEntity<Map<String, Object>> setFlags(@RequestBody Map<String, Object> body) {
        if (body == null) body = new HashMap<>();

        try {
            // Downstream statuses and delays
            if (body.containsKey("googleOauthStatus")) {
                flags.setGoogleOauthStatus(asInteger(body.get("googleOauthStatus")));
            }
            if (body.containsKey("googleOauthDelayMs")) {
                flags.setGoogleOauthDelayMs(asLong(body.get("googleOauthDelayMs")));
            }
            if (body.containsKey("firebaseStatus")) {
                flags.setFirebaseStatus(asInteger(body.get("firebaseStatus")));
            }
            if (body.containsKey("gatewayTimeoutMs")) {
                flags.setGatewayTimeoutMs(asLong(body.get("gatewayTimeoutMs")));
            }
            if (body.containsKey("inboundTimeoutMs")) {
                flags.setInboundTimeoutMs(asLong(body.get("inboundTimeoutMs")));
            }
            if (body.containsKey("maintenanceMode")) {
                flags.setMaintenanceMode(Boolean.TRUE.equals(body.get("maintenanceMode")) ||
                        "true".equalsIgnoreCase(String.valueOf(body.get("maintenanceMode"))));
            }
            if (body.containsKey("circuitOpenGoogle")) {
                flags.setCircuitOpenGoogle(Boolean.TRUE.equals(body.get("circuitOpenGoogle")) ||
                        "true".equalsIgnoreCase(String.valueOf(body.get("circuitOpenGoogle"))));
            }
            if (body.containsKey("overloaded")) {
                flags.setOverloaded(Boolean.TRUE.equals(body.get("overloaded")) ||
                        "true".equalsIgnoreCase(String.valueOf(body.get("overloaded"))));
            }

            if (body.containsKey("authRateLimitPerMinute") || body.containsKey("apiRateLimitPerMinute")) {
                Integer authLimit = asInteger(body.get("authRateLimitPerMinute"));
                Integer apiLimit = asInteger(body.get("apiRateLimitPerMinute"));
                flags.setAuthRateLimitPerMinute(authLimit);
                flags.setApiRateLimitPerMinute(apiLimit);
                rateLimitingFilter.setRateLimitOverridesForTests(authLimit, apiLimit);
            }

            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "ok");
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "error");
            resp.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(resp);
        }
    }

    /**
     * Throw a GatewayException with the given error code (test profile only).
     */
    @PostMapping("/error")
    public ResponseEntity<Void> throwError(@RequestParam("code") String code,
                                           @RequestParam(value = "message", required = false) String message) {
        ErrorCode ec = ErrorCode.fromCode(code);
        if (message == null || message.isBlank()) {
            throw new GatewayException(ec);
        } else {
            throw new GatewayException(ec, message);
        }
    }

    @GetMapping("/sleep")
    public ResponseEntity<Map<String, Object>> sleep(@RequestParam("ms") long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        Map<String, Object> resp = new HashMap<>();
        resp.put("sleptMs", ms);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/sleepAsync")
    public Callable<ResponseEntity<Map<String, Object>>> sleepAsync(@RequestParam("ms") long ms) {
        return () -> {
            try {
                Thread.sleep(ms);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            Map<String, Object> resp = new HashMap<>();
            resp.put("sleptMs", ms);
            return ResponseEntity.ok(resp);
        };
    }


    private Integer asInteger(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(v)); } catch (Exception e) { return null; }
    }

    private Long asLong(Object v) {
        if (v == null) return null;
        if (v instanceof Number n) return n.longValue();
        try { return Long.parseLong(String.valueOf(v)); } catch (Exception e) { return null; }
    }
}

