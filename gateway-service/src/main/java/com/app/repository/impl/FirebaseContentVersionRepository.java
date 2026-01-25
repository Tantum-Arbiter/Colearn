package com.app.repository.impl;

import com.app.model.ContentVersion;
import com.app.repository.ContentVersionRepository;
import com.app.service.ApplicationMetricsService;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Repository
public class FirebaseContentVersionRepository implements ContentVersionRepository {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseContentVersionRepository.class);
    private static final String COLLECTION_NAME = "content_versions";
    private static final String CURRENT_DOC_ID = "current";

    private final Firestore firestore;
    private final ApplicationMetricsService metricsService;

    @Autowired
    public FirebaseContentVersionRepository(Firestore firestore, ApplicationMetricsService metricsService) {
        this.firestore = firestore;
        this.metricsService = metricsService;
    }

    @Override
    public CompletableFuture<Optional<ContentVersion>> getCurrent() {
        logger.debug("Getting current content version");

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(CURRENT_DOC_ID);
                ApiFuture<DocumentSnapshot> future = docRef.get();

                DocumentSnapshot document = future.get();

                long duration = System.currentTimeMillis() - startTime;
                logger.debug("[Firestore] Document check: exists={}, id={}, durationMs={}", document.exists(), document.getId(), duration);

                if (document.exists()) {
                    ContentVersion version = document.toObject(ContentVersion.class);
                    logger.debug("[Firestore] Content version loaded: version={}, totalStories={}, checksumCount={}",
                            version.getVersion(), version.getTotalStories(),
                            version.getStoryChecksums() != null ? version.getStoryChecksums().size() : 0);
                    metricsService.recordFirestoreOperation(COLLECTION_NAME, "getCurrent", true, duration);
                    return Optional.of(version);
                } else {
                    logger.debug("No content version found, returning empty");
                    metricsService.recordFirestoreOperation(COLLECTION_NAME, "getCurrent", true, duration);
                    return Optional.empty();
                }
            } catch (Exception e) {
                logger.error("Error getting current content version", e);
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "getCurrent", false, duration);
                throw new RuntimeException("Failed to get content version", e);
            }
        });
    }

    @Override
    public CompletableFuture<ContentVersion> save(ContentVersion contentVersion) {
        logger.debug("Saving content version: version={}", contentVersion.getVersion());

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                contentVersion.setId(CURRENT_DOC_ID);

                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(CURRENT_DOC_ID);
                ApiFuture<WriteResult> future = docRef.set(contentVersion);

                WriteResult result = future.get();
                logger.debug("Content version saved: version={} at {}", contentVersion.getVersion(), result.getUpdateTime());

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "save", true, duration);

                return contentVersion;
            } catch (Exception e) {
                logger.error("Error saving content version", e);
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "save", false, duration);
                throw new RuntimeException("Failed to save content version", e);
            }
        });
    }

    @Override
    public CompletableFuture<ContentVersion> updateStoryChecksum(String storyId, String checksum) {
        logger.debug("Updating story checksum: storyId={}, checksum={}", storyId, checksum);

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                Optional<ContentVersion> currentOpt = getCurrent().join();
                ContentVersion version = currentOpt.orElse(new ContentVersion());
                version.updateStoryChecksum(storyId, checksum);

                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(CURRENT_DOC_ID);
                ApiFuture<WriteResult> future = docRef.set(version);

                WriteResult result = future.get();
                logger.debug("Story checksum updated: storyId={} at {}", storyId, result.getUpdateTime());

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "updateStoryChecksum", true, duration);

                return version;
            } catch (Exception e) {
                logger.error("Error updating story checksum: storyId={}", storyId, e);
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "updateStoryChecksum", false, duration);
                throw new RuntimeException("Failed to update story checksum", e);
            }
        });
    }

    @Override
    public CompletableFuture<ContentVersion> removeStoryChecksum(String storyId) {
        logger.debug("Removing story checksum: storyId={}", storyId);

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                Optional<ContentVersion> currentOpt = getCurrent().join();
                if (currentOpt.isEmpty()) {
                    logger.warn("No content version found when trying to remove story checksum: {}", storyId);
                    return new ContentVersion();
                }

                ContentVersion version = currentOpt.get();
                version.removeStoryChecksum(storyId);

                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(CURRENT_DOC_ID);
                ApiFuture<WriteResult> future = docRef.set(version);

                WriteResult result = future.get();
                logger.debug("Story checksum removed: storyId={} at {}", storyId, result.getUpdateTime());

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "removeStoryChecksum", true, duration);

                return version;
            } catch (Exception e) {
                logger.error("Error removing story checksum: storyId={}", storyId, e);
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "removeStoryChecksum", false, duration);
                throw new RuntimeException("Failed to remove story checksum", e);
            }
        });
    }
}

