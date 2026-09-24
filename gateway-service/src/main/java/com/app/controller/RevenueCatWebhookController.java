package com.app.controller;

import com.app.dto.RevenueCatWebhook;
import com.app.exception.ErrorCode;
import com.app.service.EntitlementService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.concurrent.CompletionException;

@RestController
@RequestMapping("/webhooks/revenuecat")
public class RevenueCatWebhookController {

    private static final Logger logger = LoggerFactory.getLogger(RevenueCatWebhookController.class);

    private final EntitlementService entitlementService;
    private final byte[] secret;

    public RevenueCatWebhookController(EntitlementService entitlementService,
                                       @Value("${app.revenuecat.webhook-secret:}") String secret) {
        this.entitlementService = entitlementService;
        this.secret = secret == null ? new byte[0] : secret.trim().getBytes(StandardCharsets.UTF_8);
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> receive(@RequestHeader(value = "Authorization", required = false) String authorization,
                                                       @RequestBody RevenueCatWebhook webhook) {
        if (secret.length == 0) {
            return error(HttpStatus.SERVICE_UNAVAILABLE, ErrorCode.CONFIG_SECRET_MISSING);
        }
        if (!signed(authorization)) {
            logger.warn("[RevenueCat] Rejected a webhook with the wrong secret");
            return error(HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED_ACCESS);
        }
        if (webhook == null || webhook.getEvent() == null) {
            return error(HttpStatus.BAD_REQUEST, ErrorCode.INVALID_REQUEST_BODY);
        }
        try {
            EntitlementService.Outcome outcome = entitlementService.apply(webhook).join();
            logger.info("[RevenueCat] {} event: {}", webhook.getEvent().getType(), outcome);
            return ResponseEntity.ok(Map.of("outcome", outcome.name()));
        } catch (CompletionException e) {
            logger.error("[RevenueCat] Could not store a {} event; RevenueCat will retry", webhook.getEvent().getType(), e);
            return error(HttpStatus.INTERNAL_SERVER_ERROR, ErrorCode.DATABASE_ERROR);
        }
    }

    private boolean signed(String authorization) {
        if (authorization == null) {
            return false;
        }
        String presented = authorization.startsWith("Bearer ") ? authorization.substring("Bearer ".length()) : authorization;
        return MessageDigest.isEqual(presented.trim().getBytes(StandardCharsets.UTF_8), secret);
    }

    private static ResponseEntity<Map<String, Object>> error(HttpStatus status, ErrorCode code) {
        return ResponseEntity.status(status).body(Map.of("success", false, "errorCode", code.getCode(), "error", code.getDefaultMessage()));
    }
}
