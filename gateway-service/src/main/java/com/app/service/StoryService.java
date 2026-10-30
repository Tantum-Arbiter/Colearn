package com.app.service;

import com.app.dto.CatalogEntry;
import com.app.model.ContentVersion;
import com.app.model.Story;
import com.app.repository.ContentVersionRepository;
import com.app.repository.StoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

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

    public CompletableFuture<List<Story>> getAllAvailableStories() {
        logger.debug("Getting all available stories");
        return storyRepository.findAvailable();
    }

    public CompletableFuture<Optional<Story>> getStoryById(String storyId) {
        logger.debug("Getting story by ID: {}", storyId);
        return storyRepository.findById(storyId);
    }

    public CompletableFuture<List<Story>> getStoriesByCategory(String category) {
        logger.debug("Getting stories by category: {}", category);
        return storyRepository.findByCategory(category);
    }

    public CompletableFuture<ContentVersion> getCurrentContentVersion() {
        logger.debug("Getting current content version");
        return contentVersionRepository.getCurrent()
                .thenApply(opt -> opt.orElse(new ContentVersion()));
    }

    public CompletableFuture<List<Story>> getStoriesToSync(Map<String, String> clientChecksums) {
        logger.debug("Getting stories to sync. Client has {} stories", clientChecksums.size());

        return contentVersionRepository.getCurrent()
                .thenCompose(versionOpt -> {
                    if (versionOpt.isEmpty()) {
                        return storyRepository.findAvailable();
                    }

                    ContentVersion serverVersion = versionOpt.get();
                    Map<String, String> serverChecksums = serverVersion.getStoryChecksums();

                    List<String> storiesToFetch = serverChecksums.entrySet().stream()
                            .filter(entry -> {
                                String storyId = entry.getKey();
                                String serverChecksum = entry.getValue();
                                String clientChecksum = clientChecksums.get(storyId);
                                return clientChecksum == null || !clientChecksum.equals(serverChecksum);
                            })
                            .map(Map.Entry::getKey)
                            .collect(Collectors.toList());

                    logger.debug("Found {} stories to sync", storiesToFetch.size());

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

    public CompletableFuture<Story> saveStory(Story story) {
        logger.debug("Saving story: {}", story.getId());

        return storyRepository.save(story)
                .thenCompose(savedStory -> {
                    String checksum = calculateStoryChecksum(savedStory);
                    return contentVersionRepository.updateStoryChecksum(savedStory.getId(), checksum)
                            .thenApply(v -> savedStory);
                });
    }

    public CompletableFuture<Story> updateStory(Story story) {
        logger.debug("Updating story: {}", story.getId());

        return storyRepository.update(story)
                .thenCompose(updatedStory -> {
                    String checksum = calculateStoryChecksum(updatedStory);
                    return contentVersionRepository.updateStoryChecksum(updatedStory.getId(), checksum)
                            .thenApply(v -> updatedStory);
                });
    }

    public CompletableFuture<Void> deleteStory(String storyId) {
        logger.debug("Deleting story: {}", storyId);

        return storyRepository.delete(storyId)
                .thenCompose(v -> contentVersionRepository.removeStoryChecksum(storyId))
                .thenApply(v -> null);
    }

    /**
     * Get catalog entries for stories the client hasn't downloaded.
     * Returns lightweight metadata for stories whose IDs are NOT in clientStoryIds.
     *
     * @param clientStoryIds set of story IDs the client already has downloaded
     * @param serverChecksums all server story checksums (used to identify full catalog)
     * @return list of catalog entries for stories the client hasn't downloaded
     */
    public CompletableFuture<List<CatalogEntry>> getCatalogEntries(
            Set<String> clientStoryIds, Map<String, String> serverChecksums,
            java.util.function.Function<String, String> thumbnailUrlGenerator) {

        // Find story IDs that the client does NOT have
        List<String> catalogStoryIds = serverChecksums.keySet().stream()
                .filter(id -> !clientStoryIds.contains(id))
                .collect(Collectors.toList());

        if (catalogStoryIds.isEmpty()) {
            logger.debug("Client has all stories, no catalog entries needed");
            return CompletableFuture.completedFuture(Collections.emptyList());
        }

        logger.debug("Building catalog for {} stories client doesn't have", catalogStoryIds.size());

        // Fetch stories for the catalog
        List<CompletableFuture<Optional<Story>>> futures = catalogStoryIds.stream()
                .map(storyRepository::findById)
                .collect(Collectors.toList());

        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .thenApply(v -> futures.stream()
                        .map(CompletableFuture::join)
                        .filter(Optional::isPresent)
                        .map(Optional::get)
                        .filter(Story::isAvailable)
                        .map(story -> {
                            String thumbnailUrl = null;
                            try {
                                thumbnailUrl = thumbnailUrlGenerator.apply(story.getCoverImage());
                            } catch (Exception e) {
                                logger.warn("Failed to generate thumbnail URL for story: {}", story.getId(), e);
                            }
                            return CatalogEntry.fromStory(story, thumbnailUrl);
                        })
                        .collect(Collectors.toList()));
    }

    private static final com.fasterxml.jackson.databind.ObjectMapper CHECKSUM_MAPPER =
            new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules();

    private String calculateStoryChecksum(Story story) {
        if (story.getChecksum() != null && !story.getChecksum().isBlank()) {
            return story.getChecksum();
        }
        return StoryChecksums.of(CHECKSUM_MAPPER.valueToTree(story));
    }
}

