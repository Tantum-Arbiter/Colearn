package com.app.security;

import com.app.config.JwtConfig;
import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTCreator;
import com.auth0.jwt.algorithms.Algorithm;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class TokenTamperingTest {

    private static final String SECRET = "tampering-test-secret-that-is-at-least-256-bits-long";
    private static final String ISSUER = "grow-with-freya-gateway";

    private JwtAuthenticationFilter underTest;

    @BeforeEach
    void setUp() {
        JwtConfig jwtConfig = new JwtConfig(null, null, null);
        ReflectionTestUtils.setField(jwtConfig, "jwtSecret", SECRET);
        ReflectionTestUtils.setField(jwtConfig, "jwtExpirationInSeconds", 900);
        underTest = new JwtAuthenticationFilter(jwtConfig);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private Authentication authenticate(String token) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/profile");
        request.addHeader("Authorization", "Bearer " + token);
        MockFilterChain chain = new MockFilterChain();

        underTest.doFilter(request, new MockHttpServletResponse(), chain);

        assertNotNull(chain.getRequest(), "the filter must pass the request on and let the chain refuse it");
        return SecurityContextHolder.getContext().getAuthentication();
    }

    private static JWTCreator.Builder accessToken(String subject) {
        Instant now = Instant.now();
        return JWT.create()
                .withIssuer(ISSUER)
                .withSubject(subject)
                .withClaim("provider", "google")
                .withClaim("type", "access")
                .withIssuedAt(Date.from(now))
                .withExpiresAt(Date.from(now.plusSeconds(900)));
    }

    private static String sign(JWTCreator.Builder builder) {
        return builder.sign(Algorithm.HMAC256(SECRET));
    }

    private static String b64(String json) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void acceptsAnUntouchedToken() throws Exception {
        Authentication auth = authenticate(sign(accessToken("user-123")));

        assertNotNull(auth);
        assertEquals("user-123", auth.getPrincipal());
    }

    @Test
    void rejectsATokenWithAChangedSignature() throws Exception {
        String token = sign(accessToken("user-123"));
        String last = token.substring(token.length() - 1);
        String tampered = token.substring(0, token.length() - 1) + ("A".equals(last) ? "B" : "A");

        assertNull(authenticate(tampered));
    }

    @Test
    void rejectsATokenWhosePayloadWasSwappedForAnotherUser() throws Exception {
        String[] parts = sign(accessToken("user-123")).split("\\.");
        String[] admin = sign(accessToken("admin")).split("\\.");

        assertNull(authenticate(parts[0] + "." + admin[1] + "." + parts[2]));
    }

    @Test
    void rejectsATokenWithAHandEditedPayload() throws Exception {
        String[] parts = sign(accessToken("user-123")).split("\\.");
        String edited = b64("{\"iss\":\"" + ISSUER + "\",\"sub\":\"admin\",\"type\":\"access\",\"exp\":" + (Instant.now().getEpochSecond() + 900) + "}");

        assertNull(authenticate(parts[0] + "." + edited + "." + parts[2]));
    }

    @Test
    void rejectsAnUnsignedTokenClaimingAlgorithmNone() throws Exception {
        String header = b64("{\"alg\":\"none\",\"typ\":\"JWT\"}");
        String payload = sign(accessToken("user-123")).split("\\.")[1];

        assertNull(authenticate(header + "." + payload + "."));
    }

    @Test
    void rejectsATokenSignedWithAnotherSecret() throws Exception {
        String forged = accessToken("user-123").sign(Algorithm.HMAC256("someone-elses-secret-that-is-also-long-enough"));

        assertNull(authenticate(forged));
    }

    @Test
    void rejectsATokenThatExpiredASecondAgo() throws Exception {
        Instant now = Instant.now();
        String token = sign(accessToken("user-123").withIssuedAt(Date.from(now.minusSeconds(60))).withExpiresAt(Date.from(now.minusSeconds(1))));

        assertNull(authenticate(token));
    }

    @Test
    void acceptsATokenThatExpiresInAMinute() throws Exception {
        String token = sign(accessToken("user-123").withExpiresAt(Date.from(Instant.now().plusSeconds(60))));

        assertNotNull(authenticate(token));
    }

    @Test
    void rejectsATokenFromAnotherIssuer() throws Exception {
        assertNull(authenticate(sign(accessToken("user-123").withIssuer("https://accounts.example.com"))));
    }

    @Test
    void rejectsARefreshTokenUsedAsAnAccessToken() throws Exception {
        assertNull(authenticate(sign(accessToken("user-123").withClaim("type", "refresh"))));
    }

    @Test
    void rejectsATokenWithNoType() throws Exception {
        Instant now = Instant.now();
        String token = sign(JWT.create().withIssuer(ISSUER).withSubject("user-123").withExpiresAt(Date.from(now.plusSeconds(900))));

        assertNull(authenticate(token));
    }

    @ParameterizedTest
    @ValueSource(strings = {"not-a-token", "only.two", "four.parts.in.here", "...", "%%%.%%%.%%%"})
    void rejectsAMalformedToken(String token) throws Exception {
        assertNull(authenticate(token));
    }

    @ParameterizedTest
    @ValueSource(strings = {"user' OR '1'='1", "<script>alert(1)</script>", "../../admin"})
    void treatsAStrangeButValidlySignedSubjectAsAnOpaqueId(String subject) throws Exception {
        Authentication auth = authenticate(sign(accessToken(subject)));

        assertNotNull(auth);
        assertEquals(subject, auth.getPrincipal());
    }

    @Test
    void authenticatesTheSameValidTokenEachTimeItIsPresented() throws Exception {
        String token = sign(accessToken("user-123"));

        assertNotNull(authenticate(token));
        SecurityContextHolder.clearContext();
        assertNotNull(authenticate(token));
    }
}
