package com.app.config;

import com.app.service.ApplicationMetricsService;
import com.auth0.jwt.exceptions.JWTVerificationException;
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

    private JwtConfig withSecret(String secret) {
        JwtConfig jwtConfig = new JwtConfig(new MockEnvironment(), new RestTemplate(), metricsService);
        org.springframework.test.util.ReflectionTestUtils.setField(jwtConfig, "jwtSecret", secret);
        return jwtConfig;
    }

    @org.junit.jupiter.params.ParameterizedTest(name = "refuses to start with a secret that is {0}")
    @org.junit.jupiter.params.provider.CsvSource({
            "the committed placeholder, default-secret-change-in-production",
            "blank, ''",
            "only spaces, '   '",
            "shorter than 32 characters, only-twenty-nine-characters-x",
    })
    void refusesToStartWithAWeakOrKnownSecret(String ignored, String secret) {
        JwtConfig jwtConfig = withSecret(secret);

        IllegalStateException refusal = assertThrows(IllegalStateException.class, jwtConfig::verifySecret);
        if (!secret.isBlank()) {
            assertFalse(refusal.getMessage().contains(secret.trim()), "the refusal must not echo the secret");
        }
    }

    @Test
    void refusesToStartWithNoSecretAtAll() {
        assertThrows(IllegalStateException.class, withSecret(null)::verifySecret);
    }

    @Test
    void startsWithASecretOfThirtyTwoCharactersOrMore() {
        assertDoesNotThrow(withSecret("exactly-thirty-two-characters-ok")::verifySecret);
        assertDoesNotThrow(withSecret("tampering-test-secret-that-is-at-least-256-bits-long")::verifySecret);
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

    private JwtConfig withProfiles(String... profiles) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(profiles);
        JwtConfig jwtConfig = new JwtConfig(environment, new RestTemplate(), metricsService);
        org.springframework.test.util.ReflectionTestUtils.setField(jwtConfig, "jwtSecret", "tampering-test-secret-that-is-at-least-256-bits-long");
        org.springframework.test.util.ReflectionTestUtils.setField(jwtConfig, "firebaseProjectId", "colean-func-test");
        return jwtConfig;
    }

    @org.junit.jupiter.params.ParameterizedTest(name = "the test stub signs in {0} as {1}")
    @org.junit.jupiter.params.provider.CsvSource({
            "valid-google-token, test-google-user",
            "valid-google-token-2, test-google-user",
            "mock-id-token-1761750000000, google-1761750000000",
    })
    void testProfileStubAcceptsTheFunctionalTestsGoogleTokens(String token, String subject) {
        assertEquals(subject, withProfiles("test", "emulator").validateGoogleIdToken(token).getSubject());
    }

    @org.junit.jupiter.params.ParameterizedTest(name = "the test stub refuses the Google token [{0}]")
    @org.junit.jupiter.params.provider.ValueSource(strings = {
            "' OR 1=1--",
            "'; DROP TABLE users;--",
            "admin'--",
            "<script>alert(1)</script>",
            "anything",
            "test-google-user",
            "valid-google-token ",
            "VALID-GOOGLE-TOKEN",
            "valid-google-",
            "mock-id-token-",
            "mock-id-token-abc",
            "invalid-google-token",
            "expired-google-token",
            "valid-apple-token",
            "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.sig",
            " ",
            "",
    })
    void testProfileStubRefusesEveryOtherGoogleToken(String token) {
        JwtConfig jwtConfig = withProfiles("test", "emulator");
        assertThrows(JWTVerificationException.class, () -> jwtConfig.validateGoogleIdToken(token));
    }

    @Test
    void testProfileStubRefusesAMissingGoogleToken() {
        JwtConfig jwtConfig = withProfiles("test");
        assertThrows(JWTVerificationException.class, () -> jwtConfig.validateGoogleIdToken(null));
    }

    @Test
    void testProfileStubAcceptsOnlyTheFunctionalTestsAppleTokens() {
        JwtConfig jwtConfig = withProfiles("test");
        assertEquals("test-apple-user", jwtConfig.validateAppleIdToken("valid-apple-token").getSubject());
        for (String token : new String[] {"' OR 1=1--", "anything", "valid-google-token", "invalid-apple-token", "expired-apple-token", ""}) {
            assertThrows(JWTVerificationException.class, () -> jwtConfig.validateAppleIdToken(token), token);
        }
    }

    @Test
    void testProfileStubAcceptsOnlyTheFunctionalTestsFirebaseTokens() {
        JwtConfig jwtConfig = withProfiles("test");
        assertEquals("test-firebase-user", jwtConfig.validateFirebaseIdToken("firebase-id-token").getSubject());
        assertEquals("test-firebase-user", jwtConfig.validateFirebaseIdToken("test-firebase-id-token").getSubject());
        for (String token : new String[] {"' OR 1=1--", "anything", "valid-google-token", "invalid-firebase-token", "firebase-id-token-2", ""}) {
            assertThrows(JWTVerificationException.class, () -> jwtConfig.validateFirebaseIdToken(token), token);
        }
    }

    @org.junit.jupiter.params.ParameterizedTest(name = "the stub is off with profiles [{0}]")
    @org.junit.jupiter.params.provider.ValueSource(strings = {"gcp-dev", "prod", "dev", ""})
    void theStubIsOffOutsideTheTestProfile(String profiles) {
        JwtConfig jwtConfig = withProfiles(profiles.isEmpty() ? new String[0] : profiles.split(","));
        assertThrows(JWTVerificationException.class, () -> jwtConfig.validateGoogleIdToken("valid-google-token"));
        assertThrows(JWTVerificationException.class, () -> jwtConfig.validateAppleIdToken("valid-apple-token"));
        assertThrows(JWTVerificationException.class, () -> jwtConfig.validateFirebaseIdToken("firebase-id-token"));
    }

    @org.junit.jupiter.params.ParameterizedTest(name = "refuses to start with profiles [{0}]")
    @org.junit.jupiter.params.provider.ValueSource(strings = {"test,prod", "prod,test", "test,gcp-dev", "gcp-dev,test,emulator"})
    void refusesToStartWithTheTestStubBesideADeployedProfile(String profiles) {
        assertThrows(IllegalStateException.class, withProfiles(profiles.split(","))::verifyProfiles);
    }

    @org.junit.jupiter.params.ParameterizedTest(name = "starts with profiles [{0}]")
    @org.junit.jupiter.params.provider.ValueSource(strings = {"test", "test,emulator", "dev,test", "dev,test,nft", "gcp-dev", "prod", "dev", ""})
    void startsWhenTheTestStubIsNotBesideADeployedProfile(String profiles) {
        assertDoesNotThrow(withProfiles(profiles.isEmpty() ? new String[0] : profiles.split(","))::verifyProfiles);
    }
}
