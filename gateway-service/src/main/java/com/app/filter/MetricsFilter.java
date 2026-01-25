package com.app.filter;

import com.app.service.ApplicationMetricsService;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.WriteListener;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.concurrent.atomic.AtomicLong;

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

        String requestURI = httpRequest.getRequestURI();
        if (requestURI.startsWith("/actuator") ||
            requestURI.startsWith("/private") ||
            requestURI.startsWith("/health") ||
            requestURI.startsWith("/metrics") ||
            requestURI.startsWith("/prometheus")) {
            chain.doFilter(request, response);
            return;
        }

        long startTime = System.currentTimeMillis();
        ResponseSizeWrapper responseWrapper = new ResponseSizeWrapper(httpResponse);
        metricsService.incrementActiveConnections();

        try {
            chain.doFilter(request, responseWrapper);
        } catch (Exception e) {
            String errorType = e.getClass().getSimpleName();
            String errorCode = "INTERNAL_ERROR";
            metricsService.recordError(httpRequest, errorType, errorCode);

            logger.error("Error processing request: {}", e.getMessage(), e);
            throw e;
        } finally {
            long responseTime = System.currentTimeMillis() - startTime;
            int statusCode = responseWrapper.getStatus();
            metricsService.recordRequest(httpRequest, statusCode, responseTime);

            long responseSize = responseWrapper.getResponseSize();
            if (responseSize > 0) {
                metricsService.recordResponseSize(requestURI, httpRequest.getMethod(), responseSize);
            }

            metricsService.decrementActiveConnections();

            logger.debug("Request processed: {} {} - Status: {} - Time: {}ms - Size: {} bytes",
                        httpRequest.getMethod(),
                        httpRequest.getRequestURI(),
                        statusCode,
                        responseTime,
                        responseSize);
        }
    }

    @Override
    public void destroy() {
        logger.info("Destroying MetricsFilter");
    }

    private static class ResponseSizeWrapper extends HttpServletResponseWrapper {
        private final AtomicLong bytesWritten = new AtomicLong(0);
        private CountingServletOutputStream countingOutputStream;
        private PrintWriter writer;

        public ResponseSizeWrapper(HttpServletResponse response) {
            super(response);
        }

        @Override
        public ServletOutputStream getOutputStream() throws IOException {
            if (countingOutputStream == null) {
                countingOutputStream = new CountingServletOutputStream(super.getOutputStream(), bytesWritten);
            }
            return countingOutputStream;
        }

        @Override
        public PrintWriter getWriter() throws IOException {
            if (writer == null) {
                writer = new CountingPrintWriter(super.getWriter(), bytesWritten);
            }
            return writer;
        }

        public long getResponseSize() {
            return bytesWritten.get();
        }
    }

    private static class CountingServletOutputStream extends ServletOutputStream {
        private final ServletOutputStream delegate;
        private final AtomicLong bytesWritten;

        public CountingServletOutputStream(ServletOutputStream delegate, AtomicLong bytesWritten) {
            this.delegate = delegate;
            this.bytesWritten = bytesWritten;
        }

        @Override
        public void write(int b) throws IOException {
            delegate.write(b);
            bytesWritten.incrementAndGet();
        }

        @Override
        public void write(byte[] b) throws IOException {
            delegate.write(b);
            bytesWritten.addAndGet(b.length);
        }

        @Override
        public void write(byte[] b, int off, int len) throws IOException {
            delegate.write(b, off, len);
            bytesWritten.addAndGet(len);
        }

        @Override
        public boolean isReady() {
            return delegate.isReady();
        }

        @Override
        public void setWriteListener(WriteListener writeListener) {
            delegate.setWriteListener(writeListener);
        }

        @Override
        public void flush() throws IOException {
            delegate.flush();
        }

        @Override
        public void close() throws IOException {
            delegate.close();
        }
    }

    private static class CountingPrintWriter extends PrintWriter {
        private final AtomicLong bytesWritten;

        public CountingPrintWriter(PrintWriter delegate, AtomicLong bytesWritten) {
            super(delegate);
            this.bytesWritten = bytesWritten;
        }

        @Override
        public void write(int c) {
            super.write(c);
            bytesWritten.incrementAndGet();
        }

        @Override
        public void write(char[] buf, int off, int len) {
            super.write(buf, off, len);
            bytesWritten.addAndGet(len);
        }

        @Override
        public void write(String s, int off, int len) {
            super.write(s, off, len);
            bytesWritten.addAndGet(len);
        }
    }
}
