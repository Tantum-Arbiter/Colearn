package com.app.controller;

import com.app.config.JwtConfig;
import com.app.security.RateLimitingFilter;
import com.app.service.ApplicationMetricsService;
import com.app.service.EntitlementService;
import com.app.service.Tier;
import com.app.testsupport.SecuredWebMvcTest;
import com.app.testsupport.TestTokens;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = EntitlementController.class)
@SecuredWebMvcTest
class EntitlementControllerSliceTest {

    private static final String USER = "user-5";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JwtConfig jwtConfig;

    @Autowired
    RateLimitingFilter rateLimitingFilter;

    @Autowired
    ApplicationMetricsService metricsService;

    @MockitoBean
    EntitlementService entitlementService;

    @BeforeEach
    void setUp() {
        rateLimitingFilter.resetForTests();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private MockHttpServletRequestBuilder signedIn(MockHttpServletRequestBuilder request) {
        return request
                .header("Authorization", "Bearer " + TestTokens.accessToken(jwtConfig, USER))
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.4.0")
                .header("X-Device-ID", "device-1234");
    }

    @ParameterizedTest
    @CsvSource({
            "PREMIUM, revenuecat, premium",
            "BASIC, cache, basic",
            "FREE, revenuecat, free",
            "PREMIUM, stale_cache, premium"
    })
    void refreshesTheSignedInFamilysSubscription_andSaysWhereTheAnswerCameFrom(Tier tier, String source, String shown) throws Exception {
        when(entitlementService.refresh(USER)).thenReturn(new EntitlementService.Resolution(tier, source));

        mockMvc.perform(signedIn(post("/api/entitlements/refresh")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tier").value(shown))
                .andExpect(jsonPath("$.source").value(source));

        verify(metricsService).recordEntitlementRefresh(source);
    }

    @Test
    void saysWhenTheAnswerCouldNotBeChecked() throws Exception {
        when(entitlementService.refresh(USER)).thenReturn(new EntitlementService.Resolution(Tier.PREMIUM, "unverified"));

        mockMvc.perform(signedIn(post("/api/entitlements/refresh")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("unverified"));
    }

    @Test
    void refusesWithoutAToken() throws Exception {
        mockMvc.perform(post("/api/entitlements/refresh")).andExpect(status().isUnauthorized());

        verify(entitlementService, never()).refresh(anyString());
    }

    @Test
    void onlyAcceptsPost() throws Exception {
        mockMvc.perform(signedIn(get("/api/entitlements/refresh"))).andExpect(status().is4xxClientError());

        verify(entitlementService, never()).refresh(anyString());
    }
}
