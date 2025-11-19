package com.app.config;

import io.micrometer.prometheusmetrics.PrometheusConfig;
import io.micrometer.prometheusmetrics.PrometheusMeterRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Test-only metrics configuration to ensure a PrometheusMeterRegistry is available
 * even when observability auto-configuration is disabled by Spring Boot test customizers.
 */
@Configuration
@Profile("test")
public class TestMetricsConfig {

    @Bean
    public PrometheusMeterRegistry prometheusMeterRegistry() {
        return new PrometheusMeterRegistry(PrometheusConfig.DEFAULT);
    }
}

