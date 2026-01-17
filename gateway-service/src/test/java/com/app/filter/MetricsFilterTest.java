package com.app.filter;

import com.app.service.ApplicationMetricsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

@ExtendWith(MockitoExtension.class)
class MetricsFilterTest {

    @Mock
    private ApplicationMetricsService mockMetricsService;

    @Mock
    private HttpServletRequest mockRequest;

    @Mock
    private HttpServletResponse mockResponse;

    @Mock
    private FilterChain mockFilterChain;

    private MetricsFilter metricsFilter;

    @BeforeEach
    void setUp() {
        metricsFilter = new MetricsFilter(mockMetricsService);
    }

    @Test
    void testDoFilter_SuccessfulRequest() throws IOException, ServletException {
        // Given
        when(mockRequest.getRequestURI()).thenReturn("/api/content");
        when(mockRequest.getMethod()).thenReturn("GET");
        when(mockResponse.getStatus()).thenReturn(200);

        // When
        metricsFilter.doFilter(mockRequest, mockResponse, mockFilterChain);

        // Then - filter chain receives wrapped response
        verify(mockFilterChain).doFilter(eq(mockRequest), any(HttpServletResponse.class));
        verify(mockMetricsService).incrementActiveConnections();
        verify(mockMetricsService).decrementActiveConnections();

        ArgumentCaptor<HttpServletRequest> requestCaptor = ArgumentCaptor.forClass(HttpServletRequest.class);
        ArgumentCaptor<Integer> statusCaptor = ArgumentCaptor.forClass(Integer.class);
        ArgumentCaptor<Long> timeCaptor = ArgumentCaptor.forClass(Long.class);

        verify(mockMetricsService).recordRequest(requestCaptor.capture(), statusCaptor.capture(), timeCaptor.capture());

        assertEquals(mockRequest, requestCaptor.getValue());
        assertEquals(200, statusCaptor.getValue());
        assertTrue(timeCaptor.getValue() >= 0);
    }

    @Test
    void testDoFilter_SkipsActuatorEndpoints() throws IOException, ServletException {
        // Given
        when(mockRequest.getRequestURI()).thenReturn("/actuator/health");

        // When
        metricsFilter.doFilter(mockRequest, mockResponse, mockFilterChain);

        // Then
        verify(mockFilterChain).doFilter(mockRequest, mockResponse);
        verify(mockMetricsService, never()).incrementActiveConnections();
        verify(mockMetricsService, never()).decrementActiveConnections();
        verify(mockMetricsService, never()).recordRequest(any(), anyInt(), anyLong());
    }

    @Test
    void testDoFilter_SkipsPrivateEndpoints() throws IOException, ServletException {
        // Given
        when(mockRequest.getRequestURI()).thenReturn("/private/status");

        // When
        metricsFilter.doFilter(mockRequest, mockResponse, mockFilterChain);

        // Then
        verify(mockFilterChain).doFilter(mockRequest, mockResponse);
        verify(mockMetricsService, never()).incrementActiveConnections();
        verify(mockMetricsService, never()).decrementActiveConnections();
        verify(mockMetricsService, never()).recordRequest(any(), anyInt(), anyLong());
    }

    @Test
    void testDoFilter_HandlesException() throws IOException, ServletException {
        // Given
        when(mockRequest.getRequestURI()).thenReturn("/api/content");
        when(mockRequest.getMethod()).thenReturn("GET");
        when(mockResponse.getStatus()).thenReturn(500);

        RuntimeException testException = new RuntimeException("Test exception");
        doThrow(testException).when(mockFilterChain).doFilter(eq(mockRequest), any(HttpServletResponse.class));

        // When & Then
        assertThrows(RuntimeException.class, () -> {
            metricsFilter.doFilter(mockRequest, mockResponse, mockFilterChain);
        });

        // Verify metrics were still recorded
        verify(mockMetricsService).incrementActiveConnections();
        verify(mockMetricsService).decrementActiveConnections();

        ArgumentCaptor<HttpServletRequest> requestCaptor = ArgumentCaptor.forClass(HttpServletRequest.class);
        ArgumentCaptor<String> errorTypeCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> errorCodeCaptor = ArgumentCaptor.forClass(String.class);

        verify(mockMetricsService).recordError(requestCaptor.capture(), errorTypeCaptor.capture(), errorCodeCaptor.capture());

        assertEquals(mockRequest, requestCaptor.getValue());
        assertEquals("RuntimeException", errorTypeCaptor.getValue());
        assertEquals("INTERNAL_ERROR", errorCodeCaptor.getValue());
    }

    @Test
    void testDoFilter_WithNonHttpRequest() throws IOException, ServletException {
        // Given - non-HTTP request/response
        jakarta.servlet.ServletRequest nonHttpRequest = mock(jakarta.servlet.ServletRequest.class);
        jakarta.servlet.ServletResponse nonHttpResponse = mock(jakarta.servlet.ServletResponse.class);

        // When
        metricsFilter.doFilter(nonHttpRequest, nonHttpResponse, mockFilterChain);

        // Then
        verify(mockFilterChain).doFilter(nonHttpRequest, nonHttpResponse);
        verify(mockMetricsService, never()).incrementActiveConnections();
        verify(mockMetricsService, never()).decrementActiveConnections();
        verify(mockMetricsService, never()).recordRequest(any(), anyInt(), anyLong());
    }

