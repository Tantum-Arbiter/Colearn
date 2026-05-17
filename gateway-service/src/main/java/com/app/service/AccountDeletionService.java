package com.app.service;

import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.model.User;
import com.app.repository.UserProfileRepository;
import com.app.repository.UserRepository;
import com.app.repository.UserSessionRepository;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Orchestrates cascading account deletion for GDPR / App Store compliance.
 *
 * Deletion order:
 *   1. Delete user profile (UserProfileRepository)
 *   2. Revoke + delete all sessions across all devices (UserSessionRepository)
 *   3. Delete the user record itself (UserRepository)
 *
 * Each step is individually timed for observability and wrapped in a
 * Resilience4j circuit breaker to protect against Firestore outages.
 */
@Service
public class AccountDeletionService {

    private static final Logger logger = LoggerFactory.getLogger(AccountDeletionService.class);

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final UserSessionRepository userSessionRepository;
    private final SessionService sessionService;
    private final ApplicationMetricsService metricsService;
    private final CircuitBreaker circuitBreaker;

    /** Guard against concurrent deletion requests for the same userId. */
    private final ConcurrentMap<String, Boolean> deletionsInProgress = new ConcurrentHashMap<>();

    public AccountDeletionService(UserRepository userRepository,
                                  UserProfileRepository userProfileRepository,
                                  UserSessionRepository userSessionRepository,
                                  SessionService sessionService,
                                  ApplicationMetricsService metricsService,
                                  CircuitBreakerRegistry circuitBreakerRegistry) {
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
        this.userSessionRepository = userSessionRepository;
        this.sessionService = sessionService;
        this.metricsService = metricsService;
        this.circuitBreaker = circuitBreakerRegistry.circuitBreaker("accountDeletion");
    }

    /**
     * Delete a user account and all associated data.
     *
     * @param userId the authenticated user's ID
     * @return a future containing the provider of the deleted user (for metrics)
     */
    public CompletableFuture<String> deleteAccount(String userId) {
        logger.info("Account deletion requested for user: {}", userId);

        // Prevent duplicate concurrent deletions
        if (deletionsInProgress.putIfAbsent(userId, Boolean.TRUE) != null) {
            logger.warn("Account deletion already in progress for user: {}", userId);
            return CompletableFuture.failedFuture(
                    new GatewayException(ErrorCode.ACCOUNT_DELETION_IN_PROGRESS,
                            "Account deletion is already in progress"));
        }

        long overallStart = System.currentTimeMillis();

        return CompletableFuture.supplyAsync(() ->
                CircuitBreaker.decorateSupplier(circuitBreaker, () -> {
                    try {
                        // ── Step 0: Verify user exists ──
                        Optional<User> userOpt = userRepository.findById(userId).join();
                        if (userOpt.isEmpty()) {
                            throw new GatewayException(ErrorCode.USER_NOT_FOUND,
                                    "User not found: " + userId);
                        }
                        User user = userOpt.get();
                        String provider = user.getProvider() != null ? user.getProvider() : "unknown";

                        // ── Step 1: Delete profile ──
                        deleteProfile(userId);

                        // ── Step 2: Revoke and delete all sessions (all devices) ──
                        revokeAndDeleteSessions(userId);

                        // ── Step 3: Delete user record ──
                        deleteUserRecord(userId);

                        long totalDuration = System.currentTimeMillis() - overallStart;
                        metricsService.recordAccountDeletion(provider, true, totalDuration);
                        logger.info("Account deletion completed for user: {} in {}ms", userId, totalDuration);

                        return provider;

                    } catch (GatewayException e) {
                        throw e;
                    } catch (Exception e) {
                        long totalDuration = System.currentTimeMillis() - overallStart;
                        metricsService.recordAccountDeletion("unknown", false, totalDuration);
                        logger.error("Account deletion failed for user: {}", userId, e);
                        throw new GatewayException(ErrorCode.ACCOUNT_DELETION_FAILED,
                                "Account deletion failed", e);
                    } finally {
                        deletionsInProgress.remove(userId);
                    }
                }).get()
        );
    }

    // ── Private step methods ─────────────────────────────────────────────

    private void deleteProfile(String userId) {
        long stepStart = System.currentTimeMillis();
        try {
            // Profile may not exist (e.g. user created but never completed onboarding)
            boolean exists = userProfileRepository.exists(userId).join();
            if (exists) {
                userProfileRepository.delete(userId).join();
                logger.debug("Profile deleted for user: {}", userId);
            } else {
                logger.debug("No profile to delete for user: {}", userId);
            }
            metricsService.recordAccountDeletionStep("delete_profile", true,
                    System.currentTimeMillis() - stepStart);
        } catch (Exception e) {
            metricsService.recordAccountDeletionStep("delete_profile", false,
                    System.currentTimeMillis() - stepStart);
            throw e;
        }
    }

    private void revokeAndDeleteSessions(String userId) {
        long stepStart = System.currentTimeMillis();
        try {
            // First revoke all active sessions so tokens are immediately invalid
            var revokedSessions = sessionService.revokeAllUserSessions(userId).join();
            int revokedCount = revokedSessions.size();
            metricsService.recordAccountDeletionSessionsRevoked(revokedCount);

            // Then hard-delete all session records (active + already-expired) for GDPR
            long deletedCount = userSessionRepository.deleteAllUserSessions(userId).join();

            logger.debug("Sessions handled for user: {} — revoked: {}, deleted: {}",
                    userId, revokedCount, deletedCount);
            metricsService.recordAccountDeletionStep("delete_sessions", true,
                    System.currentTimeMillis() - stepStart);
        } catch (Exception e) {
            metricsService.recordAccountDeletionStep("delete_sessions", false,
                    System.currentTimeMillis() - stepStart);
            throw e;
        }
    }

    private void deleteUserRecord(String userId) {
        long stepStart = System.currentTimeMillis();
        try {
            userRepository.deleteUser(userId).join();
            logger.debug("User record deleted: {}", userId);
            metricsService.recordAccountDeletionStep("delete_user", true,
                    System.currentTimeMillis() - stepStart);
        } catch (Exception e) {
            metricsService.recordAccountDeletionStep("delete_user", false,
                    System.currentTimeMillis() - stepStart);
            throw e;
        }
    }
}
