package com.app.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerAllErrorCodesTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler(null); // metrics optional in handler
    }

    @Test
    void allErrorCodes_areMappedWithExpectedHttpStatus_andReturnedInBody() {
        String rid = java.util.UUID.randomUUID().toString();
        for (ErrorCode code : ErrorCode.values()) {
            MockHttpServletRequest request = new MockHttpServletRequest("GET", "/_test/error-code/" + code.getCode());
            request.setAttribute(com.app.filter.RequestIdFilter.ATTR_REQUEST_ID, rid);
            RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));

            GatewayException ex = new GatewayException(code, "test-message");
            var response = handler.handleGatewayException(ex, request);

            assertNotNull(response.getBody(), () -> "Body null for code " + code.getCode());
            assertEquals(code.getCode(), response.getBody().getErrorCode(), () -> "Wrong errorCode in body for " + code.getCode());
            assertEquals(code.getHttpStatusCode(), response.getStatusCode().value(), () -> "Wrong HTTP status for " + code.getCode());
            assertEquals(rid, response.getBody().getRequestId(), "RequestId should be propagated");
            assertFalse(response.getBody().isSuccess());
        }
    }
}

