package com.app.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class RequestIdFilterTest {

    @Test
    void generatesUuidWhenMissing() throws ServletException, IOException {
        RequestIdFilter filter = new RequestIdFilter();
        MockHttpServletRequest req = new MockHttpServletRequest();
        MockHttpServletResponse resp = new MockHttpServletResponse();
        FilterChain chain = new MockFilterChain();

        filter.doFilter(req, resp, chain);

        String header = resp.getHeader(RequestIdFilter.HEADER_REQUEST_ID);
        assertNotNull(header);
        assertDoesNotThrow(() -> UUID.fromString(header));
        assertEquals(header, req.getAttribute(RequestIdFilter.ATTR_REQUEST_ID));
    }

    @Test
    void preservesValidIncomingUuid() throws ServletException, IOException {
        RequestIdFilter filter = new RequestIdFilter();
        MockHttpServletRequest req = new MockHttpServletRequest();
        MockHttpServletResponse resp = new MockHttpServletResponse();
        FilterChain chain = new MockFilterChain();

        String provided = UUID.randomUUID().toString();
        req.addHeader(RequestIdFilter.HEADER_REQUEST_ID, provided);

        filter.doFilter(req, resp, chain);

        String header = resp.getHeader(RequestIdFilter.HEADER_REQUEST_ID);
        assertEquals(provided, header);
        assertEquals(provided, req.getAttribute(RequestIdFilter.ATTR_REQUEST_ID));
    }

    @Test
    void replacesInvalidIncomingId() throws ServletException, IOException {
        RequestIdFilter filter = new RequestIdFilter();
        MockHttpServletRequest req = new MockHttpServletRequest();
        MockHttpServletResponse resp = new MockHttpServletResponse();
        FilterChain chain = new MockFilterChain();

        req.addHeader(RequestIdFilter.HEADER_REQUEST_ID, "not-a-uuid");

        filter.doFilter(req, resp, chain);

        String header = resp.getHeader(RequestIdFilter.HEADER_REQUEST_ID);
        assertNotNull(header);
        assertDoesNotThrow(() -> UUID.fromString(header));
        assertNotEquals("not-a-uuid", header);
    }
}

