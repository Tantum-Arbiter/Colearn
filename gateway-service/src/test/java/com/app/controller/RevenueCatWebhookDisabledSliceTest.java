package com.app.controller;

import com.app.service.EntitlementService;
import com.app.testsupport.SecuredWebMvcTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = RevenueCatWebhookController.class)
@SecuredWebMvcTest
@TestPropertySource(properties = "app.revenuecat.webhook-secret=")
class RevenueCatWebhookDisabledSliceTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    EntitlementService entitlementService;

    @Test
    void isSwitchedOffUntilASecretIsConfigured() throws Exception {
        mockMvc.perform(post("/webhooks/revenuecat").header("Authorization", "Bearer ")
                        .contentType(MediaType.APPLICATION_JSON).content(RevenueCatWebhookSliceTest.BODY))
                .andExpect(status().isServiceUnavailable());

        verify(entitlementService, never()).apply(any());
    }
}
