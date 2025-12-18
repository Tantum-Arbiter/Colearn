package com.app.service;

import com.app.model.ContentVersion;
import com.app.model.Story;
import com.app.model.StoryPage;
import com.app.repository.ContentVersionRepository;
import com.app.repository.StoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for StoryService
 */
@ExtendWith(MockitoExtension.class)
class StoryServiceTest {

    @Mock
    private StoryRepository storyRepository;

    @Mock
    private ContentVersionRepository contentVersionRepository;

    private StoryService storyService;
    private Story testStory1;
    private Story testStory2;
    private ContentVersion testContentVersion;

    @BeforeEach
    void setUp() {
        storyService = new StoryService(storyRepository, contentVersionRepository);

        // Create test story 1
        testStory1 = new Story();
        testStory1.setId("story-1");
        testStory1.setTitle("The Sleepy Forest");
        testStory1.setCategory("bedtime");
        testStory1.setTag("🌙");
        testStory1.setEmoji("🌙");
        testStory1.setAvailable(true);
        testStory1.setDescription("A peaceful bedtime story");
        testStory1.setVersion(1);
        testStory1.setCreatedAt(Instant.now());
        testStory1.setUpdatedAt(Instant.now());

        // Add pages to story 1
        List<StoryPage> pages1 = new ArrayList<>();
        StoryPage page1 = new StoryPage();
        page1.setId("page-1");
        page1.setPageNumber(1);
        page1.setText("Once upon a time in a sleepy forest...");
        pages1.add(page1);
        testStory1.setPages(pages1);

        // Create test story 2
        testStory2 = new Story();
        testStory2.setId("story-2");
        testStory2.setTitle("The Happy Day");
        testStory2.setCategory("emotions");
        testStory2.setTag("😊");
        testStory2.setEmoji("😊");
        testStory2.setAvailable(true);
        testStory2.setDescription("A story about happiness");
        testStory2.setVersion(1);
        testStory2.setCreatedAt(Instant.now());
        testStory2.setUpdatedAt(Instant.now());

        // Add pages to story 2
        List<StoryPage> pages2 = new ArrayList<>();
        StoryPage page2 = new StoryPage();
        page2.setId("page-2");
        page2.setPageNumber(1);
        page2.setText("Today was a happy day...");
        pages2.add(page2);
        testStory2.setPages(pages2);

        // Create test content version
        testContentVersion = new ContentVersion();
        testContentVersion.setId("current");
        testContentVersion.setVersion(1);
        testContentVersion.setLastUpdated(Instant.now());
        testContentVersion.setTotalStories(2);

        Map<String, String> checksums = new HashMap<>();
        checksums.put("story-1", "checksum1");
        checksums.put("story-2", "checksum2");
        testContentVersion.setStoryChecksums(checksums);
    }

    @Test
    void getAllAvailableStories_Success() throws Exception {
        // Arrange
        List<Story> stories = Arrays.asList(testStory1, testStory2);
        when(storyRepository.findAvailable()).thenReturn(CompletableFuture.completedFuture(stories));

        // Act
        CompletableFuture<List<Story>> result = storyService.getAllAvailableStories();

        // Assert
        assertNotNull(result);
        List<Story> resultStories = result.get();
        assertEquals(2, resultStories.size());
        assertTrue(resultStories.contains(testStory1));
        assertTrue(resultStories.contains(testStory2));
        verify(storyRepository, times(1)).findAvailable();
    }

