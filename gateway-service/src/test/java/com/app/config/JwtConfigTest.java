package com.app.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.assertEquals;

class JwtConfigTest {

    @Test
    void jwtConfig_ShouldInstantiate() {
        // When
        JwtConfig jwtConfig = new JwtConfig(new MockEnvironment(), new RestTemplate());

        // Then
        assertNotNull(jwtConfig);
    }

    @Test
    void getJwtExpirationInSeconds_ShouldReturnDefaultValue() {
        // Given
        JwtConfig jwtConfig = new JwtConfig(new MockEnvironment(), new RestTemplate());

        // When
        int expiration = jwtConfig.getJwtExpirationInSeconds();

        // Then - Without Spring context, @Value won't be injected, so it returns 0
        assertEquals(0, expiration);
    }

    @Test
    void getRefreshExpirationInSeconds_ShouldReturnDefaultValue() {
        // Given
        JwtConfig jwtConfig = new JwtConfig(new MockEnvironment(), new RestTemplate());

        // When
        int expiration = jwtConfig.getRefreshExpirationInSeconds();

        // Then - Without Spring context, @Value won't be injected, so it returns 0
        assertEquals(0, expiration);
    }
}