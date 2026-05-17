package com.app.controller;

import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.security.JwtAuthenticationFilter;
import com.app.service.AccountDeletionService;
import com.app.service.GatewayServiceApplication;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;
import java.util.concurrent.CompletableFuture;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = GatewayServiceApplication.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class AccountControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AccountDeletionService accountDeletionService;

    private static final String USER_ID = "test-user-456";

    @BeforeEach
    void setUp() {
        reset(accountDeletionService);
    }

    private void setAuthenticatedUser(String userId) {
        List<SimpleGrantedAuthority> authorities = Collections.singletonList(
                new SimpleGrantedAuthority("ROLE_USER")
        );
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(userId, null, authorities);

        JwtAuthenticationFilter.UserAuthenticationDetails details =
                new JwtAuthenticationFilter.UserAuthenticationDetails();
        details.setUserId(userId);
        details.setProvider("google");
        auth.setDetails(details);

        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("DELETE /api/account — success returns 200 with deleted status")
    void deleteAccount_Success() throws Exception {
        setAuthenticatedUser(USER_ID);
        when(accountDeletionService.deleteAccount(USER_ID))
                .thenReturn(CompletableFuture.completedFuture("google"));

        mockMvc.perform(delete("/api/account"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("deleted"))
                .andExpect(jsonPath("$.message").exists());

        verify(accountDeletionService).deleteAccount(USER_ID);
    }

    @Test
    @DisplayName("DELETE /api/account — unauthenticated returns 401")
    void deleteAccount_Unauthenticated() throws Exception {
        SecurityContextHolder.clearContext();

        mockMvc.perform(delete("/api/account"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("DELETE /api/account — user not found returns 404")
    void deleteAccount_UserNotFound() throws Exception {
        setAuthenticatedUser(USER_ID);
        when(accountDeletionService.deleteAccount(USER_ID))
                .thenReturn(CompletableFuture.failedFuture(
                        new GatewayException(ErrorCode.USER_NOT_FOUND, "User not found")));

        mockMvc.perform(delete("/api/account"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("DELETE /api/account — deletion in progress returns 409")
    void deleteAccount_AlreadyInProgress() throws Exception {
        setAuthenticatedUser(USER_ID);
        when(accountDeletionService.deleteAccount(USER_ID))
                .thenReturn(CompletableFuture.failedFuture(
                        new GatewayException(ErrorCode.ACCOUNT_DELETION_IN_PROGRESS,
                                "Already in progress")));

        mockMvc.perform(delete("/api/account"))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("DELETE /api/account — internal failure returns 409 (ACCOUNT_DELETION_FAILED)")
    void deleteAccount_InternalFailure() throws Exception {
        setAuthenticatedUser(USER_ID);
        when(accountDeletionService.deleteAccount(USER_ID))
                .thenReturn(CompletableFuture.failedFuture(
                        new GatewayException(ErrorCode.ACCOUNT_DELETION_FAILED,
                                "Deletion failed")));

        mockMvc.perform(delete("/api/account"))
                .andExpect(status().isConflict());
    }
}
