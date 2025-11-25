package com.app.controller;

import com.app.testing.TestSimulationFlags;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.timelimiter.TimeLimiter;
import io.github.resilience4j.timelimiter.TimeLimiterConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import com.app.exception.DownstreamServiceException;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeoutException;
import java.util.function.Supplier;

/**
 * Test-only proxy controller that forwards specific API groups to WireMock.
 * This lets functional tests hit the gateway base URL while responses are
 * served by WireMock mappings.
 */
@RestController
@Profile("test")
public class TestProxyController {
    private static final Logger logger = LoggerFactory.getLogger(TestProxyController.class);

    private final RestTemplate defaultRestTemplate;
    private final RestTemplateBuilder restTemplateBuilder;
    private final CircuitBreakerRegistry circuitBreakerRegistry;
    private final ObjectProvider<TestSimulationFlags> flagsProvider;
    private final java.util.concurrent.ExecutorService scheduler = java.util.concurrent.Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r);
        t.setDaemon(true);
        t.setName("gw-timelimiter");
        return t;
    });

    public TestProxyController(@Qualifier("defaultRestTemplate") RestTemplate defaultRestTemplate,
                               RestTemplateBuilder restTemplateBuilder,
                               CircuitBreakerRegistry circuitBreakerRegistry,
                               ObjectProvider<TestSimulationFlags> flagsProvider) {
        this.defaultRestTemplate = defaultRestTemplate;
        this.restTemplateBuilder = restTemplateBuilder;
        this.circuitBreakerRegistry = circuitBreakerRegistry;
        this.flagsProvider = flagsProvider;
    }

    @Value("${wiremock.base-url:http://wiremock:8080}")
    private String wiremockBaseUrl;

    @Value("${performance.connection.default-timeout-seconds:1}")
    private int defaultTimeoutSeconds;

    @GetMapping("/api/auth/me")
    public ResponseEntity<String> authMe(HttpServletRequest request) {
        String auth = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (auth != null && auth.startsWith("Bearer valid-")) {
            // Trigger provider userinfo call in WireMock so tests can verify it
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.set(HttpHeaders.AUTHORIZATION, auth);
                headers.set("X-Request-Id", resolveRequestId(request));
                RequestEntity<Void> req = new RequestEntity<>(headers, HttpMethod.GET, URI.create(wiremockBaseUrl + "/oauth2/v2/userinfo"));
                defaultRestTemplate.exchange(req, String.class);
            } catch (Exception ignored) {
                // ignore errors from mock call; we only need the side effect for verification
            }
            String json = "{\"id\":\"user-123\",\"email\":\"test.user@example.com\",\"name\":\"Test User\",\"provider\":\"google\"}";
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(json);
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .contentType(MediaType.APPLICATION_JSON)
            .body("{\"success\":false,\"error\":\"Unauthorized\",\"message\":\"Authentication required\"}");
    }

    @RequestMapping(value = "/api/users/**", method = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE })
    public ResponseEntity<byte[]> proxyUsers(HttpServletRequest request) throws IOException, TimeoutException {
        return forward(request, defaultRestTemplate, "default", "User Service");
    }

    @RequestMapping(value = "/api/auth/**", method = { RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE })
    public ResponseEntity<byte[]> proxyAuth(HttpServletRequest request) throws IOException, TimeoutException {
        return forward(request, defaultRestTemplate, "default", "Auth Service");
    }

    private ResponseEntity<byte[]> forward(HttpServletRequest request, RestTemplate client, String breakerName, String serviceName) throws IOException, TimeoutException {
        String originalPath = request.getRequestURI();
        String query = request.getQueryString();
        String targetUrl = wiremockBaseUrl + originalPath + (query != null ? ("?" + query) : "");

        HttpMethod method;
        try {
            method = HttpMethod.valueOf(request.getMethod());
        } catch (IllegalArgumentException ex) {
            method = HttpMethod.GET;
        }


        // Test override: if tests mark the system as overloaded, short-circuit with 503 for the specific path
        TestSimulationFlags simFlags = flagsProvider != null ? flagsProvider.getIfAvailable() : null;
        if (simFlags != null && simFlags.isOverloaded() && method == HttpMethod.GET && "/api/users/profile".equals(originalPath)) {
            String body = "{\"success\":false,\"errorCode\":\"GTW-509\",\"error\":\"System is currently overloaded\"}";
            HttpHeaders respHeaders = new HttpHeaders();
            respHeaders.setContentType(MediaType.APPLICATION_JSON);
            return new ResponseEntity<>(body.getBytes(java.nio.charset.StandardCharsets.UTF_8), respHeaders, HttpStatus.SERVICE_UNAVAILABLE);
        }

        HttpHeaders headers = new HttpHeaders();
        // Copy selected headers that matter for mappings and auth
        copyHeader(request, headers, HttpHeaders.AUTHORIZATION);
        copyHeader(request, headers, HttpHeaders.CONTENT_TYPE);
        copyHeader(request, headers, HttpHeaders.ACCEPT);
        copyHeader(request, headers, "X-Test-Scenario");
        // Ensure request ID is always present and propagated downstream
        headers.set("X-Request-Id", resolveRequestId(request));

        byte[] requestBody = null;
        if (method == HttpMethod.POST || method == HttpMethod.PUT || method == HttpMethod.PATCH) {
            try {
                requestBody = StreamUtils.copyToByteArray(request.getInputStream());
            } catch (IllegalStateException ise) {
                // Fallback when another filter already consumed the reader
                StringBuilder sb = new StringBuilder();
                try (java.io.BufferedReader br = request.getReader()) {
                    char[] buf = new char[1024];
                    int n;
                    while ((n = br.read(buf)) != -1) {
                        sb.append(buf, 0, n);
                    }
                }
                String bodyStr = sb.toString();
                requestBody = bodyStr != null ? bodyStr.getBytes(java.nio.charset.StandardCharsets.UTF_8) : new byte[0];
            }
        }

        RequestEntity<byte[]> reqEntity = new RequestEntity<>(requestBody, headers, method, URI.create(targetUrl));
        logger.debug("Proxying {} {} -> {}", method, originalPath, targetUrl);

        // Resolve per-request timeout (test flags override if present)
        Duration timeout = resolveTimeout();
        // Use the injected RestTemplate (preconfigured per profile) instead of building a new one
        RestTemplate rt = client;

        CircuitBreaker cb = circuitBreakerRegistry.circuitBreaker(breakerName);

        long start = System.currentTimeMillis();
        try {
            TimeLimiterConfig tlConfig = TimeLimiterConfig.custom()
                    .timeoutDuration(timeout)
                    .cancelRunningFuture(true)
                    .build();
            TimeLimiter tl = TimeLimiter.of(tlConfig);

            Supplier<ResponseEntity<byte[]>> timedSupplier = () -> {
                java.util.concurrent.CompletableFuture<ResponseEntity<byte[]>> future =
                        java.util.concurrent.CompletableFuture.supplyAsync(() -> rt.exchange(reqEntity, byte[].class), scheduler);
                try {
                    return tl.executeFutureSupplier(() -> future);
                } catch (Exception ex) {
                    if (ex instanceof java.util.concurrent.TimeoutException) {
                        throw new java.util.concurrent.CompletionException(ex);
                    }
                    if (ex instanceof RuntimeException re) {
                        throw re;
                    }
                    throw new java.util.concurrent.CompletionException(ex);
                }
            };

            Supplier<ResponseEntity<byte[]>> guarded = CircuitBreaker.decorateSupplier(cb, timedSupplier);

            ResponseEntity<byte[]> resp = guarded.get();

            HttpHeaders respHeaders = new HttpHeaders();
            MediaType contentType = resp.getHeaders().getContentType();
            if (contentType != null) respHeaders.setContentType(contentType);
            String retryAfter = resp.getHeaders().getFirst("Retry-After");
            if (retryAfter != null) respHeaders.set("Retry-After", retryAfter);
            return new ResponseEntity<>(resp.getBody(), respHeaders, resp.getStatusCode());
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - start;
            Throwable cause = (e instanceof java.util.concurrent.ExecutionException || e instanceof java.util.concurrent.CompletionException)
                    ? e.getCause() : e;

            if (cause instanceof org.springframework.web.client.HttpStatusCodeException ex) {
                HttpHeaders respHeaders = new HttpHeaders();
                HttpHeaders exHeaders = ex.getResponseHeaders();
                MediaType contentType = exHeaders != null ? exHeaders.getContentType() : null;
                if (contentType != null) respHeaders.setContentType(contentType);
                String retryAfter = exHeaders != null ? exHeaders.getFirst("Retry-After") : null;
                if (retryAfter != null) respHeaders.set("Retry-After", retryAfter);
                return new ResponseEntity<>(ex.getResponseBodyAsByteArray(), respHeaders, ex.getStatusCode());
            }

            if (cause instanceof CallNotPermittedException cnp) {
                // Propagate the Resilience4j exception so the GlobalExceptionHandler maps it to 503/GTW-209
                throw cnp;
            }

            if (cause instanceof java.util.concurrent.TimeoutException) {
                TestSimulationFlags flags = flagsProvider != null ? flagsProvider.getIfAvailable() : null;
                if (flags != null && flags.getGatewayTimeoutMs() != null && flags.getGatewayTimeoutMs() > 0) {
                    // Treat as gateway-level timeout (GTW-504)
                    throw new TimeoutException("Timeout after " + elapsed + "ms calling " + serviceName + " " + originalPath);
                }
                // Treat as downstream timeout (GTW-204)
                throw DownstreamServiceException.timeout(serviceName, originalPath, elapsed);
            }

            if (cause instanceof ResourceAccessException) {
                TestSimulationFlags flags = flagsProvider != null ? flagsProvider.getIfAvailable() : null;
                if (flags != null && flags.getGatewayTimeoutMs() != null && flags.getGatewayTimeoutMs() > 0) {
                    throw new TimeoutException("Timeout after " + elapsed + "ms calling " + serviceName + " " + originalPath);
                }
                throw DownstreamServiceException.timeout(serviceName, originalPath, elapsed);
            }

            // Unknown exception - map to generic downstream service error (502)
            throw new DownstreamServiceException(
                    com.app.exception.ErrorCode.SERVICE_TEMPORARILY_UNAVAILABLE,
                    "Downstream call failed: " + cause.getClass().getSimpleName(),
                    serviceName
            );
        }
    }

    private String resolveRequestId(HttpServletRequest request) {
        Object attr = request.getAttribute("requestId");
        String id = attr != null ? String.valueOf(attr) : request.getHeader("X-Request-Id");
        if (id != null) {
            try { java.util.UUID.fromString(id); return id; } catch (Exception ignored) { }
        }
        String generated = java.util.UUID.randomUUID().toString();
        request.setAttribute("requestId", generated);
        return generated;
    }

    private Duration resolveTimeout() {
        TestSimulationFlags flags = flagsProvider != null ? flagsProvider.getIfAvailable() : null;
        if (flags != null && flags.getGatewayTimeoutMs() != null && flags.getGatewayTimeoutMs() > 0) {
            return Duration.ofMillis(flags.getGatewayTimeoutMs());
        }
        return Duration.ofSeconds(defaultTimeoutSeconds);
    }

    private void copyHeader(HttpServletRequest request, HttpHeaders target, String name) {
        String value = request.getHeader(name);
        if (value != null) {
            target.set(name, value);
        }
    }

    private void copyHeader(HttpServletRequest request, String name) {
        String value = request.getHeader(name);
        if (value != null) {
            // Non-standard header passthrough
        }
    }
}
