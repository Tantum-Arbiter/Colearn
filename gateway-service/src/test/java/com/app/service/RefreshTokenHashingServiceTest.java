package com.app.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for RefreshTokenHashingService
 * Ensures compliance with security best practices for refresh token storage
 */
@DisplayName("RefreshTokenHashingService Tests")
class RefreshTokenHashingServiceTest {

    private RefreshTokenHashingService hashingService;

    @BeforeEach
    void setUp() {
        hashingService = new RefreshTokenHashingService();
    }

    @Test
    @DisplayName("Should hash refresh token successfully")
    void shouldHashRefreshToken() {
        // Given
        String refreshToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJncm93LXdpdGgtZnJleWEtZ2F0ZXdheSIsInN1YiI6InVzZXItdXVpZCIsInR5cGUiOiJyZWZyZXNoIiwiaWF0IjoxNzM3NzM2MDAwLCJleHAiOjE3MzgzNDA4MDB9.abc123";

        // When
        String hash = hashingService.hashToken(refreshToken);

        // Then
        assertNotNull(hash);
        assertEquals(60, hash.length(), "BCrypt hash should be exactly 60 characters");
        assertTrue(hash.startsWith("$2a$12$"), "BCrypt hash should start with $2a$12$ (cost factor 12)");
        assertNotEquals(refreshToken, hash, "Hash should not equal plaintext token");
    }

    @Test
    @DisplayName("Should generate different hashes for same token (salt)")
    void shouldGenerateDifferentHashesForSameToken() {
        // Given
        String refreshToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token";

        // When
        String hash1 = hashingService.hashToken(refreshToken);
        String hash2 = hashingService.hashToken(refreshToken);

        // Then
        assertNotEquals(hash1, hash2, "BCrypt should generate different hashes due to random salt");
        assertTrue(hashingService.validateToken(refreshToken, hash1));
        assertTrue(hashingService.validateToken(refreshToken, hash2));
    }

    @Test
    @DisplayName("Should validate correct token against hash")
    void shouldValidateCorrectToken() {
        // Given
        String refreshToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.valid-token";
        String hash = hashingService.hashToken(refreshToken);

        // When
        boolean isValid = hashingService.validateToken(refreshToken, hash);

        // Then
        assertTrue(isValid, "Correct token should validate against its hash");
    }

    @Test
    @DisplayName("Should reject incorrect token against hash")
    void shouldRejectIncorrectToken() {
        // Given
        String correctToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.correct-token";
        String incorrectToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.incorrect-token";
        String hash = hashingService.hashToken(correctToken);

        // When
        boolean isValid = hashingService.validateToken(incorrectToken, hash);

        // Then
        assertFalse(isValid, "Incorrect token should not validate against hash");
    }

