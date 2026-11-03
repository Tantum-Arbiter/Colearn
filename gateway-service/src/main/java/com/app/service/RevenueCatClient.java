package com.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Iterator;
import java.util.Map;

@Service
public class RevenueCatClient {

    public record Lookup(Tier tier, Long expiresAtMs, boolean sandbox) {
    }

    public static class UnavailableException extends RuntimeException {
        private final String outcome;

        public UnavailableException(String outcome, String message) {
            super(message);
            this.outcome = outcome;
        }

        public String outcome() {
            return outcome;
        }
    }

    private static final Logger logger = LoggerFactory.getLogger(RevenueCatClient.class);
    private static final String BREAKER = "revenuecat";
    private static final String PREMIUM_ENTITLEMENT = "premium_access";
    private static final String BASIC_ENTITLEMENT = "basic_access";

    private final RestTemplate restTemplate;
    private final CircuitBreaker circuitBreaker;
    private final ApplicationMetricsService metrics;
    private final String apiUrl;
    private final String secretApiKey;
    private final boolean acceptSandbox;
    private final Clock clock;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    public RevenueCatClient(@Qualifier("revenueCatRestTemplate") RestTemplate restTemplate,
                            CircuitBreakerRegistry circuitBreakers,
                            ApplicationMetricsService metrics,
                            @Value("${app.revenuecat.api-url:https://api.revenuecat.com}") String apiUrl,
                            @Value("${app.revenuecat.secret-api-key:}") String secretApiKey,
                            @Value("${app.revenuecat.accept-sandbox:true}") boolean acceptSandbox) {
        this(restTemplate, circuitBreakers, metrics, apiUrl, secretApiKey, acceptSandbox, Clock.systemUTC());
    }

    public RevenueCatClient(RestTemplate restTemplate, CircuitBreakerRegistry circuitBreakers, ApplicationMetricsService metrics,
                            String apiUrl, String secretApiKey, boolean acceptSandbox, Clock clock) {
        this.restTemplate = restTemplate;
        this.circuitBreaker = circuitBreakers.circuitBreaker(BREAKER);
        this.metrics = metrics;
        this.apiUrl = apiUrl.endsWith("/") ? apiUrl.substring(0, apiUrl.length() - 1) : apiUrl;
        this.secretApiKey = secretApiKey == null ? "" : secretApiKey.trim();
        this.acceptSandbox = acceptSandbox;
        this.clock = clock;
        if (this.secretApiKey.isEmpty()) {
            logger.warn("[RevenueCat] REVENUECAT_SECRET_API_KEY is not set; every subscription lookup counts as unavailable");
        }
    }

    public Lookup lookup(String userId) {
        long started = System.currentTimeMillis();
        if (secretApiKey.isEmpty()) {
            throw unavailable("not_configured", started, "No RevenueCat secret API key");
        }
        try {
            Lookup lookup = circuitBreaker.executeSupplier(() -> fetch(userId));
            metrics.recordRevenueCatRequest(lookup.tier().isPaid() ? "active" : "inactive", System.currentTimeMillis() - started);
            return lookup;
        } catch (CallNotPermittedException e) {
            throw unavailable("circuit_open", started, "RevenueCat circuit breaker is open");
        } catch (UnavailableException e) {
            metrics.recordRevenueCatRequest(e.outcome(), System.currentTimeMillis() - started);
            throw e;
        }
    }

    private UnavailableException unavailable(String outcome, long started, String message) {
        metrics.recordRevenueCatRequest(outcome, System.currentTimeMillis() - started);
        return new UnavailableException(outcome, message);
    }

    private Lookup fetch(String userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(secretApiKey);
        String url = apiUrl + "/v1/subscribers/" + UriUtils.encodePathSegment(userId, StandardCharsets.UTF_8);
        String body;
        try {
            body = restTemplate.exchange(java.net.URI.create(url), HttpMethod.GET, new HttpEntity<>(headers), String.class).getBody();
        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().value() == HttpStatus.NOT_FOUND.value()) {
                return new Lookup(Tier.FREE, null, false);
            }
            throw new UnavailableException(outcomeFor(e.getStatusCode().value()), "RevenueCat answered " + e.getStatusCode().value());
        } catch (ResourceAccessException e) {
            throw new UnavailableException("timeout", "RevenueCat did not answer: " + e.getMessage());
        }
        return parse(body);
    }

    private static String outcomeFor(int status) {
        if (status == 401 || status == 403) {
            return "unauthorized";
        }
        if (status == 429) {
            return "rate_limited";
        }
        return "server_error";
    }

    private Lookup parse(String body) {
        JsonNode subscriber;
        try {
            subscriber = body == null ? null : objectMapper.readTree(body).get("subscriber");
        } catch (Exception e) {
            throw new UnavailableException("bad_response", "RevenueCat sent something that is not JSON");
        }
        if (subscriber == null || !subscriber.isObject()) {
            throw new UnavailableException("bad_response", "RevenueCat sent no subscriber");
        }
        JsonNode subscriptions = subscriber.path("subscriptions");
        long now = clock.millis();

        Tier best = Tier.FREE;
        Long bestExpiry = null;
        boolean bestSandbox = false;
        Iterator<Map.Entry<String, JsonNode>> entitlements = subscriber.path("entitlements").fields();
        while (entitlements.hasNext()) {
            Map.Entry<String, JsonNode> entry = entitlements.next();
            Tier tier = tierFor(entry.getKey());
            if (tier == null) {
                continue;
            }
            Long expiresAt = expiry(entry.getValue().path("expires_date"));
            if (expiresAt != null && expiresAt <= now) {
                continue;
            }
            boolean sandbox = subscriptions.path(entry.getValue().path("product_identifier").asText("")).path("is_sandbox").asBoolean(false);
            if (sandbox && !acceptSandbox) {
                continue;
            }
            if (tier.ordinal() > best.ordinal()) {
                best = tier;
                bestExpiry = expiresAt;
                bestSandbox = sandbox;
            }
        }
        return new Lookup(best, bestExpiry, bestSandbox);
    }

    private static Tier tierFor(String entitlementId) {
        if (PREMIUM_ENTITLEMENT.equals(entitlementId)) {
            return Tier.PREMIUM;
        }
        return BASIC_ENTITLEMENT.equals(entitlementId) ? Tier.BASIC : null;
    }

    private static Long expiry(JsonNode value) {
        if (value == null || value.isMissingNode() || value.isNull()) {
            return null;
        }
        try {
            return Instant.parse(value.asText()).toEpochMilli();
        } catch (DateTimeParseException e) {
            throw new UnavailableException("bad_response", "RevenueCat sent an expiry it could not read");
        }
    }
}
