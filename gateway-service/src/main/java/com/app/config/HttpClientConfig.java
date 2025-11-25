package com.app.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Duration;

@Configuration
public class HttpClientConfig {

    @Value("${performance.connection.default-timeout-seconds:1}")
    private int defaultTimeoutSeconds;

    @Bean(name = "defaultRestTemplate")
    public RestTemplate defaultRestTemplate(RestTemplateBuilder builder) {
        Duration timeout = Duration.ofSeconds(Math.max(1, defaultTimeoutSeconds));
        return builder
                .setConnectTimeout(timeout)
                .setReadTimeout(timeout)
                .additionalInterceptors(requestIdInterceptor())
                .build();
    }

    private ClientHttpRequestInterceptor requestIdInterceptor() {
        return (request, body, execution) -> {
            String rid = currentRequestId();
            if (rid != null && !rid.isBlank()) {
                request.getHeaders().set("X-Request-Id", rid);
            }
            return execution.execute(request, body);
        };
    }

    private String currentRequestId() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return null;
            HttpServletRequest req = attrs.getRequest();
            Object attr = req.getAttribute("requestId");
            String id = attr != null ? String.valueOf(attr) : req.getHeader("X-Request-Id");
            try { java.util.UUID.fromString(id); return id; } catch (Exception ignored) { }
            return null;
        } catch (Exception ignored) {
            return null;
        }
    }
}
