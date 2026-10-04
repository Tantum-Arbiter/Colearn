package com.app.controller;

import com.app.config.JwtConfig;
import com.app.model.Story;
import com.app.repository.DownloadRepository;
import com.app.repository.EntitlementRepository;
import com.app.security.RateLimitingFilter;
import com.app.service.AchievementService;
import com.app.service.AssetService;
import com.app.service.DownloadAccessService;
import com.app.service.EntitlementService;
import com.app.service.RevenueCatClient;
import com.app.service.StoryService;
import com.app.service.Tier;
import com.app.testsupport.SecuredWebMvcTest;
import com.app.testsupport.TestTokens;
import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = {StoryController.class, EntitlementController.class})
@SecuredWebMvcTest
@Import({DownloadAccessService.class, EntitlementService.class})
@TestPropertySource(properties = "app.entitlements.enforce=true")
class EntitlementSpoofingSliceTest {

    private static final String USER = "user-free";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JwtConfig jwtConfig;

    @Autowired
    RateLimitingFilter rateLimitingFilter;

    @MockitoBean
    StoryService storyService;

    @MockitoBean
    AssetService assetService;

    @MockitoBean
    AchievementService achievementService;

    @MockitoBean
    RevenueCatClient revenueCat;

    @MockitoBean
    EntitlementRepository entitlementRepository;

    @MockitoBean
    DownloadRepository downloadRepository;

    @BeforeEach
    void setUp() {
        rateLimitingFilter.resetForTests();
        Story paid = new Story();
        paid.setId("paid-story");
        paid.setAvailable(true);
        paid.setPremium(true);
        paid.setPages(List.of());
        when(storyService.getStoryById("paid-story")).thenReturn(CompletableFuture.completedFuture(Optional.of(paid)));
        when(revenueCat.lookup(USER)).thenReturn(new RevenueCatClient.Lookup(Tier.FREE, null, false));
        when(entitlementRepository.find(anyString())).thenReturn(CompletableFuture.completedFuture(Optional.empty()));
        when(entitlementRepository.update(anyString(), any())).thenReturn(CompletableFuture.completedFuture(true));
        when(downloadRepository.has(anyString(), anyString())).thenReturn(CompletableFuture.completedFuture(false));
        when(downloadRepository.count(anyString())).thenReturn(CompletableFuture.completedFuture(0L));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private MockHttpServletRequestBuilder withClientHeaders(MockHttpServletRequestBuilder request, String token) {
        return request
                .header("Authorization", "Bearer " + token)
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.4.0")
                .header("X-Device-ID", "device-1234");
    }

    private MockHttpServletRequestBuilder asFreeFamily(MockHttpServletRequestBuilder request) {
        return withClientHeaders(request, TestTokens.accessToken(jwtConfig, USER));
    }

    @Test
    void aFamilyRevenueCatSaysIsFreeIsRefusedAPaidStory() throws Exception {
        mockMvc.perform(asFreeFamily(get("/api/stories/paid-story/download")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("GTW-416"));
    }

    @Test
    void claimingPremiumInHeadersParametersOrCookiesChangesNothing() throws Exception {
        mockMvc.perform(asFreeFamily(get("/api/stories/paid-story/download"))
                        .param("tier", "premium")
                        .param("isPremium", "true")
                        .param("entitlement", "premium_access")
                        .header("X-Subscription-Tier", "premium")
                        .header("X-Entitlement", "premium_access")
                        .header("X-RevenueCat-Entitlements", "{\"premium_access\":{\"expires_date\":null}}")
                        .cookie(new jakarta.servlet.http.Cookie("tier", "premium")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("GTW-416"));
    }

    @Test
    void aTokenTheAppSignedItselfWithAPremiumClaimIsNotAccepted() throws Exception {
        Instant now = Instant.now();
        String forged = JWT.create()
                .withIssuer("grow-with-freya-gateway")
                .withSubject(USER)
                .withClaim("type", "access")
                .withClaim("tier", "premium")
                .withIssuedAt(Date.from(now))
                .withExpiresAt(Date.from(now.plusSeconds(600)))
                .sign(Algorithm.HMAC256("a-secret-the-app-made-up"));

        mockMvc.perform(withClientHeaders(get("/api/stories/paid-story/download"), forged))
                .andExpect(status().isUnauthorized());
        verify(revenueCat, never()).lookup(anyString());
    }

    @Test
    void aRefreshCannotBeToldTheAnswer_itAsksRevenueCat() throws Exception {
        mockMvc.perform(asFreeFamily(post("/api/entitlements/refresh"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tier\":\"premium\",\"expiresAt\":\"2099-01-01T00:00:00Z\",\"entitlements\":{\"premium_access\":{}}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tier").value("free"))
                .andExpect(jsonPath("$.source").value("revenuecat"));

        mockMvc.perform(asFreeFamily(get("/api/stories/paid-story/download")))
                .andExpect(status().isForbidden());
    }
}
