package com.app.filter;

import com.app.service.ApplicationMetricsService;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Metrics Filter
 * Automatically captures metrics for all HTTP requests
 */
@Component
@Order(1) // Execute early in the filter chain
public class MetricsFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(MetricsFilter.class);

    private final ApplicationMetricsService metricsService;

    public MetricsFilter(ApplicationMetricsService metricsService) {
        this.metricsService = metricsService;
    }

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        logger.info("Initializing MetricsFilter");
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        if (!(request instanceof HttpServletRequest) || !(response instanceof HttpServletResponse)) {
            chain.doFilter(request, response);
            return;
        }

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // Skip metrics collection for actuator endpoints to avoid noise
        String requestURI = httpRequest.getRequestURI();
        if (requestURI.startsWith("/actuator") || requestURI.startsWith("/private")) {
            chain.doFilter(request, response);
            return;
        }

        long startTime = System.currentTimeMillis();
        
        // Increment active connections
        metricsService.incrementActiveConnections();
        
        try {
            // Continue with the request
            chain.doFilter(request, response);
        } catch (Exception e) {
            // Record error metrics
            String errorType = e.getClass().getSimpleName();
            String errorCode = "INTERNAL_ERROR";
            metricsService.recordError(httpRequest, errorType, errorCode);
            
            logger.error("Error processing request: {}", e.getMessage(), e);
            throw e;
        } finally {
            // Calculate response time
            long responseTime = System.currentTimeMillis() - startTime;
            
            // Record request metrics
            int statusCode = httpResponse.getStatus();
            metricsService.recordRequest(httpRequest, statusCode, responseTime);
            
            // Decrement active connections
            metricsService.decrementActiveConnections();
            
            // Log request details (debug level)
            logger.debug("Request processed: {} {} - Status: {} - Time: {}ms", 
                        httpRequest.getMethod(), 
                        httpRequest.getRequestURI(), 
                        statusCode, 
                        responseTime);
        }
    }

    @Override
    public void destroy() {
        logger.info("Destroying MetricsFilter");
    }
}
