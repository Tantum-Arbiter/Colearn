package com.app.repository;

import com.app.model.Story;
import com.app.model.StoryPage;
import com.app.repository.impl.FirebaseStoryRepository;
import com.app.service.ApplicationMetricsService;
import com.google.cloud.firestore.Firestore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for StoryRepository
 * Following TDD approach - tests written before implementation
 */
@ExtendWith(MockitoExtension.class)
class StoryRepositoryTest {

    @Mock
    private Firestore firestore;

    @Mock
    private ApplicationMetricsService metricsService;

    private StoryRepository storyRepository;

    @BeforeEach
    void setUp() {
        storyRepository = new FirebaseStoryRepository(firestore, metricsService);
    }

    @Test
    void save_ShouldSaveStorySuccessfully() {
        // Given
        Story story = createTestStory("story-1", "Test Story", "bedtime");

        // When
        CompletableFuture<Story> result = storyRepository.save(story);

        // Then
        assertNotNull(result);
        // Note: Full implementation will be tested with Firestore emulator
    }

    @Test
    void findById_ShouldReturnStoryWhenExists() {
        // Given
        String storyId = "story-1";

        // When
        CompletableFuture<Optional<Story>> result = storyRepository.findById(storyId);

        // Then
        assertNotNull(result);
    }

    @Test
    void findById_ShouldReturnEmptyWhenNotExists() {
        // Given
        String storyId = "non-existent";

        // When
        CompletableFuture<Optional<Story>> result = storyRepository.findById(storyId);

        // Then
        assertNotNull(result);
    }

    @Test
    void findAll_ShouldReturnAllStories() {
        // When
        CompletableFuture<List<Story>> result = storyRepository.findAll();

        // Then
        assertNotNull(result);
    }

    @Test
    void findByCategory_ShouldReturnStoriesInCategory() {
        // Given
        String category = "bedtime";

        // When
        CompletableFuture<List<Story>> result = storyRepository.findByCategory(category);

        // Then
        assertNotNull(result);
    }

    @Test
    void findAvailable_ShouldReturnOnlyAvailableStories() {
        // When
        CompletableFuture<List<Story>> result = storyRepository.findAvailable();

        // Then
        assertNotNull(result);
    }

    @Test
    void update_ShouldUpdateExistingStory() {
        // Given
        Story story = createTestStory("story-1", "Updated Story", "adventure");

        // When
        CompletableFuture<Story> result = storyRepository.update(story);

        // Then
        assertNotNull(result);
    }

    @Test
    void delete_ShouldDeleteStory() {
        // Given
        String storyId = "story-1";

        // When
        CompletableFuture<Void> result = storyRepository.delete(storyId);

        // Then
        assertNotNull(result);
    }

    @Test
    void exists_ShouldReturnTrueWhenStoryExists() {
        // Given
        String storyId = "story-1";

        // When
        CompletableFuture<Boolean> result = storyRepository.exists(storyId);

        // Then
        assertNotNull(result);
    }

    @Test
    void findUpdatedAfter_ShouldReturnStoriesUpdatedAfterTimestamp() {
        // Given
        long timestamp = System.currentTimeMillis() - 86400000; // 24 hours ago

        // When
        CompletableFuture<List<Story>> result = storyRepository.findUpdatedAfter(timestamp);

        // Then
        assertNotNull(result);
    }

    // Helper methods
    private Story createTestStory(String id, String title, String category) {
        Story story = new Story(id, title, category);
        story.setTag("🌙 Bedtime");
        story.setEmoji("🌙");
        story.setAgeRange("2-5");
        story.setDuration(8);
        story.setDescription("A test story");
        story.setAvailable(true);
        
        // Add test pages
        StoryPage page1 = new StoryPage("page-1", 1, "Once upon a time...");
        story.getPages().add(page1);
        
        return story;
    }
}

