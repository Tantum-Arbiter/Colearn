package com.app.controller;

import com.app.config.JwtConfig;
import com.app.security.RateLimitingFilter;
import com.app.service.ContentAnalyticsService;
import com.app.testsupport.SecuredWebMvcTest;
import com.app.testsupport.TestTokens;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AnalyticsController.class)
@SecuredWebMvcTest
class AnalyticsControllerSliceTest {

    private static final String EVENTS = "/api/analytics/events";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtConfig jwtConfig;

    @Autowired
    private RateLimitingFilter rateLimitingFilter;

    @MockitoBean
    private ContentAnalyticsService contentAnalyticsService;

    @BeforeEach
    void setUp() {
        rateLimitingFilter.resetForTests();
        when(contentAnalyticsService.processBatch(any())).thenReturn(1);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private MockHttpServletRequestBuilder appBatch(String body) {
        return post(EVENTS)
                .header("Authorization", "Bearer " + TestTokens.accessToken(jwtConfig, "user-1"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body);
    }

    private static String batchWith(String event, String propertyValue) {
        return """
                {"sessionId":"s-1","platform":"ios","appVersion":"1.4.0","locale":"en",
                 "events":[{"event":"%s","properties":{"reason":"%s"}}]}
                """.formatted(event, propertyValue);
    }

    @Test
    void acceptsTheBatchExactlyAsTheAppSendsIt() throws Exception {
        String body = batchWith("story_opened", "tap");

        mockMvc.perform(appBatch(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("accepted"));

        verify(contentAnalyticsService).processBatch(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "subscription_overlay_shown",
            "subscription_purchase_started",
            "description_viewed"
    })
    void acceptsRealEventNamesThatContainScriptLikeWords(String event) throws Exception {
        String body = batchWith(event, "tap");

        mockMvc.perform(appBatch(body)).andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"Bath; then story", "I <3 owls", "Mum & Dad", "#1 favourite", "a | b"})
    void acceptsPropertyValuesWithPunctuation(String value) throws Exception {
        String body = batchWith("app_error", value);

        mockMvc.perform(appBatch(body)).andExpect(status().isOk());
    }

    @Test
    void acceptsTheBatchWithoutDeviceHeadersBecauseTheAppSendsNone() throws Exception {
        String body = batchWith("story_opened", "tap");

        mockMvc.perform(appBatch(body)).andExpect(status().isOk());
    }

    @Test
    void rejectsTheBatchWithoutAToken() throws Exception {
        String body = batchWith("story_opened", "tap");

        mockMvc.perform(post(EVENTS).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());

        verify(contentAnalyticsService, never()).processBatch(any());
    }

    @Test
    void rejectsTheBatchWithAnExpiredToken() throws Exception {
        String body = batchWith("story_opened", "tap");

        mockMvc.perform(post(EVENTS)
                        .header("Authorization", "Bearer " + TestTokens.expiredAccessToken(jwtConfig, "user-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsTheBatchWithARefreshTokenInPlaceOfAnAccessToken() throws Exception {
        String body = batchWith("story_opened", "tap");

        mockMvc.perform(post(EVENTS)
                        .header("Authorization", "Bearer " + TestTokens.refreshToken(jwtConfig, "user-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"sessionId\":\"s\",\"platform\":\"ios\",\"events\":[]}",
            "{\"sessionId\":\"s\",\"platform\":\"ios\"}",
            "{\"platform\":\"ios\",\"events\":[{\"event\":\"a\"}]}",
            "{\"sessionId\":\"s\",\"events\":[{\"event\":\"a\"}]}",
            "{\"sessionId\":\"s\",\"platform\":\"ios\",\"events\":[{\"event\":\" \"}]}",
            "{\"sessionId\":\"s\",\"platform\":\"ios\",\"events\":[{\"event\":\"a\"}",
            "not json"
    })
    void rejectsAnInvalidBatchWith400(String body) throws Exception {
        mockMvc.perform(appBatch(body)).andExpect(status().isBadRequest());

        verify(contentAnalyticsService, never()).processBatch(any());
    }

    @Test
    void acceptsFiveHundredEvents() throws Exception {
        mockMvc.perform(appBatch(batchOf(500))).andExpect(status().isOk());
    }

    @Test
    void rejectsFiveHundredAndOneEvents() throws Exception {
        mockMvc.perform(appBatch(batchOf(501))).andExpect(status().isBadRequest());
    }

    @Test
    void ignoresUnknownFieldsFromANewerApp() throws Exception {
        String body = """
                {"sessionId":"s-1","platform":"ios","futureField":true,
                 "events":[{"event":"story_opened","newProperty":1}]}
                """;

        mockMvc.perform(appBatch(body)).andExpect(status().isOk());
    }

    private static String batchOf(int count) {
        StringBuilder events = new StringBuilder();
        for (int i = 0; i < count; i++) {
            if (i > 0) {
                events.append(',');
            }
            events.append("{\"event\":\"story_opened\"}");
        }
        return "{\"sessionId\":\"s-1\",\"platform\":\"ios\",\"events\":[" + events + "]}";
    }
}
