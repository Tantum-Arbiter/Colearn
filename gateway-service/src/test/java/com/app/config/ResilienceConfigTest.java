package com.app.config;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import com.app.service.GatewayServiceApplication;
import org.springframework.test.context.ActiveProfiles;

import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = GatewayServiceApplication.class)
@ActiveProfiles("test")
class ResilienceConfigTest {

    @Autowired
    CircuitBreakerRegistry circuitBreakerRegistry;

    @Autowired
    MeterRegistry meterRegistry;

    @Test
    void circuitBreakersAreRegistered() {
        assertNotNull(circuitBreakerRegistry);
        Set<String> names = circuitBreakerRegistry.getAllCircuitBreakers()
                .stream().map(CircuitBreaker::getName).collect(Collectors.toSet());
        assertTrue(names.contains("default"), "default circuit breaker not registered");
    }
}

