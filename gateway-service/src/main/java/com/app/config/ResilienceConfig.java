package com.app.config;

import com.app.service.ApplicationMetricsService;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.micrometer.tagged.TaggedCircuitBreakerMetrics;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Configuration;
import io.micrometer.core.instrument.MeterRegistry;

@Configuration
public class ResilienceConfig {
    private static final Logger logger = LoggerFactory.getLogger(ResilienceConfig.class);

    private final CircuitBreakerRegistry circuitBreakerRegistry;
    private final MeterRegistry meterRegistry;
    private final ApplicationMetricsService metricsService;

    public ResilienceConfig(CircuitBreakerRegistry circuitBreakerRegistry,
                            MeterRegistry meterRegistry,
                            ApplicationMetricsService metricsService) {
        this.circuitBreakerRegistry = circuitBreakerRegistry;
        this.meterRegistry = meterRegistry;
        this.metricsService = metricsService;
    }

    @PostConstruct
    public void init() {
        // Ensure instances exist
        CircuitBreaker defaultCb = circuitBreakerRegistry.circuitBreaker("default");
        CircuitBreaker cmsCb = circuitBreakerRegistry.circuitBreaker("cms");

        // Bind Micrometer metrics for all circuit breakers
        try {
            TaggedCircuitBreakerMetrics.ofCircuitBreakerRegistry(circuitBreakerRegistry).bindTo(meterRegistry);
        } catch (Exception e) {
            logger.warn("Failed to bind Resilience4j metrics: {}", e.getMessage());
        }

        // Register event listeners -> custom app metrics
        registerListeners(defaultCb);
        registerListeners(cmsCb);
    }

    private void registerListeners(CircuitBreaker cb) {
        cb.getEventPublisher()
            .onSuccess(event -> metricsService.recordCircuitBreakerCall(cb.getName(), "success"))
            .onError(event -> metricsService.recordCircuitBreakerCall(cb.getName(), "failure"))
            .onCallNotPermitted(event -> metricsService.recordCircuitBreakerCall(cb.getName(), "rejected"))
            .onStateTransition(event -> metricsService.recordCircuitBreakerStateTransition(
                    cb.getName(),
                    event.getStateTransition().getFromState().name(),
                    event.getStateTransition().getToState().name()
            ));
    }
}

