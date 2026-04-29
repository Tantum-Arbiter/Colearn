package com.app.controller;

import com.app.model.AssetVersion;
import com.app.model.ContentVersion;
import com.app.model.InteractiveElement;
import com.app.model.MusicChallenge;
import com.app.model.Story;
import com.app.model.StoryPage;
import com.app.service.ApplicationMetricsService;
import com.app.service.AssetService;
import com.app.service.GatewayServiceApplication;
import com.app.service.StoryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import com.google.cloud.Timestamp;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = GatewayServiceApplication.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class StoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private StoryService storyService;

    @MockBean
    private AssetService assetService;

    @MockBean
    private ApplicationMetricsService metricsService;

    @Autowired
    private ObjectMapper objectMapper;

    private Story testStory1;
    private Story testStory2;
    private ContentVersion testContentVersion;
    private AssetVersion testAssetVersion;

    @BeforeEach
    void setUp() {
        // Create test story 1 with interactive elements
        testStory1 = new Story();
        testStory1.setId("story-1");
        testStory1.setTitle("The Sleepy Forest");
        testStory1.setCategory("bedtime");
        testStory1.setTag("🌙 Bedtime");
        testStory1.setEmoji("🦉");
        testStory1.setAvailable(true);
        testStory1.setDescription("A peaceful bedtime story");
        testStory1.setVersion(1);
        testStory1.setChecksum("checksum1");

        // Page 1: Static page (no interaction)
        StoryPage page1 = new StoryPage();
        page1.setId("story-1-page-1");
        page1.setPageNumber(1);
        page1.setText("Once upon a time...");
        page1.setInteractionType("none");

        // Page 2: Interactive page (state change with interactive elements)
        StoryPage page2 = new StoryPage();
        page2.setId("story-1-page-2");
        page2.setPageNumber(2);
        page2.setText("What's inside this shed?");
        page2.setBackgroundImage("assets/stories/story-1/page-2/page-2.webp");
        page2.setInteractionType("interactive_state_change");

        InteractiveElement doorElement = new InteractiveElement("door", "reveal", "assets/stories/story-1/page-2/door-open.webp");
        doorElement.setPosition(new InteractiveElement.Position(0.481, 0.337));
        doorElement.setSize(new InteractiveElement.Size(0.273, 0.301));
        page2.setInteractiveElements(Arrays.asList(doorElement));

        // Page 3: Music challenge page
        StoryPage page3 = new StoryPage();
        page3.setId("story-1-page-3");
        page3.setPageNumber(3);
        page3.setText("Gary the bear needs to move the rock. Can you play the flute to help lift it?");
        page3.setBackgroundImage("assets/stories/story-1/page-3/page-3.webp");
        page3.setInteractionType("music_challenge");

        MusicChallenge challenge = new MusicChallenge();
        challenge.setEnabled(true);
        challenge.setInstrumentId("flute");
        challenge.setPromptText("Play the flute to help Gary!");
        challenge.setMode("guided");
        challenge.setRequiredSequence(Arrays.asList("C", "D", "E", "C"));
        challenge.setSuccessSongId("gary_rock_lift_theme_v1");
        challenge.setSuccessStateId("rock_moved");
        challenge.setAutoPlaySuccessSong(true);
        challenge.setAllowSkip(false);
        challenge.setMicRequired(true);
        challenge.setFallbackAllowed(true);
        challenge.setHintLevel("standard");
        page3.setMusicChallenge(challenge);

        testStory1.setPages(Arrays.asList(page1, page2, page3));

        // Create test story 2
        testStory2 = new Story();
        testStory2.setId("story-2");
        testStory2.setTitle("The Happy Day");
        testStory2.setCategory("emotions");
        testStory2.setTag("😊 Emotions");
        testStory2.setEmoji("😊");
        testStory2.setAvailable(true);
        testStory2.setDescription("A story about happiness");
        testStory2.setVersion(1);
        testStory2.setChecksum("checksum2");

        StoryPage page2Story2 = new StoryPage();
        page2Story2.setId("story-2-page-1");
        page2Story2.setPageNumber(1);
        page2Story2.setText("It was a happy day...");
        testStory2.setPages(Arrays.asList(page2Story2));

        // Create test content version
        testContentVersion = new ContentVersion();
        testContentVersion.setId("current");
        testContentVersion.setVersion(1);
        testContentVersion.setLastUpdated(Timestamp.now());
        testContentVersion.setTotalStories(2);
        Map<String, String> checksums = new HashMap<>();
        checksums.put("story-1", "checksum1");
        checksums.put("story-2", "checksum2");
        testContentVersion.setStoryChecksums(checksums);

        // Create test asset version
        testAssetVersion = new AssetVersion();
        testAssetVersion.setId("current");
        testAssetVersion.setVersion(1);
        testAssetVersion.setLastUpdated(Instant.now());
        testAssetVersion.setTotalAssets(2);
        Map<String, String> assetChecksums = new HashMap<>();
        assetChecksums.put("assets/story-1/image.webp", "asset-checksum1");
        assetChecksums.put("assets/story-2/image.webp", "asset-checksum2");
        testAssetVersion.setAssetChecksums(assetChecksums);

        // Default mock for assetService.getCurrentAssetVersion() - used by most tests
        when(assetService.getCurrentAssetVersion())
                .thenReturn(CompletableFuture.completedFuture(testAssetVersion));
    }

    @Test
    void getAllStories_Success() throws Exception {
        // Arrange
        List<Story> stories = Arrays.asList(testStory1, testStory2);
        when(storyService.getAllAvailableStories())
                .thenReturn(CompletableFuture.completedFuture(stories));

        // Act & Assert
        mockMvc.perform(get("/api/stories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value("story-1"))
                .andExpect(jsonPath("$[0].title").value("The Sleepy Forest"))
                .andExpect(jsonPath("$[1].id").value("story-2"));

        verify(storyService, times(1)).getAllAvailableStories();
    }

    @Test
    void getAllStories_EmptyList() throws Exception {
        // Arrange
        when(storyService.getAllAvailableStories())
                .thenReturn(CompletableFuture.completedFuture(Collections.emptyList()));

        // Act & Assert
        mockMvc.perform(get("/api/stories"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));

        verify(storyService, times(1)).getAllAvailableStories();
    }

    @Test
    void getAllStories_ServiceError() throws Exception {
        // Arrange
        when(storyService.getAllAvailableStories())
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("Database error")));

        // Act & Assert
        mockMvc.perform(get("/api/stories"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.errorCode").value("GTW-201"))
                .andExpect(jsonPath("$.success").value(false));

        verify(storyService, times(1)).getAllAvailableStories();
    }

    @Test
    void getStoryById_Found() throws Exception {
        // Arrange
        when(storyService.getStoryById("story-1"))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testStory1)));

        // Act & Assert
        mockMvc.perform(get("/api/stories/story-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("story-1"))
                .andExpect(jsonPath("$.title").value("The Sleepy Forest"))
                .andExpect(jsonPath("$.category").value("bedtime"))
                .andExpect(jsonPath("$.pages").isArray())
                .andExpect(jsonPath("$.pages.length()").value(3));

        verify(storyService, times(1)).getStoryById("story-1");
    }

    @Test
    void getStoryById_IncludesInteractiveElements() throws Exception {
        // Arrange
        when(storyService.getStoryById("story-1"))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testStory1)));

        // Act & Assert - Verify interactive elements are returned in response
        mockMvc.perform(get("/api/stories/story-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("story-1"))
                .andExpect(jsonPath("$.pages[1].interactiveElements").isArray())
                .andExpect(jsonPath("$.pages[1].interactiveElements.length()").value(1))
                .andExpect(jsonPath("$.pages[1].interactiveElements[0].id").value("door"))
                .andExpect(jsonPath("$.pages[1].interactiveElements[0].type").value("reveal"))
                .andExpect(jsonPath("$.pages[1].interactiveElements[0].image").value("assets/stories/story-1/page-2/door-open.webp"))
                .andExpect(jsonPath("$.pages[1].interactiveElements[0].position.x").value(0.481))
                .andExpect(jsonPath("$.pages[1].interactiveElements[0].position.y").value(0.337))
                .andExpect(jsonPath("$.pages[1].interactiveElements[0].size.width").value(0.273))
                .andExpect(jsonPath("$.pages[1].interactiveElements[0].size.height").value(0.301));

        verify(storyService, times(1)).getStoryById("story-1");
    }

    @Test
    void getStoryById_PageWithoutInteractiveElements() throws Exception {
        // Arrange
        when(storyService.getStoryById("story-1"))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testStory1)));

        // Act & Assert - Page 1 should have empty interactiveElements
        mockMvc.perform(get("/api/stories/story-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pages[0].id").value("story-1-page-1"))
                .andExpect(jsonPath("$.pages[0].interactiveElements").isArray())
                .andExpect(jsonPath("$.pages[0].interactiveElements.length()").value(0));

        verify(storyService, times(1)).getStoryById("story-1");
    }

    @Test
    void getStoryById_IncludesInteractionType() throws Exception {
        // Arrange
        when(storyService.getStoryById("story-1"))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testStory1)));

        // Act & Assert - Verify interactionType is present on each page
        mockMvc.perform(get("/api/stories/story-1"))
                .andExpect(status().isOk())
                // Page 1: static (none)
                .andExpect(jsonPath("$.pages[0].interactionType").value("none"))
                .andExpect(jsonPath("$.pages[0].musicChallenge").doesNotExist())
                // Page 2: interactive_state_change
                .andExpect(jsonPath("$.pages[1].interactionType").value("interactive_state_change"))
                .andExpect(jsonPath("$.pages[1].musicChallenge").doesNotExist())
                // Page 3: music_challenge
                .andExpect(jsonPath("$.pages[2].interactionType").value("music_challenge"))
                .andExpect(jsonPath("$.pages[2].musicChallenge").exists());

        verify(storyService, times(1)).getStoryById("story-1");
    }

    @Test
    void getStoryById_IncludesMusicChallengeMetadata() throws Exception {
        // Arrange
        when(storyService.getStoryById("story-1"))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testStory1)));

        // Act & Assert - Verify all music challenge fields on page 3
        mockMvc.perform(get("/api/stories/story-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pages[2].musicChallenge.enabled").value(true))
                .andExpect(jsonPath("$.pages[2].musicChallenge.instrumentId").value("flute"))
                .andExpect(jsonPath("$.pages[2].musicChallenge.promptText").value("Play the flute to help Gary!"))
                .andExpect(jsonPath("$.pages[2].musicChallenge.mode").value("guided"))
                .andExpect(jsonPath("$.pages[2].musicChallenge.requiredSequence").isArray())
                .andExpect(jsonPath("$.pages[2].musicChallenge.requiredSequence.length()").value(4))
                .andExpect(jsonPath("$.pages[2].musicChallenge.requiredSequence[0]").value("C"))
                .andExpect(jsonPath("$.pages[2].musicChallenge.requiredSequence[1]").value("D"))
                .andExpect(jsonPath("$.pages[2].musicChallenge.requiredSequence[2]").value("E"))
                .andExpect(jsonPath("$.pages[2].musicChallenge.requiredSequence[3]").value("C"))
                .andExpect(jsonPath("$.pages[2].musicChallenge.successSongId").value("gary_rock_lift_theme_v1"))
                .andExpect(jsonPath("$.pages[2].musicChallenge.successStateId").value("rock_moved"))
                .andExpect(jsonPath("$.pages[2].musicChallenge.autoPlaySuccessSong").value(true))
                .andExpect(jsonPath("$.pages[2].musicChallenge.allowSkip").value(false))
                .andExpect(jsonPath("$.pages[2].musicChallenge.micRequired").value(true))
                .andExpect(jsonPath("$.pages[2].musicChallenge.fallbackAllowed").value(true))
                .andExpect(jsonPath("$.pages[2].musicChallenge.hintLevel").value("standard"));

        verify(storyService, times(1)).getStoryById("story-1");
    }

    @Test
    void getStoryById_NotFound() throws Exception {
        // Arrange
        when(storyService.getStoryById("non-existent"))
                .thenReturn(CompletableFuture.completedFuture(Optional.empty()));

        // Act & Assert
        mockMvc.perform(get("/api/stories/non-existent"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.errorCode").value("GTW-100"))
                .andExpect(jsonPath("$.success").value(false));

        verify(storyService, times(1)).getStoryById("non-existent");
    }

    @Test
    void getStoryById_ServiceError() throws Exception {
        // Arrange
        when(storyService.getStoryById("story-1"))
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("Database error")));

        // Act & Assert
        mockMvc.perform(get("/api/stories/story-1"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.errorCode").value("GTW-201"))
                .andExpect(jsonPath("$.success").value(false));

        verify(storyService, times(1)).getStoryById("story-1");
    }

    @Test
    void getStoriesByCategory_Success() throws Exception {
        // Arrange
        List<Story> bedtimeStories = Arrays.asList(testStory1);
        when(storyService.getStoriesByCategory("bedtime"))
                .thenReturn(CompletableFuture.completedFuture(bedtimeStories));

        // Act & Assert
        mockMvc.perform(get("/api/stories/category/bedtime"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].category").value("bedtime"));

        verify(storyService, times(1)).getStoriesByCategory("bedtime");
    }

    @Test
    void getStoriesByCategory_EmptyList() throws Exception {
        // Arrange
        when(storyService.getStoriesByCategory("non-existent-category"))
                .thenReturn(CompletableFuture.completedFuture(Collections.emptyList()));

        // Act & Assert
        mockMvc.perform(get("/api/stories/category/non-existent-category"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(0));

        verify(storyService, times(1)).getStoriesByCategory("non-existent-category");
    }

    @Test
    void getStoriesByCategory_ServiceError() throws Exception {
        // Arrange
        when(storyService.getStoriesByCategory("bedtime"))
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("Database error")));

        // Act & Assert
        mockMvc.perform(get("/api/stories/category/bedtime"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.errorCode").value("GTW-201"))
                .andExpect(jsonPath("$.success").value(false));

        verify(storyService, times(1)).getStoriesByCategory("bedtime");
    }

    @Test
    void getCurrentContentVersion_Success() throws Exception {
        // Arrange
        when(storyService.getCurrentContentVersion())
                .thenReturn(CompletableFuture.completedFuture(testContentVersion));

        // Act & Assert
        mockMvc.perform(get("/api/stories/version"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1))
                .andExpect(jsonPath("$.totalStories").value(2))
                .andExpect(jsonPath("$.storyChecksums").exists())
                .andExpect(jsonPath("$.storyChecksums.story-1").value("checksum1"))
                .andExpect(jsonPath("$.storyChecksums.story-2").value("checksum2"));

        verify(storyService, times(1)).getCurrentContentVersion();
    }

    @Test
    void getCurrentContentVersion_ServiceError() throws Exception {
        // Arrange
        when(storyService.getCurrentContentVersion())
                .thenReturn(CompletableFuture.failedFuture(new RuntimeException("Database error")));

        // Act & Assert
        mockMvc.perform(get("/api/stories/version"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.errorCode").value("GTW-201"))
                .andExpect(jsonPath("$.success").value(false));

        verify(storyService, times(1)).getCurrentContentVersion();
    }

    @Test
    void getCurrentContentVersion_WithClientVersion_MatchingVersion_RecordsSkippedMetric() throws Exception {
        // Arrange - client version matches server version
        when(storyService.getCurrentContentVersion())
                .thenReturn(CompletableFuture.completedFuture(testContentVersion));

        // Act & Assert
        mockMvc.perform(get("/api/stories/version")
                        .param("clientVersion", "1"))  // matches testContentVersion.version
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1));

        verify(storyService, times(1)).getCurrentContentVersion();
        verify(metricsService, times(1)).recordStorySyncSkipped();
    }

    @Test
    void getCurrentContentVersion_WithClientVersion_DifferentVersion_NoSkippedMetric() throws Exception {
        // Arrange - client version is older than server version
        when(storyService.getCurrentContentVersion())
                .thenReturn(CompletableFuture.completedFuture(testContentVersion));

        // Act & Assert
        mockMvc.perform(get("/api/stories/version")
                        .param("clientVersion", "0"))  // older than testContentVersion.version (1)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1));

        verify(storyService, times(1)).getCurrentContentVersion();
        verify(metricsService, never()).recordStorySyncSkipped();
    }

    @Test
    void getCurrentContentVersion_WithoutClientVersion_NoSkippedMetric() throws Exception {
        // Arrange - no client version provided
        when(storyService.getCurrentContentVersion())
                .thenReturn(CompletableFuture.completedFuture(testContentVersion));

        // Act & Assert
        mockMvc.perform(get("/api/stories/version"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1));

        verify(storyService, times(1)).getCurrentContentVersion();
        verify(metricsService, never()).recordStorySyncSkipped();
    }

    @Test
    void getCurrentContentVersion_WithInvalidClientVersion_BadRequest() throws Exception {
        // Act & Assert - non-numeric clientVersion should fail validation
        mockMvc.perform(get("/api/stories/version")
                        .param("clientVersion", "not-a-number"))
                .andExpect(status().isBadRequest());

        verify(storyService, never()).getCurrentContentVersion();
    }

    @Test
    void getCurrentContentVersion_WithNegativeClientVersion_Success() throws Exception {
        // Negative version is technically valid (just means very old client)
        when(storyService.getCurrentContentVersion())
                .thenReturn(CompletableFuture.completedFuture(testContentVersion));

        // Act & Assert
        mockMvc.perform(get("/api/stories/version")
                        .param("clientVersion", "-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(1));

        verify(storyService, times(1)).getCurrentContentVersion();
        verify(metricsService, never()).recordStorySyncSkipped();
    }

    // Tests for /api/stories/sync endpoint were removed when the endpoint was deprecated
    // in favor of /api/stories/delta batch endpoint. See delta tests above.
}
