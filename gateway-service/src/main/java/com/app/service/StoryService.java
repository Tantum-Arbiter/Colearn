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

    private String calculateStoryChecksum(Story story) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            StringBuilder content = new StringBuilder();
            content.append(story.getId());
            content.append(story.getTitle());
            content.append(serializeLocalizedText(story.getLocalizedTitle()));
            content.append(story.getCategory());
            content.append(story.getDescription() != null ? story.getDescription() : "");
            content.append(serializeLocalizedText(story.getLocalizedDescription()));
            content.append(story.getVersion());

            if (story.getPages() != null) {
                story.getPages().forEach(page -> {
                    content.append(page.getId());
                    content.append(page.getText());
                    content.append(serializeLocalizedText(page.getLocalizedText()));
                    content.append(page.getPageNumber());
                });
            }

            byte[] hash = digest.digest(content.toString().getBytes(StandardCharsets.UTF_8));
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

    private String serializeLocalizedText(com.app.model.LocalizedText localizedText) {
        if (localizedText == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        if (localizedText.getEn() != null) sb.append("en:").append(localizedText.getEn()).append("|");
        if (localizedText.getPl() != null) sb.append("pl:").append(localizedText.getPl()).append("|");
        if (localizedText.getEs() != null) sb.append("es:").append(localizedText.getEs()).append("|");
        if (localizedText.getDe() != null) sb.append("de:").append(localizedText.getDe()).append("|");
        return sb.toString();
    }
}

