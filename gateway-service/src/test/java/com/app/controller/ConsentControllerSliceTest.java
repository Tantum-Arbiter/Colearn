package com.app.controller;

import com.app.config.JwtConfig;
import com.app.model.Consent;
import com.app.repository.ConsentRepository;
import com.app.security.RateLimitingFilter;
import com.app.testsupport.SecuredWebMvcTest;
import com.app.testsupport.TestTokens;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Instant;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = ConsentController.class)
@SecuredWebMvcTest
class ConsentControllerSliceTest {

    private static final String USER = "user-3";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtConfig jwtConfig;

    @Autowired
    private RateLimitingFilter rateLimitingFilter;

    @MockitoBean
    private ConsentRepository consentRepository;

    @BeforeEach
    void setUp() {
        rateLimitingFilter.resetForTests();
        when(consentRepository.add(anyString(), any())).thenAnswer(inv -> CompletableFuture.completedFuture(inv.getArgument(1)));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private MockHttpServletRequestBuilder record(String body) {
        return post("/api/consents")
                .header("Authorization", "Bearer " + TestTokens.accessToken(jwtConfig, USER))
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.4.0")
                .header("X-Device-ID", "device-1234")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
    }

    private Consent recorded() {
        ArgumentCaptor<Consent> captor = ArgumentCaptor.forClass(Consent.class);
        verify(consentRepository).add(eq(USER), captor.capture());
        return captor.getValue();
    }

    @Test
    void recordsTheConsentWithTheTimeTheParentGaveIt() throws Exception {
        mockMvc.perform(record("{\"policyVersion\":\"1.0\",\"scope\":\"core\",\"acceptedAt\":\"2026-09-01T10:00:00Z\",\"appVersion\":\"1.4.0\"}"))
                .andExpect(status().isCreated());

        Consent consent = recorded();
        assertEquals("1.0", consent.getPolicyVersion());
        assertEquals("core", consent.getScope());
        assertEquals(Instant.parse("2026-09-01T10:00:00Z").getEpochSecond(), consent.getAcceptedAt().getSeconds());
        assertTrue(consent.getRecordedAt() != null);
    }

    @Test
    void usesTheRecordingTimeWhenTheAppSendsNone() throws Exception {
        mockMvc.perform(record("{\"policyVersion\":\"1.0\",\"scope\":\"core\"}")).andExpect(status().isCreated());

        Consent consent = recorded();
        assertEquals(consent.getRecordedAt(), consent.getAcceptedAt());
    }

    @Test
    void refusesAnAcceptanceTimeInTheFuture() throws Exception {
        String future = Instant.now().plusSeconds(3600).toString();

        mockMvc.perform(record("{\"policyVersion\":\"1.0\",\"scope\":\"core\",\"acceptedAt\":\"" + future + "\"}"))
                .andExpect(status().isBadRequest());

        verify(consentRepository, never()).add(anyString(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"scope\":\"core\"}",
            "{\"policyVersion\":\"1.0\"}",
            "{\"policyVersion\":\"1.0\",\"scope\":\"marketing\"}",
            "{\"policyVersion\":\"1.0\",\"scope\":\"voiceSync\"}",
            "{\"policyVersion\":\"<script>\",\"scope\":\"core\"}",
            "{\"policyVersion\":\"1.0\",\"scope\":\"core\",\"acceptedAt\":\"yesterday\"}"
    })
    void refusesAnInvalidConsent(String body) throws Exception {
        mockMvc.perform(record(body)).andExpect(status().isBadRequest());

        verify(consentRepository, never()).add(anyString(), any());
    }

    @Test
    void refusesWithoutAToken() throws Exception {
        mockMvc.perform(post("/api/consents").contentType(MediaType.APPLICATION_JSON).content("{\"policyVersion\":\"1.0\",\"scope\":\"core\"}"))
                .andExpect(status().isUnauthorized());
    }
}
