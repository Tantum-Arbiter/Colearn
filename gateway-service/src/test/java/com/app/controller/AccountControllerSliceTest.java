package com.app.controller;

import com.app.config.JwtConfig;
import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.security.RateLimitingFilter;
import com.app.service.AccountDeletionService;
import com.app.testsupport.SecuredWebMvcTest;
import com.app.testsupport.TestTokens;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.concurrent.CompletableFuture;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AccountController.class)
@SecuredWebMvcTest
class AccountControllerSliceTest {

    private static final String USER = "user-7";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtConfig jwtConfig;

    @Autowired
    private RateLimitingFilter rateLimitingFilter;

    @MockitoBean
    private AccountDeletionService accountDeletionService;

    @BeforeEach
    void setUp() {
        rateLimitingFilter.resetForTests();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private org.springframework.test.web.servlet.ResultActions deleteAccount() throws Exception {
        return mockMvc.perform(delete("/api/account")
                .header("Authorization", "Bearer " + TestTokens.accessToken(jwtConfig, USER))
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.4.0")
                .header("X-Device-ID", "device-1234"));
    }

    @Test
    void deletesTheSignedInAccount() throws Exception {
        when(accountDeletionService.deleteAccount(USER)).thenReturn(CompletableFuture.completedFuture("google"));

        deleteAccount()
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("deleted"));

        verify(accountDeletionService).deleteAccount(USER);
    }

    @Test
    void refusesWithoutAToken() throws Exception {
        mockMvc.perform(delete("/api/account")).andExpect(status().isUnauthorized());

        verify(accountDeletionService, never()).deleteAccount(anyString());
    }

    @Test
    void answers404WhenThereIsNoAccount() throws Exception {
        when(accountDeletionService.deleteAccount(USER)).thenReturn(CompletableFuture.failedFuture(
                new GatewayException(ErrorCode.USER_NOT_FOUND, "User not found")));

        deleteAccount()
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("GTW-400"))
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void answers409WhenADeletionIsAlreadyRunning() throws Exception {
        when(accountDeletionService.deleteAccount(USER)).thenReturn(CompletableFuture.failedFuture(
                new GatewayException(ErrorCode.ACCOUNT_DELETION_IN_PROGRESS, "In progress")));

        deleteAccount()
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("GTW-413"));
    }

    @Test
    void answers500WhenTheDeletionFails() throws Exception {
        when(accountDeletionService.deleteAccount(USER)).thenReturn(CompletableFuture.failedFuture(
                new GatewayException(ErrorCode.ACCOUNT_DELETION_FAILED, "Failed")));

        deleteAccount()
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.errorCode").value("GTW-412"));
    }

    @Test
    void answers500WhenSomethingUnexpectedBreaks() throws Exception {
        when(accountDeletionService.deleteAccount(USER)).thenReturn(CompletableFuture.failedFuture(new IllegalStateException("boom")));

        deleteAccount()
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.errorCode").value("GTW-412"));
    }
}
