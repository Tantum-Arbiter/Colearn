package com.app.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringReader;
import java.util.Collections;
import java.util.Enumeration;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RequestValidationFilterTest {

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @Mock
    private PrintWriter printWriter;

    private RequestValidationFilter requestValidationFilter;

    @BeforeEach
    void setUp() throws IOException {
        requestValidationFilter = new RequestValidationFilter();
    }

    @Test
    void doFilterInternal_WithValidRequest_ShouldAllowRequest() throws ServletException, IOException {
        // Given
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getQueryString()).thenReturn("param=value");
        when(request.getContentLength()).thenReturn(100);
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");
        when(request.getHeaderNames()).thenReturn(Collections.enumeration(Collections.singletonList("User-Agent")));
        when(request.getHeaders("User-Agent")).thenReturn(Collections.enumeration(Collections.singletonList("Mozilla/5.0")));

        // When
        requestValidationFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(filterChain).doFilter(any(), eq(response));
        verify(response, never()).setStatus(HttpServletResponse.SC_BAD_REQUEST);
    }

    @Test
    void doFilterInternal_WithSqlInjectionInUrl_ShouldBlockRequest() throws ServletException, IOException {
        // Given
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getQueryString()).thenReturn("id=1' OR 1=1--");
        when(request.getContentLength()).thenReturn(50);
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");
        when(request.getHeaderNames()).thenReturn(Collections.enumeration(Collections.singletonList("User-Agent")));
        when(request.getHeaders("User-Agent")).thenReturn(Collections.enumeration(Collections.singletonList("Mozilla/5.0")));
        when(response.getWriter()).thenReturn(printWriter);

        // When
        requestValidationFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
        verify(response).setContentType("application/json");
        verify(printWriter).write(contains("Suspicious URL or parameters detected"));
        verify(filterChain, never()).doFilter(any(), eq(response));
    }

    @Test
    void doFilterInternal_WithXssInQueryString_ShouldBlockRequest() throws ServletException, IOException {
        // Given
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getQueryString()).thenReturn("comment=<script>alert('xss')</script>");
        when(request.getContentLength()).thenReturn(50);
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");
        when(response.getWriter()).thenReturn(printWriter);

        // When
        requestValidationFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
        verify(response).setContentType("application/json");
        verify(printWriter).write(contains("Suspicious URL or parameters detected"));
        verify(filterChain, never()).doFilter(any(), eq(response));
    }

    @Test
    void doFilterInternal_WithPathTraversalInUrl_ShouldBlockRequest() throws ServletException, IOException {
        // Given
        when(request.getRequestURI()).thenReturn("/api/../../../etc/passwd");
        when(request.getQueryString()).thenReturn(null);
        when(request.getContentLength()).thenReturn(50);
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");
        when(response.getWriter()).thenReturn(printWriter);

        // When
        requestValidationFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
        verify(response).setContentType("application/json");
        verify(printWriter).write(contains("Suspicious URL or parameters detected"));
        verify(filterChain, never()).doFilter(any(), eq(response));
    }

    @Test
    void doFilterInternal_WithCommandInjectionInQueryString_ShouldBlockRequest() throws ServletException, IOException {
        // Given
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getQueryString()).thenReturn("cmd=ls; rm -rf /");
        when(request.getContentLength()).thenReturn(50);
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");
        when(response.getWriter()).thenReturn(printWriter);

        // When
        requestValidationFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
        verify(response).setContentType("application/json");
        verify(printWriter).write(contains("Suspicious URL or parameters detected"));
        verify(filterChain, never()).doFilter(any(), eq(response));
    }

    @Test
    void doFilterInternal_WithLargeRequestBody_ShouldBlockRequest() throws ServletException, IOException {
        // Given
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getQueryString()).thenReturn(null);
        when(request.getContentLength()).thenReturn(11 * 1024 * 1024); // 11MB > 10MB limit
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");
        when(response.getWriter()).thenReturn(printWriter);

        // When
        requestValidationFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(response).setStatus(HttpServletResponse.SC_REQUEST_ENTITY_TOO_LARGE);
        verify(response).setContentType("application/json");
        verify(printWriter).write(contains("Request payload too large"));
        verify(filterChain, never()).doFilter(any(), eq(response));
    }

    @Test
    void doFilterInternal_WithSuspiciousUserAgent_ShouldBlockRequest() throws ServletException, IOException {
        // Given
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getQueryString()).thenReturn(null);
        when(request.getContentLength()).thenReturn(50);
        when(request.getHeader("User-Agent")).thenReturn("sqlmap/1.0");
        when(response.getWriter()).thenReturn(printWriter);

        // When
        requestValidationFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN); // 403 for security violations
        verify(response).setContentType("application/json");
        verify(printWriter).write(contains("Suspicious user agent detected"));
        verify(filterChain, never()).doFilter(any(), eq(response));
    }

    @Test
    void doFilterInternal_WithMissingUserAgent_ShouldAllowButWarn() throws ServletException, IOException {
        // Given
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getQueryString()).thenReturn(null);
        when(request.getContentLength()).thenReturn(50);
        when(request.getHeader("User-Agent")).thenReturn(null);

        // When
        requestValidationFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(filterChain).doFilter(any(), eq(response));
        verify(response, never()).setStatus(HttpServletResponse.SC_BAD_REQUEST);
    }

    @Test
    void doFilterInternal_WithSuspiciousHeaders_ShouldBlockRequest() throws ServletException, IOException {
        // Given - use X-Custom-Header which is NOT in the GCP infrastructure whitelist
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getQueryString()).thenReturn(null);
        when(request.getContentLength()).thenReturn(50);
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");
        when(request.getHeaderNames()).thenReturn(Collections.enumeration(
            java.util.Arrays.asList("User-Agent", "X-Custom-Header")));
        when(request.getHeaders("X-Custom-Header")).thenReturn(Collections.enumeration(
            Collections.singletonList("192.168.1.1' OR 1=1--")));
        when(response.getWriter()).thenReturn(printWriter);

        // When
        requestValidationFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
        verify(response).setContentType("application/json");
        verify(printWriter).write(contains("Suspicious headers detected"));
        verify(filterChain, never()).doFilter(any(), eq(response));
    }

    @Test
    void doFilterInternal_WithSuspiciousRequestBody_ShouldBlockRequest() throws ServletException, IOException {
        // Given
        String suspiciousBody = "{\"query\": \"SELECT * FROM users WHERE id = 1 OR 1=1\"}";
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getQueryString()).thenReturn(null);
        when(request.getContentLength()).thenReturn(suspiciousBody.length());
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");
        when(request.getReader()).thenReturn(new BufferedReader(new StringReader(suspiciousBody)));
        when(response.getWriter()).thenReturn(printWriter);

        // When
        requestValidationFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
        verify(response).setContentType("application/json");
        verify(printWriter).write(contains("Suspicious request body detected"));
        verify(filterChain, never()).doFilter(any(), eq(response));
    }

    @Test
    void doFilterInternal_WithValidRequestBody_ShouldAllowRequest() throws ServletException, IOException {
        // Given
        String validBody = "{\"name\": \"John Doe\", \"email\": \"john@example.com\"}";
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getQueryString()).thenReturn(null);
        when(request.getContentLength()).thenReturn(validBody.length());
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");
        when(request.getHeaderNames()).thenReturn(Collections.enumeration(Collections.singletonList("User-Agent")));
        when(request.getHeaders("User-Agent")).thenReturn(Collections.enumeration(Collections.singletonList("Mozilla/5.0")));
        when(request.getReader()).thenReturn(new BufferedReader(new StringReader(validBody)));

        // When
        requestValidationFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(filterChain).doFilter(any(), eq(response));
        verify(response, never()).setStatus(HttpServletResponse.SC_BAD_REQUEST);
    }

    @Test
    void doFilterInternal_WithLdapInjectionInQueryString_ShouldBlockRequest() throws ServletException, IOException {
        // Given
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getQueryString()).thenReturn("filter=(&(uid=*)(password=*))");
        when(request.getContentLength()).thenReturn(50);
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");
        when(response.getWriter()).thenReturn(printWriter);

        // When
        requestValidationFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
        verify(response).setContentType("application/json");
        verify(printWriter).write(contains("Suspicious URL or parameters detected"));
        verify(filterChain, never()).doFilter(any(), eq(response));
    }

    @Test
    void doFilterInternal_WithMultipleSuspiciousPatterns_ShouldBlockRequest() throws ServletException, IOException {
        // Given
        when(request.getRequestURI()).thenReturn("/api/../test");
        when(request.getQueryString()).thenReturn("id=1' UNION SELECT * FROM users--");
        when(request.getContentLength()).thenReturn(50);
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");
        when(response.getWriter()).thenReturn(printWriter);

        // When
        requestValidationFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
        verify(response).setContentType("application/json");
        verify(printWriter).write(contains("Suspicious URL or parameters detected"));
        verify(filterChain, never()).doFilter(any(), eq(response));
    }

    @Test
    void doFilterInternal_WithEmptyQueryString_ShouldAllowRequest() throws ServletException, IOException {
        // Given
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getQueryString()).thenReturn("");
        when(request.getContentLength()).thenReturn(0);
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");
        when(request.getHeaderNames()).thenReturn(Collections.enumeration(Collections.singletonList("User-Agent")));
        when(request.getHeaders("User-Agent")).thenReturn(Collections.enumeration(Collections.singletonList("Mozilla/5.0")));

        // When
        requestValidationFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(filterChain).doFilter(any(), eq(response));
        verify(response, never()).setStatus(HttpServletResponse.SC_BAD_REQUEST);
    }

    @Test
    void doFilterInternal_WithNullQueryString_ShouldAllowRequest() throws ServletException, IOException {
        // Given
        when(request.getRequestURI()).thenReturn("/api/test");
        when(request.getQueryString()).thenReturn(null);
        when(request.getContentLength()).thenReturn(0);
        when(request.getHeader("User-Agent")).thenReturn("Mozilla/5.0");
        when(request.getHeaderNames()).thenReturn(Collections.enumeration(Collections.singletonList("User-Agent")));
        when(request.getHeaders("User-Agent")).thenReturn(Collections.enumeration(Collections.singletonList("Mozilla/5.0")));

        // When
        requestValidationFilter.doFilterInternal(request, response, filterChain);

        // Then
        verify(filterChain).doFilter(any(), eq(response));
        verify(response, never()).setStatus(HttpServletResponse.SC_BAD_REQUEST);
    }
}
