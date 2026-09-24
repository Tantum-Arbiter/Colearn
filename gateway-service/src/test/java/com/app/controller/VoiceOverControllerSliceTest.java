package com.app.controller;

import com.app.config.JwtConfig;
import com.app.dto.VoiceUploadRequest;
import com.app.exception.ErrorCode;
import com.app.exception.GatewayException;
import com.app.security.RateLimitingFilter;
import com.app.service.VoiceStorage;
import com.app.service.VoiceSyncService;
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

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = VoiceOverController.class)
@SecuredWebMvcTest
class VoiceOverControllerSliceTest {

    private static final String USER = "user-9";

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JwtConfig jwtConfig;

    @Autowired
    RateLimitingFilter rateLimitingFilter;

    @MockitoBean
    VoiceSyncService voiceSyncService;

    @MockitoBean
    VoiceStorage voiceStorage;

    @BeforeEach
    void setUp() {
        rateLimitingFilter.resetForTests();
        when(voiceStorage.configured()).thenReturn(true);
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

    @Test
    void signsTheUploadsForAVoiceOver() throws Exception {
        when(voiceSyncService.prepareUpload(eq(USER), eq("vo_1"), any())).thenReturn(new VoiceSyncService.UploadPlan(
                List.of(new VoiceSyncService.PageUpload(1, "https://upload/1", "audio/mp4", 1000)), 1000, 209715200));

        mockMvc.perform(signedIn(post("/api/voice-overs/vo_1/uploads"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"storyId\":\"snowy\",\"label\":\"Mum\",\"pages\":[{\"pageIndex\":1,\"bytes\":1000}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.uploads[0].pageIndex").value(1))
                .andExpect(jsonPath("$.uploads[0].url").value("https://upload/1"))
                .andExpect(jsonPath("$.uploads[0].headers['Content-Type']").value("audio/mp4"))
                .andExpect(jsonPath("$.uploads[0].headers['x-goog-content-length-range']").value("0,1000"))
                .andExpect(jsonPath("$.usedBytes").value(1000))
                .andExpect(jsonPath("$.limitBytes").value(209715200));

        ArgumentCaptor<VoiceUploadRequest> captor = ArgumentCaptor.forClass(VoiceUploadRequest.class);
        verify(voiceSyncService).prepareUpload(eq(USER), eq("vo_1"), captor.capture());
        assertEquals("snowy", captor.getValue().storyId());
        assertEquals(1000, captor.getValue().pages().get(0).bytes());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"label\":\"Mum\",\"pages\":[{\"pageIndex\":1,\"bytes\":1000}]}",
            "{\"storyId\":\"snowy\",\"label\":\"Mum\",\"pages\":[]}",
            "{\"storyId\":\"snowy\",\"label\":\"Mum\",\"pages\":[{\"pageIndex\":-1,\"bytes\":1000}]}",
            "{\"storyId\":\"snowy\",\"label\":\"Mum\",\"pages\":[{\"pageIndex\":1,\"bytes\":0}]}",
            "{\"storyId\":\"Snowy Day\",\"label\":\"Mum\",\"pages\":[{\"pageIndex\":1,\"bytes\":1000}]}",
            "{\"storyId\":\"snowy\",\"label\":\"a label far longer than forty characters in all\",\"pages\":[{\"pageIndex\":1,\"bytes\":1000}]}"
    })
    void refusesAnUploadRequestThatIsNotWellFormed(String body) throws Exception {
        mockMvc.perform(signedIn(post("/api/voice-overs/vo_1/uploads")).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());

        verify(voiceSyncService, never()).prepareUpload(anyString(), anyString(), any());
    }

    @Test
    void saysSoWhenTheAccountIsFull() throws Exception {
        when(voiceSyncService.prepareUpload(eq(USER), eq("vo_1"), any()))
                .thenThrow(new GatewayException(ErrorCode.VOICE_QUOTA_EXCEEDED, "full"));

        mockMvc.perform(signedIn(post("/api/voice-overs/vo_1/uploads"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"storyId\":\"snowy\",\"label\":\"Mum\",\"pages\":[{\"pageIndex\":1,\"bytes\":1000}]}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("GTW-419"));
    }

    @Test
    void saysSoWhenTheParentHasNotAgreed() throws Exception {
        when(voiceSyncService.list(USER)).thenThrow(new GatewayException(ErrorCode.VOICE_SYNC_NOT_CONSENTED, "no"));

        mockMvc.perform(signedIn(get("/api/voice-overs")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("GTW-418"));
    }

    @Test
    void listsTheAccountsVoiceOvers() throws Exception {
        when(voiceSyncService.list(USER)).thenReturn(List.of(new VoiceSyncService.VoiceOverListing(
                "vo_1", "snowy", "Mum", List.of(new VoiceSyncService.PageLink(1, 1000, "https://download/1")))));

        mockMvc.perform(signedIn(get("/api/voice-overs")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.voiceOvers[0].id").value("vo_1"))
                .andExpect(jsonPath("$.voiceOvers[0].pages[0].url").value("https://download/1"));
    }

    @Test
    void deletesOneVoiceOver() throws Exception {
        mockMvc.perform(signedIn(delete("/api/voice-overs/vo_1"))).andExpect(status().isNoContent());

        verify(voiceSyncService).delete(USER, "vo_1");
    }

    @Test
    void deletesEveryVoiceOver() throws Exception {
        mockMvc.perform(signedIn(delete("/api/voice-overs"))).andExpect(status().isNoContent());

        verify(voiceSyncService).deleteAll(USER);
    }

    @Test
    void isSwitchedOffUntilABucketIsConfigured() throws Exception {
        when(voiceStorage.configured()).thenReturn(false);

        mockMvc.perform(signedIn(get("/api/voice-overs"))).andExpect(status().isServiceUnavailable());
        mockMvc.perform(signedIn(delete("/api/voice-overs"))).andExpect(status().isServiceUnavailable());

        verify(voiceSyncService, never()).list(anyString());
    }

    @Test
    void refusesWithoutAToken() throws Exception {
        mockMvc.perform(get("/api/voice-overs")).andExpect(status().isUnauthorized());
    }
}
