package com.app.controller;

import com.app.config.JwtConfig;
import com.app.model.Story;
import com.app.security.RateLimitingFilter;
import com.app.service.AchievementService;
import com.app.service.AssetService;
import com.app.service.DownloadAccessService;
import com.app.service.StoryService;
import com.app.testsupport.TestTokens;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

abstract class StoryDownloadSliceSupport {

    static final String USER = "user-7";

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
    DownloadAccessService downloadAccessService;

    Story paid;

    @BeforeEach
    void setUp() {
        rateLimitingFilter.resetForTests();
        paid = new Story();
        paid.setId("story-1");
        paid.setTitle("The Sleepy Forest");
        paid.setAvailable(true);
        paid.setPages(List.of());
        when(storyService.getStoryById("story-1")).thenReturn(CompletableFuture.completedFuture(Optional.of(paid)));
        when(downloadAccessService.check(anyString(), any())).thenReturn(CompletableFuture.completedFuture(DownloadAccessService.Decision.ALLOWED));
        when(downloadAccessService.recordDownload(anyString(), anyString())).thenReturn(CompletableFuture.completedFuture(null));
        when(downloadAccessService.release(anyString(), anyString())).thenReturn(CompletableFuture.completedFuture(null));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    MockHttpServletRequestBuilder signedIn(MockHttpServletRequestBuilder request) {
        return request
                .header("Authorization", "Bearer " + TestTokens.accessToken(jwtConfig, USER))
                .header("X-Client-Platform", "ios")
                .header("X-Client-Version", "1.4.0")
                .header("X-Device-ID", "device-1234");
    }
}
