package com.app.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.Tags;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import jakarta.servlet.http.HttpServletRequest;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.regex.Pattern;
import java.util.Map;

/**
 * Application Metrics Service
 * Captures custom metrics for application responses with device type and useful information
 */
@Service
public class ApplicationMetricsService {

    private static final Logger logger = LoggerFactory.getLogger(ApplicationMetricsService.class);

    private final MeterRegistry meterRegistry;

    // Dynamic counters and timers are created on-demand using builders

    // Gauges for active sessions and connections
    private final AtomicLong activeSessions = new AtomicLong(0);
    private final AtomicLong activeConnections = new AtomicLong(0);
    private final ConcurrentHashMap<String, AtomicLong> deviceTypeCounters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AtomicLong> platformCounters = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AtomicLong> appVersionCounters = new ConcurrentHashMap<>();

    // Device type patterns for user agent parsing
    private static final Pattern MOBILE_PATTERN = Pattern.compile("(?i)mobile|android|iphone|ipod|blackberry|windows phone");
    private static final Pattern TABLET_PATTERN = Pattern.compile("(?i)tablet|ipad|kindle|silk");
    private static final Pattern DESKTOP_PATTERN = Pattern.compile("(?i)windows|macintosh|linux|x11");
    private static final Pattern BOT_PATTERN = Pattern.compile("(?i)bot|crawler|spider|scraper");

    public ApplicationMetricsService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;

        // Initialize gauges
        Gauge.builder("app.sessions.active", activeSessions, AtomicLong::doubleValue)
                .description("Number of active sessions")
                .register(meterRegistry);

