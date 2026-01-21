package com.app.config;

import com.app.service.ApplicationMetricsService;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.assertEquals;

class JwtConfigTest {

    private ApplicationMetricsService metricsService;

    @BeforeEach
    void setUp() {
        metricsService = new ApplicationMetricsService(new SimpleMeterRegistry());
    }

    @Test
    void jwtConfig_ShouldInstantiate() {
        // When
        JwtConfig jwtConfig = new JwtConfig(new MockEnvironment(), new RestTemplate(), metricsService);

        // Then
        assertNotNull(jwtConfig);
    }

    @Test
    void getJwtExpirationInSeconds_ShouldReturnDefaultValue() {
        // Given
        JwtConfig jwtConfig = new JwtConfig(new MockEnvironment(), new RestTemplate(), metricsService);

        // When
        int expiration = jwtConfig.getJwtExpirationInSeconds();

        // Then - Without Spring context, @Value won't be injected, so it returns 0
        assertEquals(0, expiration);
    }

    @Test
    void getRefreshExpirationInSeconds_ShouldReturnDefaultValue() {
        // Given
        JwtConfig jwtConfig = new JwtConfig(new MockEnvironment(), new RestTemplate(), metricsService);

        // When
        int expiration = jwtConfig.getRefreshExpirationInSeconds();

        // Then - Without Spring context, @Value won't be injected, so it returns 0
        assertEquals(0, expiration);
    }
}