    @Test
    void testDoFilter_MeasuresResponseTime() throws IOException, ServletException {
        // Given
        when(mockRequest.getRequestURI()).thenReturn("/api/slow-endpoint");
        when(mockRequest.getMethod()).thenReturn("GET");
        when(mockResponse.getStatus()).thenReturn(200);

        // Simulate slow processing
        doAnswer(invocation -> {
            Thread.sleep(100); // 100ms delay
            return null;
        }).when(mockFilterChain).doFilter(eq(mockRequest), any(HttpServletResponse.class));

        // When
        long startTime = System.currentTimeMillis();
        metricsFilter.doFilter(mockRequest, mockResponse, mockFilterChain);
        long endTime = System.currentTimeMillis();

        // Then
        ArgumentCaptor<Long> timeCaptor = ArgumentCaptor.forClass(Long.class);
        verify(mockMetricsService).recordRequest(eq(mockRequest), eq(200), timeCaptor.capture());

        long recordedTime = timeCaptor.getValue();
        assertTrue(recordedTime >= 100, "Recorded time should be at least 100ms");
        assertTrue(recordedTime <= (endTime - startTime + 10), "Recorded time should be reasonable");
    }

    @Test
    void testDoFilter_HandlesIOException() throws IOException, ServletException {
        // Given
        when(mockRequest.getRequestURI()).thenReturn("/api/content");
        when(mockRequest.getMethod()).thenReturn("GET");
        when(mockResponse.getStatus()).thenReturn(500);

        IOException testException = new IOException("Network error");
        doThrow(testException).when(mockFilterChain).doFilter(eq(mockRequest), any(HttpServletResponse.class));

        // When & Then
        assertThrows(IOException.class, () -> {
            metricsFilter.doFilter(mockRequest, mockResponse, mockFilterChain);
        });

        // Verify error was recorded
        verify(mockMetricsService).recordError(mockRequest, "IOException", "INTERNAL_ERROR");

        // Verify connection tracking
        verify(mockMetricsService).incrementActiveConnections();
        verify(mockMetricsService).decrementActiveConnections();
    }

    @Test
    void testDoFilter_HandlesServletException() throws IOException, ServletException {
        // Given
        when(mockRequest.getRequestURI()).thenReturn("/api/content");
        when(mockRequest.getMethod()).thenReturn("GET");
        when(mockResponse.getStatus()).thenReturn(500);

        ServletException testException = new ServletException("Servlet error");
        doThrow(testException).when(mockFilterChain).doFilter(eq(mockRequest), any(HttpServletResponse.class));

        // When & Then
        assertThrows(ServletException.class, () -> {
            metricsFilter.doFilter(mockRequest, mockResponse, mockFilterChain);
        });

        // Verify error was recorded
        verify(mockMetricsService).recordError(mockRequest, "ServletException", "INTERNAL_ERROR");

        // Verify connection tracking
        verify(mockMetricsService).incrementActiveConnections();
        verify(mockMetricsService).decrementActiveConnections();
    }

    @Test
    void testDoFilter_MultipleRequests() throws IOException, ServletException {
        // Given
        when(mockRequest.getRequestURI()).thenReturn("/api/content");
        when(mockRequest.getMethod()).thenReturn("GET");
        when(mockResponse.getStatus()).thenReturn(200);

        // When - process multiple requests
        metricsFilter.doFilter(mockRequest, mockResponse, mockFilterChain);
        metricsFilter.doFilter(mockRequest, mockResponse, mockFilterChain);
        metricsFilter.doFilter(mockRequest, mockResponse, mockFilterChain);

        // Then - filter chain receives wrapped response
        verify(mockFilterChain, times(3)).doFilter(eq(mockRequest), any(HttpServletResponse.class));
        verify(mockMetricsService, times(3)).incrementActiveConnections();
        verify(mockMetricsService, times(3)).decrementActiveConnections();
        verify(mockMetricsService, times(3)).recordRequest(eq(mockRequest), eq(200), anyLong());
    }

    @Test
    void testDoFilter_DifferentStatusCodes() throws IOException, ServletException {
        // Given
        when(mockRequest.getRequestURI()).thenReturn("/api/content");
        when(mockRequest.getMethod()).thenReturn("GET");

        // Test 200 OK
        when(mockResponse.getStatus()).thenReturn(200);
        metricsFilter.doFilter(mockRequest, mockResponse, mockFilterChain);

        // Test 404 Not Found
        when(mockResponse.getStatus()).thenReturn(404);
        metricsFilter.doFilter(mockRequest, mockResponse, mockFilterChain);

        // Test 500 Internal Server Error
        when(mockResponse.getStatus()).thenReturn(500);
        metricsFilter.doFilter(mockRequest, mockResponse, mockFilterChain);

        // Then
        verify(mockMetricsService).recordRequest(eq(mockRequest), eq(200), anyLong());
        verify(mockMetricsService).recordRequest(eq(mockRequest), eq(404), anyLong());
        verify(mockMetricsService).recordRequest(eq(mockRequest), eq(500), anyLong());
    }

    @Test
    void testInit() throws ServletException {
        // Given
        jakarta.servlet.FilterConfig mockFilterConfig = mock(jakarta.servlet.FilterConfig.class);

        // When & Then - should not throw exception
        assertDoesNotThrow(() -> metricsFilter.init(mockFilterConfig));
    }

    @Test
    void testDestroy() {
        // When & Then - should not throw exception
        assertDoesNotThrow(() -> metricsFilter.destroy());
    }
}