        Gauge.builder("app.connections.active", activeConnections, AtomicLong::doubleValue)
                .description("Number of active connections")
                .register(meterRegistry);
    }

    /**
     * Record a request with device and platform information
     */
    public void recordRequest(HttpServletRequest request, int statusCode, long responseTimeMs) {
        String deviceType = extractDeviceType(request);
        String platform = extractPlatform(request);
        String appVersion = extractAppVersion(request);
        String endpoint = sanitizeEndpoint(request.getRequestURI());
        String method = request.getMethod();

        Tags tags = Tags.of(
            "device_type", deviceType,
            "platform", platform,
            "app_version", appVersion != null ? appVersion : "unknown",
            "endpoint", endpoint,
            "method", method,
            "status_code", String.valueOf(statusCode),
            "status_class", getStatusClass(statusCode)
        );

        // Record request counter
        Counter.builder("app.requests.total")
                .tags(tags)
                .register(meterRegistry)
                .increment();

        // Record response time
        Timer.builder("app.response.time")
                .tags(tags)
                .register(meterRegistry)
                .record(responseTimeMs, TimeUnit.MILLISECONDS);

        // Update device type counters
        updateDeviceTypeCounter(deviceType);
        updatePlatformCounter(platform);
        if (appVersion != null) {
            updateAppVersionCounter(appVersion);
        }

        logger.debug("Recorded request: device={}, platform={}, version={}, endpoint={}, status={}, time={}ms",
                    deviceType, platform, appVersion, endpoint, statusCode, responseTimeMs);
    }

    /**
     * Record authentication attempt
     */
    public void recordAuthentication(String provider, String deviceType, String platform,
                                   String appVersion, boolean successful, long processingTimeMs) {
        String safeProvider = provider != null ? provider : "unknown";
        String safeDeviceType = deviceType != null ? deviceType : "unknown";
        String safePlatform = platform != null ? platform : "unknown";
        String safeAppVersion = appVersion != null ? appVersion : "unknown";

        Tags tags = Tags.of(
            "provider", safeProvider,
            "device_type", safeDeviceType,
            "platform", safePlatform,
            "app_version", safeAppVersion,
            "result", successful ? "success" : "failure"
        );

        Counter.builder("app.authentication.total")
                .tags(tags)
                .register(meterRegistry)
                .increment();
        Timer.builder("app.authentication.time")
                .tags(tags)
                .register(meterRegistry)
                .record(processingTimeMs, TimeUnit.MILLISECONDS);

        if (successful) {
            incrementActiveSessions();
        }
    }

    /**
     * Record error with context
     */
    public void recordError(HttpServletRequest request, String errorType, String errorCode) {
        String deviceType = extractDeviceType(request);
        String platform = extractPlatform(request);
        String endpoint = sanitizeEndpoint(request.getRequestURI());

        Tags tags = Tags.of(
            "device_type", deviceType,
            "platform", platform,
            "endpoint", endpoint,
            "error_type", errorType,
            "error_code", errorCode
        );

        Counter.builder("app.errors.total")
                .tags(tags)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Record rate limit violation
     */
    public void recordRateLimitViolation(HttpServletRequest request, String limitType) {
        String deviceType = extractDeviceType(request);
        String platform = extractPlatform(request);
        String endpoint = sanitizeEndpoint(request.getRequestURI());

        Tags tags = Tags.of(
            "device_type", deviceType,
            "platform", platform,
            "endpoint", endpoint,
            "limit_type", limitType
        );

        Counter.builder("app.rate_limit.violations")
                .tags(tags)
                .register(meterRegistry)
                .increment();
    }

    /**
     * Extract device type from user agent
     */
    private String extractDeviceType(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        if (userAgent == null) {
            return "unknown";
        }

        userAgent = userAgent.toLowerCase();

        if (BOT_PATTERN.matcher(userAgent).find()) {
            return "bot";
        } else if (MOBILE_PATTERN.matcher(userAgent).find()) {
            return "mobile";
        } else if (TABLET_PATTERN.matcher(userAgent).find()) {
            return "tablet";
        } else if (DESKTOP_PATTERN.matcher(userAgent).find()) {
            return "desktop";
        } else {
            return "unknown";
        }
    }

    /**
     * Extract platform from headers
     */
    private String extractPlatform(HttpServletRequest request) {
        String platform = request.getHeader("X-Platform");
        if (platform != null && !platform.trim().isEmpty()) {
            return platform.toLowerCase();
        }

        String userAgent = request.getHeader("User-Agent");
        if (userAgent == null) {
            return "unknown";
        }

        userAgent = userAgent.toLowerCase();
        if (userAgent.contains("android")) {
            return "android";
        } else if (userAgent.contains("ios") || userAgent.contains("iphone") || userAgent.contains("ipad")) {
            return "ios";
        } else if (userAgent.contains("windows")) {
            return "windows";
        } else if (userAgent.contains("mac")) {
            return "macos";
        } else if (userAgent.contains("linux")) {
            return "linux";
        } else {
            return "unknown";
        }
    }

    /**
     * Extract app version from headers
     */
    private String extractAppVersion(HttpServletRequest request) {
        return request.getHeader("X-App-Version");
    }

    /**
     * Sanitize endpoint for metrics (remove IDs and sensitive data)
     */
    private String sanitizeEndpoint(String uri) {
        if (uri == null) {
            return "unknown";
        }

        // Replace UUIDs and numeric IDs with placeholders
        return uri.replaceAll("/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "/{uuid}")
                 .replaceAll("/\\d+", "/{id}")
                 .replaceAll("\\?.*", ""); // Remove query parameters
    }

    /**
     * Get status code class (2xx, 4xx, 5xx)
     */
    private String getStatusClass(int statusCode) {
        return statusCode / 100 + "xx";
    }

    /**
     * Update device type counter
     */
    private void updateDeviceTypeCounter(String deviceType) {
        deviceTypeCounters.computeIfAbsent(deviceType, k -> {
            AtomicLong counter = new AtomicLong(0);
            Gauge.builder("app.devices.count", counter, AtomicLong::doubleValue)
                    .description("Count of requests by device type")
                    .tag("device_type", deviceType)
                    .register(meterRegistry);
            return counter;
        }).incrementAndGet();
    }

    /**
     * Update platform counter
     */
    private void updatePlatformCounter(String platform) {
        platformCounters.computeIfAbsent(platform, k -> {
            AtomicLong counter = new AtomicLong(0);
            Gauge.builder("app.platforms.count", counter, AtomicLong::doubleValue)
                    .description("Count of requests by platform")
                    .tag("platform", platform)
                    .register(meterRegistry);
            return counter;
        }).incrementAndGet();
    }

    /**
     * Update app version counter
     */
    private void updateAppVersionCounter(String appVersion) {
        appVersionCounters.computeIfAbsent(appVersion, k -> {
            AtomicLong counter = new AtomicLong(0);
            Gauge.builder("app.versions.count", counter, AtomicLong::doubleValue)
                    .description("Count of requests by app version")
                    .tag("app_version", appVersion)
                    .register(meterRegistry);
            return counter;
        }).incrementAndGet();
    }

    /**
     * Session management
     */
    public void incrementActiveSessions() {
        activeSessions.incrementAndGet();
    }

    public void decrementActiveSessions() {
        activeSessions.decrementAndGet();
    }

    public void incrementActiveConnections() {
        activeConnections.incrementAndGet();
    }

    public void decrementActiveConnections() {
        activeConnections.decrementAndGet();
    }

    /**
     * Get current metrics summary
     */
    public Map<String, Object> getMetricsSummary() {
        Map<String, Object> summary = new ConcurrentHashMap<>();
        summary.put("active_sessions", activeSessions.get());
        summary.put("active_connections", activeConnections.get());
        summary.put("device_types", deviceTypeCounters.entrySet().stream()
                .collect(java.util.stream.Collectors.toMap(
                    Map.Entry::getKey,
                    e -> e.getValue().get())));
        summary.put("platforms", platformCounters.entrySet().stream()
                .collect(java.util.stream.Collectors.toMap(
                    Map.Entry::getKey,
                    e -> e.getValue().get())));
        summary.put("app_versions", appVersionCounters.entrySet().stream()
                .collect(java.util.stream.Collectors.toMap(
                    Map.Entry::getKey,
                    e -> e.getValue().get())));
        return summary;
    }

    // User Management Metrics

    public void recordUserCreated(String provider) {
        String safeProvider = provider != null ? provider : "unknown";
        Counter.builder("app.users.created")
                .tags("provider", safeProvider)
                .description("Number of users created")
                .register(meterRegistry)
                .increment();
        logger.debug("User created metric recorded for provider: {}", safeProvider);
    }

    public void recordUserCreationError(String provider, String errorType) {
        String safeProvider = provider != null ? provider : "unknown";
        String safeErrorType = errorType != null ? errorType : "unknown";
        Counter.builder("app.users.creation.errors")
                .tags("provider", safeProvider, "error_type", safeErrorType)
                .description("Number of user creation errors")
                .register(meterRegistry)
                .increment();
        logger.debug("User creation error metric recorded for provider: {}, error: {}", safeProvider, safeErrorType);
    }

    public void recordUserLookup(String lookupType, String result) {
        String safeLookupType = lookupType != null ? lookupType : "unknown";
        String safeResult = result != null ? result : "unknown";
        Counter.builder("app.users.lookups")
                .tags("lookup_type", safeLookupType, "result", safeResult)
                .description("Number of user lookups")
                .register(meterRegistry)
                .increment();
        logger.debug("User lookup metric recorded: {} -> {}", safeLookupType, safeResult);
    }

    public void recordUserLogin(String provider, String userType) {
        String safeProvider = provider != null ? provider : "unknown";
        String safeUserType = userType != null ? userType : "unknown";
        Counter.builder("app.users.logins")
                .tags("provider", safeProvider, "user_type", safeUserType)
                .description("Number of user logins")
                .register(meterRegistry)
                .increment();
        logger.debug("User login metric recorded: {} user via {}", safeUserType, safeProvider);
    }

    public void recordUserPreferencesUpdate(String userId) {
        String safeUserId = userId != null ? userId : "unknown";
        Counter.builder("app.users.preferences.updates")
                .tags("user_id", safeUserId)
                .description("Number of user preference updates")
                .register(meterRegistry)
                .increment();
        logger.debug("User preferences update metric recorded for user: {}", safeUserId);
    }

    public void recordUserDeactivated(String userId) {
        String safeUserId = userId != null ? userId : "unknown";
        Counter.builder("app.users.deactivated")
                .tags("user_id", safeUserId)
                .description("Number of users deactivated")
                .register(meterRegistry)
                .increment();
        logger.debug("User deactivation metric recorded for user: {}", safeUserId);
    }

    public void recordUserListQuery(String queryType, int resultCount) {
        String safeQueryType = queryType != null ? queryType : "unknown";
        Counter.builder("app.users.list.queries")
                .tags("query_type", safeQueryType, "result_count", String.valueOf(resultCount))
                .description("Number of user list queries")
                .register(meterRegistry)
                .increment();
        logger.debug("User list query metric recorded: {} with {} results", safeQueryType, resultCount);
    }



    // Session Management Metrics

    public void recordSessionCreated(String deviceType, String platform) {
        String safeDeviceType = deviceType != null ? deviceType : "unknown";
        String safePlatform = platform != null ? platform : "unknown";
        Counter.builder("app.sessions.created")
                .tags("device_type", safeDeviceType, "platform", safePlatform)
                .description("Number of sessions created")
                .register(meterRegistry)
                .increment();
        logger.debug("Session creation metric recorded: {} on {}", safeDeviceType, safePlatform);
    }

    public void recordSessionCreationError(String deviceType, String errorType) {
        String safeDeviceType = deviceType != null ? deviceType : "unknown";
        String safeErrorType = errorType != null ? errorType : "unknown";
        Counter.builder("app.sessions.creation.errors")
                .tags("device_type", safeDeviceType, "error_type", safeErrorType)
                .description("Number of session creation errors")
                .register(meterRegistry)
                .increment();
        logger.debug("Session creation error metric recorded: {} - {}", safeDeviceType, safeErrorType);
    }

    public void recordSessionLookup(String lookupType, String result) {
        String safeLookupType = lookupType != null ? lookupType : "unknown";
        String safeResult = result != null ? result : "unknown";
        Counter.builder("app.sessions.lookups")
                .tags("lookup_type", safeLookupType, "result", safeResult)
                .description("Number of session lookups")
                .register(meterRegistry)
                .increment();
        logger.debug("Session lookup metric recorded: {} -> {}", safeLookupType, safeResult);
    }

    public void recordSessionRefreshed(String deviceType, String platform) {
        String safeDeviceType = deviceType != null ? deviceType : "unknown";
        String safePlatform = platform != null ? platform : "unknown";
        Counter.builder("app.sessions.refreshed")
                .tags("device_type", safeDeviceType, "platform", safePlatform)
                .description("Number of sessions refreshed")
                .register(meterRegistry)
                .increment();
        logger.debug("Session refresh metric recorded: {} on {}", safeDeviceType, safePlatform);
    }

    public void recordSessionRevoked(String deviceType, String platform, String reason) {
        String safeDeviceType = deviceType != null ? deviceType : "unknown";
        String safePlatform = platform != null ? platform : "unknown";
        String safeReason = reason != null ? reason : "unknown";
        Counter.builder("app.sessions.revoked")
                .tags("device_type", safeDeviceType, "platform", safePlatform, "reason", safeReason)
                .description("Number of sessions revoked")
                .register(meterRegistry)
                .increment();
        logger.debug("Session revocation metric recorded: {} on {} - reason: {}", safeDeviceType, safePlatform, safeReason);
    }

    public void recordSessionAccess(String deviceType, String platform) {
        String safeDeviceType = deviceType != null ? deviceType : "unknown";
        String safePlatform = platform != null ? platform : "unknown";
        Counter.builder("app.sessions.accessed")
                .tags("device_type", safeDeviceType, "platform", safePlatform)
                .description("Number of session accesses")
                .register(meterRegistry)
                .increment();
        logger.debug("Session access metric recorded: {} on {}", safeDeviceType, safePlatform);
    }

    public void recordUserSessionsRevoked(String userId, int sessionCount) {
        String safeUserId = userId != null ? userId : "unknown";
        Counter.builder("app.sessions.user.revoked")
                .tags("user_id", safeUserId, "session_count", String.valueOf(sessionCount))
                .description("Number of user session revocations")
                .register(meterRegistry)
                .increment();
        logger.debug("User sessions revocation metric recorded: {} sessions for user {}", sessionCount, safeUserId);
    }

    public void recordDeviceSessionsRevoked(String deviceId, int sessionCount) {
        String safeDeviceId = deviceId != null ? deviceId : "unknown";
        Counter.builder("app.sessions.device.revoked")
                .tags("device_id", safeDeviceId, "session_count", String.valueOf(sessionCount))
                .description("Number of device session revocations")
                .register(meterRegistry)
                .increment();
        logger.debug("Device sessions revocation metric recorded: {} sessions for device {}", sessionCount, safeDeviceId);
    }

    public void recordUserSessionQuery(String userId, int resultCount) {
        String safeUserId = userId != null ? userId : "unknown";
        Counter.builder("app.sessions.user.queries")
                .tags("user_id", safeUserId, "result_count", String.valueOf(resultCount))
                .description("Number of user session queries")
                .register(meterRegistry)
                .increment();
        logger.debug("User session query metric recorded: {} sessions for user {}", resultCount, safeUserId);
    }

    public void recordExpiredSessionsCleanup(Long deletedCount) {
        Counter.builder("app.sessions.expired.cleanup")
                .tags("deleted_count", String.valueOf(deletedCount))
                .description("Number of expired session cleanups")
                .register(meterRegistry)
                .increment();
        logger.debug("Expired sessions cleanup metric recorded: {} sessions deleted", deletedCount);
    }

    public void recordExpiringSessionsQuery(int withinMinutes, int resultCount) {
        Counter.builder("app.sessions.expiring.queries")
                .tags("within_minutes", String.valueOf(withinMinutes), "result_count", String.valueOf(resultCount))
                .description("Number of expiring session queries")
                .register(meterRegistry)
                .increment();
        logger.debug("Expiring sessions query metric recorded: {} sessions expiring within {} minutes", resultCount, withinMinutes);
    }

    // Firebase/Firestore Metrics

    public void recordFirestoreOperation(String collection, String operation, boolean success, long durationMs) {
        String safeCollection = collection != null ? collection : "unknown";
        String safeOperation = operation != null ? operation : "unknown";
        String status = success ? "success" : "error";

        Counter.builder("app.firestore.operations")
                .tags("collection", safeCollection, "operation", safeOperation, "status", status)
                .description("Number of Firestore operations")
                .register(meterRegistry)
                .increment();

        Timer.builder("app.firestore.operation.duration")
                .tags("collection", safeCollection, "operation", safeOperation, "status", status)
                .description("Duration of Firestore operations")
                .register(meterRegistry)
                .record(durationMs, TimeUnit.MILLISECONDS);

        logger.debug("Firestore operation metric recorded: {} {} on {} - {} ({}ms)",
                safeOperation, status, safeCollection, success ? "success" : "error", durationMs);
    }

    public void recordFirestoreConnectionHealth(boolean healthy) {
        String status = healthy ? "healthy" : "unhealthy";

        Counter.builder("app.firestore.connection.health")
                .tags("status", status)
                .description("Firestore connection health checks")
                .register(meterRegistry)
                .increment();

        logger.debug("Firestore connection health metric recorded: {}", status);
    }

    public void recordFirestoreDocumentCount(String collection, long count) {
        String safeCollection = collection != null ? collection : "unknown";
        Gauge.builder("app.firestore.documents.count", () -> count)
                .tags("collection", safeCollection)
                .description("Number of documents in Firestore collection")
                .register(meterRegistry);

        logger.debug("Firestore document count metric recorded: {} documents in {}", count, safeCollection);
    }

    public void recordFirestoreQueryPerformance(String collection, String queryType, long durationMs, int resultCount) {
        String safeCollection = collection != null ? collection : "unknown";
        String safeQueryType = queryType != null ? queryType : "unknown";
        Timer.builder("app.firestore.query.duration")
                .tags("collection", safeCollection, "query_type", safeQueryType, "result_count", String.valueOf(resultCount))
                .description("Duration of Firestore queries")
                .register(meterRegistry)
                .record(durationMs, TimeUnit.MILLISECONDS);

        Counter.builder("app.firestore.queries")
                .tags("collection", safeCollection, "query_type", safeQueryType)
                .description("Number of Firestore queries")
                .register(meterRegistry)
                .increment();

        logger.debug("Firestore query performance metric recorded: {} query on {} - {}ms, {} results",
                safeQueryType, safeCollection, durationMs, resultCount);
    }

    public void recordFirestoreError(String collection, String operation, String errorType) {
        String safeCollection = collection != null ? collection : "unknown";
        String safeOperation = operation != null ? operation : "unknown";
        String safeErrorType = errorType != null ? errorType : "unknown";
        Counter.builder("app.firestore.errors")
                .tags("collection", safeCollection, "operation", safeOperation, "error_type", safeErrorType)
                .description("Number of Firestore errors")
                .register(meterRegistry)
                .increment();

        logger.debug("Firestore error metric recorded: {} {} on {} - {}",
                safeOperation, safeErrorType, safeCollection, safeErrorType);
    }

    public void recordFirestoreBatchOperation(String collection, String operation, int batchSize, boolean success, long durationMs) {
        String safeCollection = collection != null ? collection : "unknown";
        String safeOperation = operation != null ? operation : "unknown";
        String status = success ? "success" : "error";

        Counter.builder("app.firestore.batch.operations")
                .tags("collection", safeCollection, "operation", safeOperation, "status", status, "batch_size", String.valueOf(batchSize))
                .description("Number of Firestore batch operations")
                .register(meterRegistry)
                .increment();

        Timer.builder("app.firestore.batch.duration")
                .tags("collection", safeCollection, "operation", safeOperation, "status", status)
                .description("Duration of Firestore batch operations")
                .register(meterRegistry)
                .record(durationMs, TimeUnit.MILLISECONDS);

        logger.debug("Firestore batch operation metric recorded: {} {} on {} - {} items, {} ({}ms)",
                operation, status, collection, batchSize, success ? "success" : "error", durationMs);
    }

    // --- Circuit Breaker metrics ---

    private final Map<String, AtomicLong> circuitBreakerStateCounters = new ConcurrentHashMap<>();

    /**
     * Record circuit breaker state - creates a gauge per state (OPEN, HALF_OPEN, CLOSED)
     */
    public void recordCircuitBreakerState(String name, String state) {
        String safeName = name != null ? name : "unknown";
        String safeState = state != null ? state : "unknown";
        String gaugeKey = safeName + "_" + safeState;

        // Reset all states for this circuit breaker to 0
        circuitBreakerStateCounters.entrySet().stream()
                .filter(entry -> entry.getKey().startsWith(safeName + "_"))
                .forEach(entry -> entry.getValue().set(0));

        // Set the current state to 1
        circuitBreakerStateCounters.computeIfAbsent(gaugeKey, k -> {
            AtomicLong counter = new AtomicLong(0);
            Gauge.builder("app.circuitbreaker.state", counter, AtomicLong::doubleValue)
                    .description("Circuit breaker current state (1=active, 0=inactive)")
                    .tag("name", safeName)
                    .tag("state", safeState)
                    .register(meterRegistry);
            return counter;
        }).set(1);

        logger.debug("Circuit breaker state recorded: {} is now {}", safeName, safeState);
    }

    /**
     * Record circuit breaker call outcomes
     */
    public void recordCircuitBreakerCall(String name, String outcome) {
        String safeName = name != null ? name : "unknown";
        String safeOutcome = outcome != null ? outcome : "unknown";
        Counter.builder("app.circuitbreaker.calls")
                .description("Circuit breaker call outcomes")
                .tag("name", safeName)
                .tag("outcome", safeOutcome)
                .register(meterRegistry)
                .increment();
    }

    // --- Sad Case / Error Rate Metrics ---

    /**
     * Record authentication failure with detailed error information
     */
    public void recordAuthenticationFailure(String provider, String deviceType, String platform, String errorType, String errorCode) {
        String safeProvider = provider != null ? provider : "unknown";
        String safeDeviceType = deviceType != null ? deviceType : "unknown";
        String safePlatform = platform != null ? platform : "unknown";
        String safeErrorType = errorType != null ? errorType : "unknown";
        String safeErrorCode = errorCode != null ? errorCode : "unknown";
        Tags tags = Tags.of(
            "provider", safeProvider,
            "device_type", safeDeviceType,
            "platform", safePlatform,
            "error_type", safeErrorType,
            "error_code", safeErrorCode
        );

        Counter.builder("app.authentication.failures")
                .tags(tags)
                .description("Number of authentication failures")
                .register(meterRegistry)
                .increment();

        logger.debug("Authentication failure recorded: provider={}, error_type={}, error_code={}",
                    safeProvider, safeErrorType, safeErrorCode);
    }

    /**
     * Record token refresh failure
     */
    public void recordTokenRefreshFailure(String provider, String deviceType, String platform, String errorType) {
        String safeProvider = provider != null ? provider : "unknown";
        String safeDeviceType = deviceType != null ? deviceType : "unknown";
        String safePlatform = platform != null ? platform : "unknown";
        String safeErrorType = errorType != null ? errorType : "unknown";
        Tags tags = Tags.of(
            "provider", safeProvider,
            "device_type", safeDeviceType,
            "platform", safePlatform,
            "error_type", safeErrorType
        );

        Counter.builder("app.tokens.refresh.failures")
                .tags(tags)
                .description("Number of token refresh failures")
                .register(meterRegistry)
                .increment();

        logger.debug("Token refresh failure recorded: provider={}, error_type={}", safeProvider, safeErrorType);
    }

    /**
     * Record Firestore operation failure with error details
     */
    public void recordFirestoreFailure(String collection, String operation, String errorType, long durationMs) {
        String safeCollection = collection != null ? collection : "unknown";
        String safeOperation = operation != null ? operation : "unknown";
        String safeErrorType = errorType != null ? errorType : "unknown";
        Tags tags = Tags.of(
            "collection", safeCollection,
            "operation", safeOperation,
            "error_type", safeErrorType
        );

        Counter.builder("app.firestore.failures")
                .tags(tags)
                .description("Number of Firestore operation failures")
                .register(meterRegistry)
                .increment();

        Timer.builder("app.firestore.failure.duration")
                .tags(tags)
                .description("Duration of failed Firestore operations")
                .register(meterRegistry)
                .record(durationMs, TimeUnit.MILLISECONDS);

        logger.debug("Firestore failure recorded: {} {} on {} - {} ({}ms)",
                    safeOperation, safeErrorType, safeCollection, safeErrorType, durationMs);
    }

    /**
     * Record profile operation failure
     */
    public void recordProfileOperationFailure(String operation, String errorType) {
        String safeOperation = operation != null ? operation : "unknown";
        String safeErrorType = errorType != null ? errorType : "unknown";
        Tags tags = Tags.of(
            "operation", safeOperation,
            "error_type", safeErrorType
        );

        Counter.builder("app.profiles.failures")
                .tags(tags)
                .description("Number of profile operation failures")
                .register(meterRegistry)
                .increment();

        logger.debug("Profile operation failure recorded: operation={}, error_type={}", safeOperation, safeErrorType);
    }

    /**
     * Record session operation failure
     */
    public void recordSessionOperationFailure(String operation, String errorType) {
        String safeOperation = operation != null ? operation : "unknown";
        String safeErrorType = errorType != null ? errorType : "unknown";
        Tags tags = Tags.of(
            "operation", safeOperation,
            "error_type", safeErrorType
        );

        Counter.builder("app.sessions.failures")
                .tags(tags)
                .description("Number of session operation failures")
                .register(meterRegistry)
                .increment();

        logger.debug("Session operation failure recorded: operation={}, error_type={}", safeOperation, safeErrorType);
    }

    // --- Token Operation Metrics ---

    /**
     * Record token refresh operation
     */
    public void recordTokenRefresh(String provider, String deviceType, String platform, boolean successful, long processingTimeMs) {
        String safeProvider = provider != null ? provider : "unknown";
        String safeDeviceType = deviceType != null ? deviceType : "unknown";
        String safePlatform = platform != null ? platform : "unknown";
        Tags tags = Tags.of(
            "provider", safeProvider,
            "device_type", safeDeviceType,
            "platform", safePlatform,
            "result", successful ? "success" : "failure"
        );

        Counter.builder("app.tokens.refresh.total")
                .tags(tags)
                .description("Number of token refresh operations")
                .register(meterRegistry)
                .increment();

        Timer.builder("app.tokens.refresh.time")
                .tags(tags)
                .description("Token refresh processing time")
                .register(meterRegistry)
                .record(processingTimeMs, TimeUnit.MILLISECONDS);

        logger.debug("Token refresh metric recorded: {} on {} - {} ({}ms)",
                    safeProvider, safePlatform, successful ? "success" : "failure", processingTimeMs);
    }

    /**
     * Record token revocation (logout)
     */
    public void recordTokenRevocation(String deviceType, String platform, String reason, boolean successful) {
        String safeDeviceType = deviceType != null ? deviceType : "unknown";
        String safePlatform = platform != null ? platform : "unknown";
        String safeReason = reason != null ? reason : "unknown";
        Tags tags = Tags.of(
            "device_type", safeDeviceType,
            "platform", safePlatform,
            "reason", safeReason,
            "result", successful ? "success" : "failure"
        );

        Counter.builder("app.tokens.revocation.total")
                .tags(tags)
                .description("Number of token revocation operations")
                .register(meterRegistry)
                .increment();

        logger.debug("Token revocation metric recorded: {} on {} - reason: {} - {}",
                    safeDeviceType, safePlatform, safeReason, successful ? "success" : "failure");
    }

    // --- User Profile Metrics ---

    /**
     * Record profile creation
     */
    public void recordProfileCreated(String userId, boolean successful, long processingTimeMs) {
        String safeUserId = userId != null ? userId : "unknown";
        Tags tags = Tags.of(
            "user_id", safeUserId,
            "result", successful ? "success" : "failure",
            "operation", "created"
        );

        Counter.builder("app.user.profiles.total")
                .tags(tags)
                .description("Number of user profile operations")
                .register(meterRegistry)
                .increment();

        Timer.builder("app.user.profiles.time")
                .tags(tags)
                .description("User profile operation processing time")
                .register(meterRegistry)
                .record(processingTimeMs, TimeUnit.MILLISECONDS);

        logger.debug("Profile creation metric recorded: user={} - {} ({}ms)",
                    safeUserId, successful ? "success" : "failure", processingTimeMs);
    }

    /**
     * Record profile update
     */
    public void recordProfileUpdated(String userId, boolean successful, long processingTimeMs) {
        String safeUserId = userId != null ? userId : "unknown";
        Tags tags = Tags.of(
            "user_id", safeUserId,
            "result", successful ? "success" : "failure",
            "operation", "updated"
        );

        Counter.builder("app.user.profiles.total")
                .tags(tags)
                .description("Number of user profile operations")
                .register(meterRegistry)
                .increment();

        Timer.builder("app.user.profiles.time")
                .tags(tags)
                .description("User profile operation processing time")
                .register(meterRegistry)
                .record(processingTimeMs, TimeUnit.MILLISECONDS);

        logger.debug("Profile update metric recorded: user={} - {} ({}ms)",
                    safeUserId, successful ? "success" : "failure", processingTimeMs);
    }

    /**
     * Record profile retrieval
     */
    public void recordProfileRetrieved(String userId, boolean found, long processingTimeMs) {
        String safeUserId = userId != null ? userId : "unknown";
        Tags tags = Tags.of(
            "user_id", safeUserId,
            "result", found ? "found" : "not_found",
            "operation", "retrieved"
        );

        Counter.builder("app.user.profiles.total")
                .tags(tags)
                .description("Number of user profile operations")
                .register(meterRegistry)
                .increment();

        Timer.builder("app.user.profiles.time")
                .tags(tags)
                .description("User profile operation processing time")
                .register(meterRegistry)
                .record(processingTimeMs, TimeUnit.MILLISECONDS);

        logger.debug("Profile retrieval metric recorded: user={} - {} ({}ms)",
                    safeUserId, found ? "found" : "not_found", processingTimeMs);
    }

    // --- GCS / Asset Metrics ---

    public void recordGcsOperation(String operation, boolean success, long durationMs) {
        String safeOperation = operation != null ? operation : "unknown";
        String status = success ? "success" : "error";

        Counter.builder("app.gcs.operations")
                .tags("operation", safeOperation, "status", status)
                .description("Number of GCS operations")
                .register(meterRegistry)
                .increment();

        Timer.builder("app.gcs.operation.duration")
                .tags("operation", safeOperation, "status", status)
                .description("Duration of GCS operations")
                .register(meterRegistry)
                .record(durationMs, TimeUnit.MILLISECONDS);

        logger.debug("GCS operation metric recorded: {} - {} ({}ms)", safeOperation, status, durationMs);
    }

    public void recordAssetSync(int assetsRequested, int assetsReturned, long durationMs) {
        Counter.builder("app.assets.sync.requests")
                .description("Number of asset sync requests")
                .register(meterRegistry)
                .increment();

        Timer.builder("app.assets.sync.duration")
                .description("Duration of asset sync operations")
                .register(meterRegistry)
                .record(durationMs, TimeUnit.MILLISECONDS);

        logger.debug("Asset sync metric recorded: requested={}, returned={}, duration={}ms",
                assetsRequested, assetsReturned, durationMs);
    }

}
