package com.app.security;

import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class AuthenticatedUser {

    private AuthenticatedUser() {
    }

    public static String id() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            if (authentication.getDetails() instanceof JwtAuthenticationFilter.UserAuthenticationDetails details
                    && details.getUserId() != null) {
                return details.getUserId();
            }
            if (authentication.getPrincipal() instanceof String principal) {
                return principal;
            }
        }
        throw new GatewayException(ErrorCode.UNAUTHORIZED_ACCESS, "Authentication required");
    }
}
