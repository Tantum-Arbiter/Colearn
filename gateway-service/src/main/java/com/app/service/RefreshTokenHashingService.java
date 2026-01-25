package com.app.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

@Service
public class RefreshTokenHashingService {

    private static final Logger logger = LoggerFactory.getLogger(RefreshTokenHashingService.class);

    private static final int BCRYPT_COST = 12;

    private final BCryptPasswordEncoder passwordEncoder;

    public RefreshTokenHashingService() {
        this.passwordEncoder = new BCryptPasswordEncoder(BCRYPT_COST);
        logger.info("RefreshTokenHashingService initialized with SHA-256 + BCrypt cost factor: {}", BCRYPT_COST);
    }

    public String hashToken(String refreshToken) {
        if (refreshToken == null || refreshToken.trim().isEmpty()) {
            throw new IllegalArgumentException("Refresh token cannot be null or empty");
        }

        long startTime = System.currentTimeMillis();

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(refreshToken.getBytes(StandardCharsets.UTF_8));
            String base64Hash = Base64.getEncoder().encodeToString(hashBytes);
            String bcryptHash = passwordEncoder.encode(base64Hash);

            long duration = System.currentTimeMillis() - startTime;
            logger.debug("Refresh token hashed (SHA-256 + BCrypt) in {}ms", duration);

            return bcryptHash;
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    public boolean validateToken(String providedToken, String storedHash) {
        if (providedToken == null || providedToken.trim().isEmpty()) {
            throw new IllegalArgumentException("Provided token cannot be null or empty");
        }

        if (storedHash == null || storedHash.trim().isEmpty()) {
            throw new IllegalArgumentException("Stored hash cannot be null or empty");
        }

        long startTime = System.currentTimeMillis();

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(providedToken.getBytes(StandardCharsets.UTF_8));
            String base64Hash = Base64.getEncoder().encodeToString(hashBytes);
            boolean matches = passwordEncoder.matches(base64Hash, storedHash);

            long duration = System.currentTimeMillis() - startTime;
            logger.debug("Refresh token validation completed in {}ms, result: {}", duration, matches);

            return matches;
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    public boolean isBCryptHash(String value) {
        if (value == null || value.length() < 60) {
            return false;
        }
        return value.matches("^\\$2[aby]\\$\\d{2}\\$.{53}$");
    }

    public int getCostFactor() {
        return BCRYPT_COST;
    }
}

