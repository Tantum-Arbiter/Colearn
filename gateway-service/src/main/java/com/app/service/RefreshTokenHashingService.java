package com.app.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

/**
 * Service for hashing and validating refresh tokens using SHA-256 + BCrypt.
 *
 * Security Compliance:
 * - Uses SHA-256 to hash JWT tokens (which exceed BCrypt's 72-byte limit)
 * - Then uses BCrypt with cost factor 12 on the SHA-256 digest (industry standard for 2025)
 * - Provides defense-in-depth against database compromise
 * - Ensures refresh tokens are never stored in plaintext
 *
 * Performance:
 * - SHA-256 = ~1ms (fast cryptographic hash)
 * - BCrypt cost 12 = ~250ms per hash/validation (acceptable for refresh flow)
 * - Intentionally slow to prevent brute force attacks
 *
 * Why SHA-256 + BCrypt:
 * - JWT tokens are typically 200-500 bytes (exceed BCrypt's 72-byte limit)
 * - SHA-256 produces a fixed 32-byte digest (well within BCrypt's limit)
 * - BCrypt provides adaptive cost factor for future-proofing
 */
@Service
public class RefreshTokenHashingService {

    private static final Logger logger = LoggerFactory.getLogger(RefreshTokenHashingService.class);

    // BCrypt cost factor (2^12 = 4096 rounds)
    // Industry standard for 2025: 12-14
    // Higher = more secure but slower (each increment doubles time)
    private static final int BCRYPT_COST = 12;

    private final BCryptPasswordEncoder passwordEncoder;

    public RefreshTokenHashingService() {
        this.passwordEncoder = new BCryptPasswordEncoder(BCRYPT_COST);
        logger.info("RefreshTokenHashingService initialized with SHA-256 + BCrypt cost factor: {}", BCRYPT_COST);
    }

    /**
     * Hash a refresh token for secure storage.
     *
     * Process:
     * 1. Hash the JWT token with SHA-256 (produces 32-byte digest)
     * 2. Encode the digest as Base64 (produces 44-character string)
     * 3. Hash the Base64 string with BCrypt (produces 60-character hash)
     *
     * @param refreshToken The plaintext refresh token (JWT)
     * @return BCrypt hash of the SHA-256 digest (60 characters, starts with $2a$12$)
     * @throws IllegalArgumentException if token is null or empty
     */
    public String hashToken(String refreshToken) {
        if (refreshToken == null || refreshToken.trim().isEmpty()) {
            throw new IllegalArgumentException("Refresh token cannot be null or empty");
        }

        long startTime = System.currentTimeMillis();

        try {
            // Step 1: Hash the JWT token with SHA-256
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(refreshToken.getBytes(StandardCharsets.UTF_8));

            // Step 2: Encode as Base64 (44 characters, well within BCrypt's 72-byte limit)
            String base64Hash = Base64.getEncoder().encodeToString(hashBytes);

            // Step 3: Hash with BCrypt
            String bcryptHash = passwordEncoder.encode(base64Hash);

            long duration = System.currentTimeMillis() - startTime;
            logger.debug("Refresh token hashed (SHA-256 + BCrypt) in {}ms", duration);

            return bcryptHash;
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is always available in Java
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    /**
     * Validate a refresh token against its stored hash.
     *
     * Process:
     * 1. Hash the provided JWT token with SHA-256
     * 2. Encode the digest as Base64
     * 3. Compare the Base64 string with the stored BCrypt hash
     *
     * @param providedToken The plaintext token provided by the client
     * @param storedHash The BCrypt hash stored in the database
     * @return true if the token matches the hash, false otherwise
     * @throws IllegalArgumentException if either parameter is null or empty
     */
    public boolean validateToken(String providedToken, String storedHash) {
        if (providedToken == null || providedToken.trim().isEmpty()) {
            throw new IllegalArgumentException("Provided token cannot be null or empty");
        }

        if (storedHash == null || storedHash.trim().isEmpty()) {
            throw new IllegalArgumentException("Stored hash cannot be null or empty");
        }

        long startTime = System.currentTimeMillis();

        try {
            // Step 1: Hash the provided token with SHA-256
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(providedToken.getBytes(StandardCharsets.UTF_8));

            // Step 2: Encode as Base64
            String base64Hash = Base64.getEncoder().encodeToString(hashBytes);

            // Step 3: Compare with BCrypt hash
            boolean matches = passwordEncoder.matches(base64Hash, storedHash);

            long duration = System.currentTimeMillis() - startTime;
            logger.debug("Refresh token validation (SHA-256 + BCrypt) completed in {}ms, result: {}", duration, matches);

            return matches;
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is always available in Java
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

    /**
     * Check if a string is a BCrypt hash.
     * BCrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor.
     * 
     * @param value The string to check
     * @return true if it looks like a BCrypt hash, false otherwise
     */
    public boolean isBCryptHash(String value) {
        if (value == null || value.length() < 60) {
            return false;
        }
        
        // BCrypt hashes are exactly 60 characters and start with $2a$, $2b$, or $2y$
        return value.matches("^\\$2[aby]\\$\\d{2}\\$.{53}$");
    }

    /**
     * Get the BCrypt cost factor used by this service.
     * Useful for monitoring and compliance reporting.
     * 
     * @return The BCrypt cost factor (12)
     */
    public int getCostFactor() {
        return BCRYPT_COST;
    }
}

