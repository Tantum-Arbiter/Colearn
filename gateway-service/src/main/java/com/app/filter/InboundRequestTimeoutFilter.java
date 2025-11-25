package com.app.filter;

import com.app.exception.ErrorCode;
import com.app.exception.ErrorResponse;
import com.app.testing.TestSimulationFlags;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.context.annotation.Profile;
import org.springframework.security.concurrent.DelegatingSecurityContextExecutorService;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.*;

/**
 * Enforces a global inbound request processing timeout.
 * Uses a small thread hand-off to enforce max processing time and returns GTW-504 on expiry.
 */
@Component
@Profile("!test")
@Order(2) // after RequestIdFilter and MetricsFilter
public class InboundRequestTimeoutFilter extends OncePerRequestFilter {
    private static final Logger logger = LoggerFactory.getLogger(InboundRequestTimeoutFilter.class);

    @Value("${performance.inbound.request-timeout-seconds:0}")
    private int inboundTimeoutSeconds;

    private final ObjectProvider<TestSimulationFlags> flagsProvider; // test-profile only, may be null
    private final ObjectMapper objectMapper;

    // Wrap executor with DelegatingSecurityContextExecutorService to propagate SecurityContext
    private final ExecutorService executor = new DelegatingSecurityContextExecutorService(
        Executors.newCachedThreadPool(r -> {
            Thread t = new Thread(r, "gw-inbound-timeout");
            t.setDaemon(true);
            return t;
        })
    );

    public InboundRequestTimeoutFilter(ObjectMapper objectMapper,
                                       ObjectProvider<TestSimulationFlags> flagsProvider) {
        this.objectMapper = objectMapper;
        this.flagsProvider = flagsProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        long thresholdMs = resolveThresholdMs();
        if (thresholdMs <= 0) {
            filterChain.doFilter(request, response);
            return;
        }

        var mdc = MDC.getCopyOfContextMap();
        Future<?> task = executor.submit(() -> {
            if (mdc != null) MDC.setContextMap(mdc);
            try {
                filterChain.doFilter(request, response);
            } finally {
                MDC.clear();
            }
            return null;
        });

        try {
            task.get(thresholdMs, TimeUnit.MILLISECONDS);
        } catch (java.util.concurrent.TimeoutException e) {
            task.cancel(true);
            // If nothing written yet, send 504 with GTW-504
            if (!response.isCommitted()) {
                String requestId = extractRequestId(request);
                logger.error("Inbound request timeout [requestId={}, method={}, path={}, thresholdMs={}]",
                        requestId, request.getMethod(), request.getRequestURI(), thresholdMs);
                writeTimeoutResponse(response, request, requestId);
            }
        } catch (ExecutionException ee) {
            // Bubble up underlying exception to standard handlers
            Throwable cause = ee.getCause() != null ? ee.getCause() : ee;
            if (cause instanceof ServletException se) throw se;
            if (cause instanceof IOException ioe) throw ioe;
            throw new ServletException(cause);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new ServletException(ie);
        }
    }

    private long resolveThresholdMs() {
        try {
            TestSimulationFlags flags = flagsProvider != null ? flagsProvider.getIfAvailable() : null;
            if (flags != null && flags.getInboundTimeoutMs() != null && flags.getInboundTimeoutMs() > 0) {
                return flags.getInboundTimeoutMs();
            }
        } catch (Exception ignored) { }
        return inboundTimeoutSeconds > 0 ? inboundTimeoutSeconds * 1000L : 0L;
    }

    private String extractRequestId(HttpServletRequest request) {
        try {
            Object attr = request.getAttribute(RequestIdFilter.ATTR_REQUEST_ID);
            String id = attr != null ? String.valueOf(attr) : request.getHeader(RequestIdFilter.HEADER_REQUEST_ID);
            if (id != null) {
                try { UUID.fromString(id); return id; } catch (Exception ignored) { }
            }
        } catch (Exception ignored) { }
        return UUID.randomUUID().toString();
    }

    private void writeTimeoutResponse(HttpServletResponse response, HttpServletRequest request, String requestId)
            throws IOException {
        response.setStatus(HttpServletResponse.SC_GATEWAY_TIMEOUT);
        response.setContentType("application/json");
        ErrorResponse body = new ErrorResponse();
        body.setSuccess(false);
        body.setErrorCode(ErrorCode.TIMEOUT_ERROR.getCode());
        body.setError(ErrorCode.TIMEOUT_ERROR.getDefaultMessage());
        body.setMessage("Request timeout");
        body.setPath(request.getRequestURI());
        body.setTimestamp(Instant.now().toString());
        body.setRequestId(requestId);
        body.setDetails(null);
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}