    @Test
    @DisplayName("Should throw exception when hashing null token")
    void shouldThrowExceptionWhenHashingNullToken() {
        // When/Then
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> hashingService.hashToken(null)
        );
        assertEquals("Refresh token cannot be null or empty", exception.getMessage());
    }

    @Test
    @DisplayName("Should throw exception when hashing empty token")
    void shouldThrowExceptionWhenHashingEmptyToken() {
        // When/Then
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> hashingService.hashToken("")
        );
        assertEquals("Refresh token cannot be null or empty", exception.getMessage());
    }

    @Test
    @DisplayName("Should throw exception when hashing whitespace token")
    void shouldThrowExceptionWhenHashingWhitespaceToken() {
        // When/Then
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> hashingService.hashToken("   ")
        );
        assertEquals("Refresh token cannot be null or empty", exception.getMessage());
    }

    @Test
    @DisplayName("Should throw exception when validating with null provided token")
    void shouldThrowExceptionWhenValidatingWithNullProvidedToken() {
        // Given
        String hash = "$2a$12$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNO";

        // When/Then
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> hashingService.validateToken(null, hash)
        );
        assertEquals("Provided token cannot be null or empty", exception.getMessage());
    }

    @Test
    @DisplayName("Should throw exception when validating with null stored hash")
    void shouldThrowExceptionWhenValidatingWithNullStoredHash() {
        // Given
        String token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token";

        // When/Then
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> hashingService.validateToken(token, null)
        );
        assertEquals("Stored hash cannot be null or empty", exception.getMessage());
    }

    @Test
    @DisplayName("Should identify valid BCrypt hash")
    void shouldIdentifyValidBCryptHash() {
        // Given
        String token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token";
        String hash = hashingService.hashToken(token);

        // When
        boolean isBCrypt = hashingService.isBCryptHash(hash);

        // Then
        assertTrue(isBCrypt, "Should recognize valid BCrypt hash");
    }

    @Test
    @DisplayName("Should reject plaintext token as BCrypt hash")
    void shouldRejectPlaintextTokenAsBCryptHash() {
        // Given
        String plaintextToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.plaintext-token";

        // When
        boolean isBCrypt = hashingService.isBCryptHash(plaintextToken);

        // Then
        assertFalse(isBCrypt, "Should not recognize plaintext token as BCrypt hash");
    }

    @Test
    @DisplayName("Should reject null as BCrypt hash")
    void shouldRejectNullAsBCryptHash() {
        // When
        boolean isBCrypt = hashingService.isBCryptHash(null);

        // Then
        assertFalse(isBCrypt, "Should not recognize null as BCrypt hash");
    }

    @Test
    @DisplayName("Should reject short string as BCrypt hash")
    void shouldRejectShortStringAsBCryptHash() {
        // Given
        String shortString = "$2a$12$short";

        // When
        boolean isBCrypt = hashingService.isBCryptHash(shortString);

        // Then
        assertFalse(isBCrypt, "Should not recognize short string as BCrypt hash");
    }

    @Test
    @DisplayName("Should return correct cost factor")
    void shouldReturnCorrectCostFactor() {
        // When
        int costFactor = hashingService.getCostFactor();

        // Then
        assertEquals(12, costFactor, "Cost factor should be 12");
    }

    @Test
    @DisplayName("Should handle very long tokens")
    void shouldHandleVeryLongTokens() {
        // Given
        String longToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + "a".repeat(1000);

        // When
        String hash = hashingService.hashToken(longToken);

        // Then
        assertNotNull(hash);
        assertEquals(60, hash.length());
        assertTrue(hashingService.validateToken(longToken, hash));
    }

    @Test
    @DisplayName("Should handle tokens with special characters")
    void shouldHandleTokensWithSpecialCharacters() {
        // Given
        String tokenWithSpecialChars = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.!@#$%^&*()_+-=[]{}|;:',.<>?/~`";

        // When
        String hash = hashingService.hashToken(tokenWithSpecialChars);

        // Then
        assertNotNull(hash);
        assertTrue(hashingService.validateToken(tokenWithSpecialChars, hash));
    }

    @Test
    @DisplayName("Should be case-sensitive")
    void shouldBeCaseSensitive() {
        // Given
        String lowerCaseToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.lowercase";
        String upperCaseToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.LOWERCASE";
        String hash = hashingService.hashToken(lowerCaseToken);

        // When
        boolean lowerCaseValid = hashingService.validateToken(lowerCaseToken, hash);
        boolean upperCaseValid = hashingService.validateToken(upperCaseToken, hash);

        // Then
        assertTrue(lowerCaseValid, "Lowercase token should validate");
        assertFalse(upperCaseValid, "Uppercase token should not validate (case-sensitive)");
    }

    @Test
    @DisplayName("Should handle Unicode characters")
    void shouldHandleUnicodeCharacters() {
        // Given
        String unicodeToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.你好世界🚀";

        // When
        String hash = hashingService.hashToken(unicodeToken);

        // Then
        assertNotNull(hash);
        assertTrue(hashingService.validateToken(unicodeToken, hash));
    }
}