    @Test
    void getStoryById_Found() throws Exception {
        // Arrange
        when(storyRepository.findById("story-1"))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testStory1)));

        // Act
        CompletableFuture<Optional<Story>> result = storyService.getStoryById("story-1");

        // Assert
        assertNotNull(result);
        Optional<Story> resultStory = result.get();
        assertTrue(resultStory.isPresent());
        assertEquals("story-1", resultStory.get().getId());
        assertEquals("The Sleepy Forest", resultStory.get().getTitle());
        verify(storyRepository, times(1)).findById("story-1");
    }

    @Test
    void getStoryById_NotFound() throws Exception {
        // Arrange
        when(storyRepository.findById("non-existent"))
                .thenReturn(CompletableFuture.completedFuture(Optional.empty()));

        // Act
        CompletableFuture<Optional<Story>> result = storyService.getStoryById("non-existent");

        // Assert
        assertNotNull(result);
        Optional<Story> resultStory = result.get();
        assertFalse(resultStory.isPresent());
        verify(storyRepository, times(1)).findById("non-existent");
    }

    @Test
    void getStoriesByCategory_Success() throws Exception {
        // Arrange
        List<Story> bedtimeStories = Collections.singletonList(testStory1);
        when(storyRepository.findByCategory("bedtime"))
                .thenReturn(CompletableFuture.completedFuture(bedtimeStories));

        // Act
        CompletableFuture<List<Story>> result = storyService.getStoriesByCategory("bedtime");

        // Assert
        assertNotNull(result);
        List<Story> resultStories = result.get();
        assertEquals(1, resultStories.size());
        assertEquals("bedtime", resultStories.get(0).getCategory());
        verify(storyRepository, times(1)).findByCategory("bedtime");
    }

    @Test
    void getCurrentContentVersion_Exists() throws Exception {
        // Arrange
        when(contentVersionRepository.getCurrent())
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testContentVersion)));

        // Act
        CompletableFuture<ContentVersion> result = storyService.getCurrentContentVersion();

        // Assert
        assertNotNull(result);
        ContentVersion version = result.get();
        assertEquals("current", version.getId());
        assertEquals(1, version.getVersion());
        assertEquals(2, version.getTotalStories());
        verify(contentVersionRepository, times(1)).getCurrent();
    }

    @Test
    void getCurrentContentVersion_NotExists_ReturnsEmpty() throws Exception {
        // Arrange
        when(contentVersionRepository.getCurrent())
                .thenReturn(CompletableFuture.completedFuture(Optional.empty()));

        // Act
        CompletableFuture<ContentVersion> result = storyService.getCurrentContentVersion();

        // Assert
        assertNotNull(result);
        ContentVersion version = result.get();
        assertNotNull(version);
        assertEquals("current", version.getId()); // New ContentVersion has default id
        assertEquals(1, version.getVersion()); // Default version
        assertEquals(0, version.getTotalStories()); // No stories yet
        verify(contentVersionRepository, times(1)).getCurrent();
    }

    @Test
    void getStoriesToSync_NoContentVersion_ReturnsAllStories() throws Exception {
        // Arrange
        List<Story> allStories = Arrays.asList(testStory1, testStory2);
        when(contentVersionRepository.getCurrent())
                .thenReturn(CompletableFuture.completedFuture(Optional.empty()));
        when(storyRepository.findAvailable())
                .thenReturn(CompletableFuture.completedFuture(allStories));

        Map<String, String> clientChecksums = new HashMap<>();

        // Act
        CompletableFuture<List<Story>> result = storyService.getStoriesToSync(clientChecksums);

        // Assert
        assertNotNull(result);
        List<Story> resultStories = result.get();
        assertEquals(2, resultStories.size());
        verify(contentVersionRepository, times(1)).getCurrent();
        verify(storyRepository, times(1)).findAvailable();
    }

    @Test
    void getStoriesToSync_ClientHasNoStories_ReturnsAllStories() throws Exception {
        // Arrange
        when(contentVersionRepository.getCurrent())
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testContentVersion)));
        when(storyRepository.findById("story-1"))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testStory1)));
        when(storyRepository.findById("story-2"))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testStory2)));

        Map<String, String> clientChecksums = new HashMap<>(); // Empty - client has no stories

        // Act
        CompletableFuture<List<Story>> result = storyService.getStoriesToSync(clientChecksums);

        // Assert
        assertNotNull(result);
        List<Story> resultStories = result.get();
        assertEquals(2, resultStories.size());
        verify(contentVersionRepository, times(1)).getCurrent();
        verify(storyRepository, times(1)).findById("story-1");
        verify(storyRepository, times(1)).findById("story-2");
    }

    @Test
    void getStoriesToSync_ClientHasMatchingChecksums_ReturnsEmpty() throws Exception {
        // Arrange
        when(contentVersionRepository.getCurrent())
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testContentVersion)));

        Map<String, String> clientChecksums = new HashMap<>();
        clientChecksums.put("story-1", "checksum1"); // Matches server
        clientChecksums.put("story-2", "checksum2"); // Matches server

        // Act
        CompletableFuture<List<Story>> result = storyService.getStoriesToSync(clientChecksums);

        // Assert
        assertNotNull(result);
        List<Story> resultStories = result.get();
        assertEquals(0, resultStories.size()); // No stories to sync
        verify(contentVersionRepository, times(1)).getCurrent();
        verify(storyRepository, never()).findById(anyString()); // No stories fetched
    }

    @Test
    void getStoriesToSync_ClientHasOutdatedChecksum_ReturnsChangedStory() throws Exception {
        // Arrange
        when(contentVersionRepository.getCurrent())
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testContentVersion)));
        when(storyRepository.findById("story-1"))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testStory1)));

        Map<String, String> clientChecksums = new HashMap<>();
        clientChecksums.put("story-1", "old-checksum"); // Outdated
        clientChecksums.put("story-2", "checksum2"); // Matches server

        // Act
        CompletableFuture<List<Story>> result = storyService.getStoriesToSync(clientChecksums);

        // Assert
        assertNotNull(result);
        List<Story> resultStories = result.get();
        assertEquals(1, resultStories.size());
        assertEquals("story-1", resultStories.get(0).getId());
        verify(contentVersionRepository, times(1)).getCurrent();
        verify(storyRepository, times(1)).findById("story-1");
        verify(storyRepository, never()).findById("story-2"); // story-2 not fetched
    }

    @Test
    void saveStory_Success() throws Exception {
        // Arrange
        when(storyRepository.save(any(Story.class)))
                .thenReturn(CompletableFuture.completedFuture(testStory1));
        when(contentVersionRepository.updateStoryChecksum(anyString(), anyString()))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Act
        CompletableFuture<Story> result = storyService.saveStory(testStory1);

        // Assert
        assertNotNull(result);
        Story savedStory = result.get();
        assertEquals("story-1", savedStory.getId());
        assertEquals("The Sleepy Forest", savedStory.getTitle());
        verify(storyRepository, times(1)).save(testStory1);
        verify(contentVersionRepository, times(1)).updateStoryChecksum(eq("story-1"), anyString());
    }

    @Test
    void updateStory_Success() throws Exception {
        // Arrange
        Story updatedStory = new Story();
        updatedStory.setId("story-1");
        updatedStory.setTitle("The Sleepy Forest - Updated");
        updatedStory.setCategory("bedtime");
        updatedStory.setVersion(2); // Version incremented

        when(storyRepository.update(any(Story.class)))
                .thenReturn(CompletableFuture.completedFuture(updatedStory));
        when(contentVersionRepository.updateStoryChecksum(anyString(), anyString()))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Act
        CompletableFuture<Story> result = storyService.updateStory(updatedStory);

        // Assert
        assertNotNull(result);
        Story resultStory = result.get();
        assertEquals("story-1", resultStory.getId());
        assertEquals("The Sleepy Forest - Updated", resultStory.getTitle());
        assertEquals(2, resultStory.getVersion());
        verify(storyRepository, times(1)).update(updatedStory);
        verify(contentVersionRepository, times(1)).updateStoryChecksum(eq("story-1"), anyString());
    }

    @Test
    void deleteStory_Success() throws Exception {
        // Arrange
        when(storyRepository.delete("story-1"))
                .thenReturn(CompletableFuture.completedFuture(null));
        when(contentVersionRepository.removeStoryChecksum("story-1"))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Act
        CompletableFuture<Void> result = storyService.deleteStory("story-1");

        // Assert
        assertNotNull(result);
        result.get(); // Should complete without exception
        verify(storyRepository, times(1)).delete("story-1");
        verify(contentVersionRepository, times(1)).removeStoryChecksum("story-1");
    }

    @Test
    void saveStory_UpdatesChecksumInContentVersion() throws Exception {
        // Arrange
        when(storyRepository.save(any(Story.class)))
                .thenReturn(CompletableFuture.completedFuture(testStory1));
        when(contentVersionRepository.updateStoryChecksum(anyString(), anyString()))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Act
        CompletableFuture<Story> result = storyService.saveStory(testStory1);

        // Assert
        result.get();
        // Verify that updateStoryChecksum was called with the story ID and a checksum
        verify(contentVersionRepository, times(1)).updateStoryChecksum(
                eq("story-1"),
                argThat(checksum -> checksum != null && checksum.length() == 64) // SHA-256 = 64 hex chars
        );
    }

    @Test
    void updateStory_RecalculatesChecksum() throws Exception {
        // Arrange
        Story originalStory = new Story();
        originalStory.setId("story-1");
        originalStory.setTitle("Original Title");
        originalStory.setCategory("bedtime");
        originalStory.setVersion(1);

        Story updatedStory = new Story();
        updatedStory.setId("story-1");
        updatedStory.setTitle("Updated Title"); // Changed
        updatedStory.setCategory("bedtime");
        updatedStory.setVersion(2);

        when(storyRepository.update(any(Story.class)))
                .thenReturn(CompletableFuture.completedFuture(updatedStory));
        when(contentVersionRepository.updateStoryChecksum(anyString(), anyString()))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Act
        CompletableFuture<Story> result = storyService.updateStory(updatedStory);

        // Assert
        result.get();
        // Verify checksum was recalculated and updated
        verify(contentVersionRepository, times(1)).updateStoryChecksum(
                eq("story-1"),
                argThat(checksum -> checksum != null && checksum.length() == 64)
        );
    }

    @Test
    void getStoriesToSync_MixedScenario() throws Exception {
        // Arrange
        when(contentVersionRepository.getCurrent())
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testContentVersion)));
        when(storyRepository.findById("story-1"))
                .thenReturn(CompletableFuture.completedFuture(Optional.of(testStory1)));

        Map<String, String> clientChecksums = new HashMap<>();
        clientChecksums.put("story-1", "old-checksum"); // Outdated - needs sync
        clientChecksums.put("story-2", "checksum2"); // Up to date - no sync needed
        // Client doesn't have story-3 (if it existed on server)

        // Act
        CompletableFuture<List<Story>> result = storyService.getStoriesToSync(clientChecksums);

        // Assert
        assertNotNull(result);
        List<Story> resultStories = result.get();
        assertEquals(1, resultStories.size());
        assertEquals("story-1", resultStories.get(0).getId());
        verify(storyRepository, times(1)).findById("story-1");
        verify(storyRepository, never()).findById("story-2");
    }

    @Test
    void getAllAvailableStories_EmptyList() throws Exception {
        // Arrange
        when(storyRepository.findAvailable())
                .thenReturn(CompletableFuture.completedFuture(Collections.emptyList()));

        // Act
        CompletableFuture<List<Story>> result = storyService.getAllAvailableStories();

        // Assert
        assertNotNull(result);
        List<Story> resultStories = result.get();
        assertEquals(0, resultStories.size());
        verify(storyRepository, times(1)).findAvailable();
    }

    @Test
    void getStoriesByCategory_EmptyList() throws Exception {
        // Arrange
        when(storyRepository.findByCategory("non-existent-category"))
                .thenReturn(CompletableFuture.completedFuture(Collections.emptyList()));

        // Act
        CompletableFuture<List<Story>> result = storyService.getStoriesByCategory("non-existent-category");

        // Assert
        assertNotNull(result);
        List<Story> resultStories = result.get();
        assertEquals(0, resultStories.size());
        verify(storyRepository, times(1)).findByCategory("non-existent-category");
    }
}

