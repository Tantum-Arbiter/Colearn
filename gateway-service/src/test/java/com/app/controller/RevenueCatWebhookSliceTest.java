package com.app.controller;

import com.app.dto.RevenueCatWebhook;
import com.app.security.RateLimitingFilter;
import com.app.service.EntitlementService;
import com.app.testsupport.SecuredWebMvcTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = RevenueCatWebhookController.class)
@SecuredWebMvcTest
@TestPropertySource(properties = "app.revenuecat.webhook-secret=s3cret-value")
class RevenueCatWebhookSliceTest {

    static final String BODY = """
            {"api_version":"1.0","event":{"type":"INITIAL_PURCHASE","app_user_id":"user-1",
            "aliases":["$RCAnonymousID:x","user-1"],"entitlement_ids":["premium_access"],
            "expiration_at_ms":1790000000000,"event_timestamp_ms":1789000000000,
            "environment":"SANDBOX","product_id":"monthly","store":"APP_STORE","price":9.99}}
            """;

    @Autowired
    MockMvc mockMvc;

    @Autowired
    RateLimitingFilter rateLimitingFilter;

    @MockitoBean
    EntitlementService entitlementService;

    @Autowired
    com.app.service.ApplicationMetricsService metricsService;

    @BeforeEach
    void setUp() {
        rateLimitingFilter.resetForTests();
        when(entitlementService.apply(any())).thenReturn(CompletableFuture.completedFuture(EntitlementService.Outcome.APPLIED));
    }

    @Test
    void appliesAnEventRevenueCatSigned() throws Exception {
        mockMvc.perform(post("/webhooks/revenuecat").header("Authorization", "Bearer s3cret-value")
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.outcome").value("APPLIED"));

        ArgumentCaptor<RevenueCatWebhook> captor = ArgumentCaptor.forClass(RevenueCatWebhook.class);
        verify(entitlementService).apply(captor.capture());
        RevenueCatWebhook.Event event = captor.getValue().getEvent();
        assertEquals("INITIAL_PURCHASE", event.getType());
        assertEquals("user-1", event.getAppUserId());
        assertEquals(List.of("$RCAnonymousID:x", "user-1"), event.getAliases());
        assertEquals(List.of("premium_access"), event.getEntitlementIds());
        assertEquals(1790000000000L, event.getExpirationAtMs());
        assertEquals(1789000000000L, event.getEventTimestampMs());
        assertEquals("SANDBOX", event.getEnvironment());
    }

    @Test
    void neverCountsTheWebhookSecretAsAFailedSignIn() throws Exception {
        mockMvc.perform(post("/webhooks/revenuecat").header("Authorization", "Bearer s3cret-value")
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk());

        verify(metricsService, never()).recordTokenValidation(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void acceptsTheSecretWithoutABearerPrefix() throws Exception {
        mockMvc.perform(post("/webhooks/revenuecat").header("Authorization", "s3cret-value")
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk());
    }

    @Test
    void refusesTheWrongSecret() throws Exception {
        mockMvc.perform(post("/webhooks/revenuecat").header("Authorization", "Bearer s3cret-valuf")
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isUnauthorized());

        verify(entitlementService, never()).apply(any());
    }

    @Test
    void refusesAnEventWithNoSecret() throws Exception {
        mockMvc.perform(post("/webhooks/revenuecat").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isUnauthorized());

        verify(entitlementService, never()).apply(any());
    }

    @Test
    void refusesABodyWithNoEvent() throws Exception {
        mockMvc.perform(post("/webhooks/revenuecat").header("Authorization", "Bearer s3cret-value")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"api_version\":\"1.0\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void asksRevenueCatToRetryWhenTheEntitlementCannotBeStored() throws Exception {
        when(entitlementService.apply(any())).thenReturn(CompletableFuture.failedFuture(new IllegalStateException("Firestore down")));

        mockMvc.perform(post("/webhooks/revenuecat").header("Authorization", "Bearer s3cret-value")
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isInternalServerError());
    }

    @Test
    void onlyAcceptsPost() throws Exception {
        mockMvc.perform(get("/webhooks/revenuecat").header("Authorization", "Bearer s3cret-value"))
                .andExpect(status().is4xxClientError());
    }
}
