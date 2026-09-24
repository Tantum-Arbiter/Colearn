package com.app.controller;

import com.app.service.DownloadAccessService;
import com.app.testsupport.SecuredWebMvcTest;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = StoryController.class)
@SecuredWebMvcTest
class StoryDownloadSliceTest extends StoryDownloadSliceSupport {

    @Test
    void returnsTheStoryAndRemembersTheDeviceHoldsIt() throws Exception {
        mockMvc.perform(signedIn(get("/api/stories/story-1/download")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("story-1"))
                .andExpect(jsonPath("$.title").value("The Sleepy Forest"));

        verify(downloadAccessService).check(eq(USER), eq(paid));
        verify(downloadAccessService).recordDownload(USER, "story-1");
    }

    @Test
    void anUnknownStoryIsNotFound() throws Exception {
        when(storyService.getStoryById("non-existent")).thenReturn(CompletableFuture.completedFuture(Optional.empty()));

        mockMvc.perform(signedIn(get("/api/stories/non-existent/download")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("GTW-100"));
    }

    @Test
    void aWithdrawnStoryIsForbidden() throws Exception {
        paid.setAvailable(false);

        mockMvc.perform(signedIn(get("/api/stories/story-1/download")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("GTW-100"));
        verify(downloadAccessService, never()).recordDownload(anyString(), anyString());
    }

    @Test
    void aStorageFailureIsAServerError() throws Exception {
        when(storyService.getStoryById("story-1")).thenReturn(CompletableFuture.failedFuture(new RuntimeException("Database error")));

        mockMvc.perform(signedIn(get("/api/stories/story-1/download")))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.errorCode").value("GTW-201"));
    }

    @Test
    void stillReturnsTheStoryWhenTheHoldingCannotBeRecorded() throws Exception {
        when(downloadAccessService.recordDownload(anyString(), anyString())).thenReturn(CompletableFuture.failedFuture(new IllegalStateException("down")));

        mockMvc.perform(signedIn(get("/api/stories/story-1/download"))).andExpect(status().isOk());
    }

    @Test
    void refusesWithoutAToken() throws Exception {
        mockMvc.perform(get("/api/stories/story-1/download")).andExpect(status().isUnauthorized());
    }

    @Test
    void releasesAStoryTheDeviceRemoved() throws Exception {
        mockMvc.perform(signedIn(delete("/api/stories/story-1/download"))).andExpect(status().isNoContent());

        verify(downloadAccessService).release(USER, "story-1");
    }

    @Test
    void whileEnforcementIsOff_aDenialIsOnlyLogged() throws Exception {
        when(downloadAccessService.check(anyString(), any()))
                .thenReturn(CompletableFuture.completedFuture(DownloadAccessService.Decision.SUBSCRIPTION_REQUIRED));

        mockMvc.perform(signedIn(get("/api/stories/story-1/download"))).andExpect(status().isOk());
    }
}
