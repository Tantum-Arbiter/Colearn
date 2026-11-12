package com.app.testsupport;

import com.app.config.JwtConfig;
import com.auth0.jwt.JWT;

import java.time.Instant;
import java.util.Date;

public final class TestTokens {

    private TestTokens() {
    }

    public static String accessToken(JwtConfig jwtConfig, String userId) {
        return jwtConfig.generateAccessToken(userId, "google");
    }

    public static String expiredAccessToken(JwtConfig jwtConfig, String userId) {
        Instant now = Instant.now();
        return JWT.create()
                .withIssuer("grow-with-freya-gateway")
                .withSubject(userId)
                .withClaim("provider", "google")
                .withClaim("type", "access")
                .withIssuedAt(Date.from(now.minusSeconds(120)))
                .withExpiresAt(Date.from(now.minusSeconds(60)))
                .sign(jwtConfig.jwtAlgorithm());
    }

    public static String refreshToken(JwtConfig jwtConfig, String userId) {
        return jwtConfig.generateRefreshToken(userId);
    }
}
