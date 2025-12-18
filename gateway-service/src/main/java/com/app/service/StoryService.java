package com.app.service;

import com.app.model.ContentVersion;
import com.app.model.Story;
import com.app.repository.ContentVersionRepository;
import com.app.repository.StoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Service for story operations and delta-sync logic
 */
@Service
public class StoryService {

    private static final Logger logger = LoggerFactory.getLogger(StoryService.class);

    private final StoryRepository storyRepository;
    private final ContentVersionRepository contentVersionRepository;

    @Autowired
    public StoryService(StoryRepository storyRepository, ContentVersionRepository contentVersionRepository) {
        this.storyRepository = storyRepository;
        this.contentVersionRepository = contentVersionRepository;
    }

    /**
     * Get all available stories
     */
    public CompletableFuture<List<Story>> getAllAvailableStories() {
        logger.debug("Getting all available stories");
        return storyRepository.findAvailable();
    }

    /**
     * Get story by ID
     */
    public CompletableFuture<Optional<Story>> getStoryById(String storyId) {
        logger.debug("Getting story by ID: {}", storyId);
        return storyRepository.findById(storyId);
    }

    /**
     * Get stories by category
     */
    public CompletableFuture<List<Story>> getStoriesByCategory(String category) {
        logger.debug("Getting stories by category: {}", category);
        return storyRepository.findByCategory(category);
    }

    /**
     * Get current content version for delta-sync
     */
    public CompletableFuture<ContentVersion> getCurrentContentVersion() {
        logger.debug("Getting current content version");
        return contentVersionRepository.getCurrent()
                .thenApply(opt -> opt.orElse(new ContentVersion()));
    }

    /**
     * Get stories that need to be synced based on client's checksums
     * @param clientChecksums Map of storyId -> checksum from client
     * @return List of stories that have changed or are new
     */
    public CompletableFuture<List<Story>> getStoriesToSync(Map<String, String> clientChecksums) {
        logger.debug("Getting stories to sync. Client has {} stories", clientChecksums.size());

        return contentVersionRepository.getCurrent()
                .thenCompose(versionOpt -> {
                    if (versionOpt.isEmpty()) {
                        logger.debug("No content version found, returning all available stories");
                        return storyRepository.findAvailable();
                    }

                    ContentVersion serverVersion = versionOpt.get();
                    Map<String, String> serverChecksums = serverVersion.getStoryChecksums();

                    // Find stories that are new or have changed
                    List<String> storiesToFetch = serverChecksums.entrySet().stream()
                            .filter(entry -> {
                                String storyId = entry.getKey();
                                String serverChecksum = entry.getValue();
                                String clientChecksum = clientChecksums.get(storyId);

                                // Include if client doesn't have it or checksum differs
                                return clientChecksum == null || !clientChecksum.equals(serverChecksum);
                            })
                            .map(Map.Entry::getKey)
                            .collect(Collectors.toList());

                    logger.debug("Found {} stories to sync", storiesToFetch.size());

                    // Fetch all changed stories
                    List<CompletableFuture<Optional<Story>>> futures = storiesToFetch.stream()
                            .map(storyRepository::findById)
                            .collect(Collectors.toList());

                    return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                            .thenApply(v -> futures.stream()
                                    .map(CompletableFuture::join)
                                    .filter(Optional::isPresent)
                                    .map(Optional::get)
                                    .collect(Collectors.toList()));
                });
    }

    /**
     * Save story and update content version
     */
    public CompletableFuture<Story> saveStory(Story story) {
        logger.debug("Saving story: {}", story.getId());

        return storyRepository.save(story)
                .thenCompose(savedStory -> {
                    // Calculate checksum
                    String checksum = calculateStoryChecksum(savedStory);

                    // Update content version
                    return contentVersionRepository.updateStoryChecksum(savedStory.getId(), checksum)
                            .thenApply(v -> savedStory);
                });
    }

    /**
     * Update story and update content version
     */
    public CompletableFuture<Story> updateStory(Story story) {
        logger.debug("Updating story: {}", story.getId());

        return storyRepository.update(story)
                .thenCompose(updatedStory -> {
                    // Calculate new checksum
                    String checksum = calculateStoryChecksum(updatedStory);

                    // Update content version
                    return contentVersionRepository.updateStoryChecksum(updatedStory.getId(), checksum)
                            .thenApply(v -> updatedStory);
                });
    }

    /**
     * Delete story and update content version
     */
    public CompletableFuture<Void> deleteStory(String storyId) {
        logger.debug("Deleting story: {}", storyId);

        return storyRepository.delete(storyId)
                .thenCompose(v -> contentVersionRepository.removeStoryChecksum(storyId))
                .thenApply(v -> null);
    }

    /**
     * Calculate SHA-256 checksum of story content
     * Used for delta-sync to detect changes
     */
    private String calculateStoryChecksum(Story story) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            // Include all relevant story fields in checksum
            StringBuilder content = new StringBuilder();
            content.append(story.getId());
            content.append(story.getTitle());
            content.append(story.getCategory());
            content.append(story.getDescription() != null ? story.getDescription() : "");
            content.append(story.getVersion());

            // Include page content
            if (story.getPages() != null) {
                story.getPages().forEach(page -> {
                    content.append(page.getId());
                    content.append(page.getText());
                    content.append(page.getPageNumber());
                });
            }

            byte[] hash = digest.digest(content.toString().getBytes(StandardCharsets.UTF_8));

            // Convert to hex string
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }

            return hexString.toString();
        } catch (Exception e) {
            logger.error("Error calculating story checksum for: {}", story.getId(), e);
            throw new RuntimeException("Failed to calculate checksum", e);
        }
    }
}

