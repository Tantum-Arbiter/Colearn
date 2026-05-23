package com.app.controller;

import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.security.JwtAuthenticationFilter;
import com.app.service.AccountDeletionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Account management endpoints.
 *
 * DELETE /api/account -permanently deletes the authenticated user's account
 * and all associated data (profile, sessions, tokens) across all devices.
 */
@RestController
@RequestMapping("/api")
public class AccountController {

    private static final Logger logger = LoggerFactory.getLogger(AccountController.class);

    private final AccountDeletionService accountDeletionService;

    public AccountController(AccountDeletionService accountDeletionService) {
        this.accountDeletionService = accountDeletionService;
    }

    @DeleteMapping("/account")
    public ResponseEntity<?> deleteAccount() {
        String userId = getAuthenticatedUserId();
        if (userId == null) {
            throw new GatewayException(ErrorCode.UNAUTHORIZED_ACCESS, "Authentication required");
        }

        logger.info("Account deletion requested via API for user: {}", userId);

        try {
            String provider = accountDeletionService.deleteAccount(userId).join();

            return ResponseEntity.ok(Map.of(
                    "status", "deleted",
                    "message", "Your account and all associated data have been permanently deleted."
            ));

        } catch (GatewayException e) {
            throw e;
        } catch (Exception e) {
            Throwable cause = e.getCause();
            if (cause instanceof GatewayException) {
                throw (GatewayException) cause;
            }
            logger.error("Account deletion failed for user: {}", userId, e);
            throw new GatewayException(ErrorCode.ACCOUNT_DELETION_FAILED,
                    "Account deletion failed. Please try again later.", e);
        }
    }

    private String getAuthenticatedUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        Object details = authentication.getDetails();
        if (details instanceof JwtAuthenticationFilter.UserAuthenticationDetails) {
            return ((JwtAuthenticationFilter.UserAuthenticationDetails) details).getUserId();
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof String) {
            return (String) principal;
        }

        return null;
    }
}
