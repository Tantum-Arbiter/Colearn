package com.app.exception;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerLogTest {

    private Logger logger;
    private ListAppender<ILoggingEvent> appender;

    @BeforeEach
    void setUp() {
        logger = (Logger) LoggerFactory.getLogger(GlobalExceptionHandler.class);
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
    }

    @AfterEach
    void tearDown() {
        if (logger != null && appender != null) {
            logger.detachAppender(appender);
            appender.stop();
        }
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void handleGenericException_logsWithoutStackTrace_andIncludesContextAndCode() {
        // Arrange
        String rid = java.util.UUID.randomUUID().toString();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/test");
        request.setAttribute(com.app.filter.RequestIdFilter.ATTR_REQUEST_ID, rid);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        GlobalExceptionHandler handler = new GlobalExceptionHandler(null);

        // Act
        var response = handler.handleGenericException(new RuntimeException("boom"), request);

        // Assert response contains the same requestId
        assertNotNull(response.getBody());
        assertEquals(rid, response.getBody().getRequestId());
        assertEquals(500, response.getStatusCode().value());
        assertEquals("GTW-500", response.getBody().getErrorCode());

        // Assert last log has no throwable and contains method/path and code
        assertFalse(appender.list.isEmpty());
        ILoggingEvent event = appender.list.get(appender.list.size() - 1);
        assertEquals(Level.ERROR, event.getLevel());
        assertNull(event.getThrowableProxy(), "Log entry should not include stack trace");
        String msg = event.getFormattedMessage();
        assertTrue(msg.contains("requestId=" + rid));
        assertTrue(msg.contains("method=GET"));
        assertTrue(msg.contains("path=/api/test"));
        assertTrue(msg.contains("code=GTW-500"));
    }

    @Test
    void handleGatewayException_usesRequestIdFromFilter_andNoStackTraceInLogs() {
        // Arrange
        String rid = java.util.UUID.randomUUID().toString();
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/users/profile");
        request.setAttribute(com.app.filter.RequestIdFilter.ATTR_REQUEST_ID, rid);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        GlobalExceptionHandler handler = new GlobalExceptionHandler(null);
        GatewayException ex = new GatewayException(ErrorCode.INTERNAL_SERVER_ERROR, "failure");

        // Act
        var response = handler.handleGatewayException(ex, request);

        // Assert response contains provided requestId
        assertNotNull(response.getBody());
        assertEquals(rid, response.getBody().getRequestId());
        assertEquals("GTW-500", response.getBody().getErrorCode());

        // Assert last log has no throwable and includes method/path
        assertFalse(appender.list.isEmpty());
        ILoggingEvent event = appender.list.get(appender.list.size() - 1);
        assertNull(event.getThrowableProxy(), "Log entry should not include stack trace");
        String msg = event.getFormattedMessage();
        assertTrue(msg.contains("requestId=" + rid));
        assertTrue(msg.contains("method=POST"));
        assertTrue(msg.contains("/api/users/profile"));
    }

    @Test
    void handleMissingParameter_warnsWithoutStackTrace_andIncludesContext() throws Exception {
        // Arrange
        String rid = java.util.UUID.randomUUID().toString();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/alpha");
        request.setAttribute(com.app.filter.RequestIdFilter.ATTR_REQUEST_ID, rid);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

        GlobalExceptionHandler handler = new GlobalExceptionHandler(null);
        MissingServletRequestParameterException ex = new MissingServletRequestParameterException("name", "String");

        // Act
        var response = handler.handleMissingParameterException(ex, request);

        // Assert HTTP and body
        assertEquals(400, response.getStatusCode().value());
        assertEquals("GTW-101", response.getBody().getErrorCode());

        // Assert last log entry
        assertFalse(appender.list.isEmpty());
        ILoggingEvent event = appender.list.get(appender.list.size() - 1);
        assertEquals(Level.WARN, event.getLevel());
        assertNull(event.getThrowableProxy(), "Log entry should not include stack trace");
        String msg = event.getFormattedMessage();
        assertTrue(msg.contains("requestId=" + rid));
        assertTrue(msg.contains("method=GET"));
        assertTrue(msg.contains("path=/api/alpha"));
    }
}

