package com.app.controller;

import com.app.service.DownloadAccessService;
import com.app.testsupport.SecuredWebMvcTest;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.TestPropertySource;

import java.util.concurrent.CompletableFuture;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = StoryController.class)
@SecuredWebMvcTest
@TestPropertySource(properties = "app.entitlements.enforce=true")
class StoryDownloadEnforcedSliceTest extends StoryDownloadSliceSupport {

    @Test
    void refusesAPaidStoryWithoutASubscription() throws Exception {
        when(downloadAccessService.check(anyString(), any()))
                .thenReturn(CompletableFuture.completedFuture(DownloadAccessService.Decision.SUBSCRIPTION_REQUIRED));

        mockMvc.perform(signedIn(get("/api/stories/story-1/download")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("GTW-416"));
        verify(downloadAccessService, never()).recordDownload(anyString(), anyString());
    }

    @Test
    void refusesAStoryBeyondTheTiersLimit() throws Exception {
        when(downloadAccessService.check(anyString(), any()))
                .thenReturn(CompletableFuture.completedFuture(DownloadAccessService.Decision.LIMIT_REACHED));

        mockMvc.perform(signedIn(get("/api/stories/story-1/download")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("GTW-417"));
    }

    @Test
    void allowsWhatTheTierAllows() throws Exception {
        mockMvc.perform(signedIn(get("/api/stories/story-1/download"))).andExpect(status().isOk());
    }
}
