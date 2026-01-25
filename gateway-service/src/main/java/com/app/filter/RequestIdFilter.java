package com.app.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

@Component
@Order(0) // Must run before other filters (e.g., metrics)
public class RequestIdFilter implements Filter {
    private static final Logger logger = LoggerFactory.getLogger(RequestIdFilter.class);

    public static final String HEADER_REQUEST_ID = "X-Request-Id";
    public static final String ATTR_REQUEST_ID = "requestId";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (!(request instanceof HttpServletRequest) || !(response instanceof HttpServletResponse)) {
            chain.doFilter(request, response);
            return;
        }
        HttpServletRequest httpReq = (HttpServletRequest) request;
        HttpServletResponse httpResp = (HttpServletResponse) response;

        String incoming = httpReq.getHeader(HEADER_REQUEST_ID);
        String requestId = validateUuid(incoming) ? incoming : UUID.randomUUID().toString();

        httpReq.setAttribute(ATTR_REQUEST_ID, requestId);
        httpResp.setHeader(HEADER_REQUEST_ID, requestId);
        MDC.put("requestId", requestId);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove("requestId");
        }
    }

    private boolean validateUuid(String value) {
        if (value == null || value.isBlank()) return false;
        try {
            UUID.fromString(value);
            return true;
        } catch (Exception e) {
            logger.debug("Invalid X-Request-Id '{}', generating a new UUID", value);
            return false;
        }
    }
}

