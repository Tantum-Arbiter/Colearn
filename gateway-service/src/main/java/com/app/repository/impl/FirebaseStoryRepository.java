package com.app.repository.impl;

import com.app.model.Story;
import com.app.repository.StoryRepository;
import com.app.service.ApplicationMetricsService;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Repository
public class FirebaseStoryRepository implements StoryRepository {

    private static final Logger logger = LoggerFactory.getLogger(FirebaseStoryRepository.class);
    private static final String COLLECTION_NAME = "stories";

    private final Firestore firestore;
    private final ApplicationMetricsService metricsService;

    @Autowired
    public FirebaseStoryRepository(Firestore firestore, ApplicationMetricsService metricsService) {
        this.firestore = firestore;
        this.metricsService = metricsService;
    }

    @Override
    public CompletableFuture<Story> save(Story story) {
        logger.debug("Saving story: {}", story.getId());

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                story.updateTimestamp();

                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(story.getId());
                ApiFuture<WriteResult> future = docRef.set(story);

                WriteResult result = future.get();
                logger.debug("Story saved successfully: {} at {}", story.getId(), result.getUpdateTime());

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "save", true, duration);

                return story;
            } catch (Exception e) {
                logger.error("Error saving story: {}", story.getId(), e);
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "save", false, duration);
                throw new RuntimeException("Failed to save story", e);
            }
        });
    }

    @Override
    public CompletableFuture<Story> update(Story story) {
        logger.debug("Updating story: {}", story.getId());

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                story.updateTimestamp();

                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(story.getId());
                ApiFuture<WriteResult> future = docRef.set(story);

                WriteResult result = future.get();
                logger.debug("Story updated successfully: {} at {}", story.getId(), result.getUpdateTime());

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "update", true, duration);

                return story;
            } catch (Exception e) {
                logger.error("Error updating story: {}", story.getId(), e);
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "update", false, duration);
                throw new RuntimeException("Failed to update story", e);
            }
        });
    }

    @Override
    public CompletableFuture<Optional<Story>> findById(String storyId) {
        logger.debug("Finding story by ID: {}", storyId);

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(storyId);
                ApiFuture<DocumentSnapshot> future = docRef.get();

                DocumentSnapshot document = future.get();

                long duration = System.currentTimeMillis() - startTime;

                if (document.exists()) {
                    Story story = document.toObject(Story.class);
                    logger.debug("Story found: {}", storyId);
                    metricsService.recordFirestoreOperation(COLLECTION_NAME, "findById", true, duration);
                    return Optional.of(story);
                } else {
                    logger.debug("Story not found: {}", storyId);
                    metricsService.recordFirestoreOperation(COLLECTION_NAME, "findById", true, duration);
                    return Optional.empty();
                }
            } catch (Exception e) {
                logger.error("Error finding story by ID: {}", storyId, e);
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findById", false, duration);
                throw new RuntimeException("Failed to find story", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<Story>> findAll() {
        logger.debug("Finding all stories");

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                ApiFuture<QuerySnapshot> future = firestore.collection(COLLECTION_NAME).get();
                QuerySnapshot querySnapshot = future.get();

                List<Story> stories = new ArrayList<>();
                for (DocumentSnapshot document : querySnapshot.getDocuments()) {
                    Story story = document.toObject(Story.class);
                    stories.add(story);
                }

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findAll", true, duration);

                logger.debug("Found {} stories", stories.size());
                return stories;
            } catch (Exception e) {
                logger.error("Error finding all stories", e);
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findAll", false, duration);
                throw new RuntimeException("Failed to find stories", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<Story>> findByCategory(String category) {
        logger.debug("Finding stories by category: {}", category);

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                Query query = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("category", category);

                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();

                List<Story> stories = new ArrayList<>();
                for (DocumentSnapshot document : querySnapshot.getDocuments()) {
                    Story story = document.toObject(Story.class);
                    stories.add(story);
                }

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findByCategory", true, duration);

                logger.debug("Found {} stories in category: {}", stories.size(), category);
                return stories;
            } catch (Exception e) {
                logger.error("Error finding stories by category: {}", category, e);
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findByCategory", false, duration);
                throw new RuntimeException("Failed to find stories by category", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<Story>> findAvailable() {
        logger.debug("Finding available stories");

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                Query query = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("isAvailable", true);

                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();

                List<Story> stories = new ArrayList<>();
                for (DocumentSnapshot document : querySnapshot.getDocuments()) {
                    Story story = document.toObject(Story.class);
                    stories.add(story);
                }

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findAvailable", true, duration);

                logger.debug("Found {} available stories", stories.size());
                return stories;
            } catch (Exception e) {
                logger.error("Error finding available stories", e);
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findAvailable", false, duration);
                throw new RuntimeException("Failed to find available stories", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<Story>> findUpdatedAfter(long timestamp) {
        logger.debug("Finding stories updated after timestamp: {}", timestamp);

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                Instant instant = Instant.ofEpochMilli(timestamp);

                Query query = firestore.collection(COLLECTION_NAME)
                        .whereGreaterThan("updatedAt", instant);

                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();

                List<Story> stories = new ArrayList<>();
                for (DocumentSnapshot document : querySnapshot.getDocuments()) {
                    Story story = document.toObject(Story.class);
                    stories.add(story);
                }

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findUpdatedAfter", true, duration);

                logger.debug("Found {} stories updated after timestamp", stories.size());
                return stories;
            } catch (Exception e) {
                logger.error("Error finding stories updated after timestamp: {}", timestamp, e);
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findUpdatedAfter", false, duration);
                throw new RuntimeException("Failed to find updated stories", e);
            }
        });
    }

    @Override
    public CompletableFuture<Void> delete(String storyId) {
        logger.debug("Deleting story: {}", storyId);

        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(storyId);
                ApiFuture<WriteResult> future = docRef.delete();

                WriteResult result = future.get();
                logger.debug("Story deleted: {} at {}", storyId, result.getUpdateTime());

                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "delete", true, duration);

                return null;
            } catch (Exception e) {
                logger.error("Error deleting story: {}", storyId, e);
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "delete", false, duration);
                throw new RuntimeException("Failed to delete story", e);
            }
        });
    }

    @Override
    public CompletableFuture<Boolean> exists(String storyId) {
        logger.debug("Checking if story exists: {}", storyId);

        return CompletableFuture.supplyAsync(() -> {
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(storyId);
                ApiFuture<DocumentSnapshot> future = docRef.get();

                DocumentSnapshot document = future.get();
                return document.exists();
            } catch (Exception e) {
                logger.error("Error checking if story exists: {}", storyId, e);
                throw new RuntimeException("Failed to check story existence", e);
            }
        });
    }

    @Override
    public CompletableFuture<Long> count() {
        logger.debug("Counting total stories");

        return CompletableFuture.supplyAsync(() -> {
            try {
                ApiFuture<QuerySnapshot> future = firestore.collection(COLLECTION_NAME).get();
                QuerySnapshot querySnapshot = future.get();

                long count = querySnapshot.size();
                logger.debug("Total stories: {}", count);
                return count;
            } catch (Exception e) {
                logger.error("Error counting stories", e);
                throw new RuntimeException("Failed to count stories", e);
            }
        });
    }

    @Override
    public CompletableFuture<Long> countAvailable() {
        logger.debug("Counting available stories");

        return CompletableFuture.supplyAsync(() -> {
            try {
                Query query = firestore.collection(COLLECTION_NAME)
                        .whereEqualTo("available", true);

                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();

                long count = querySnapshot.size();
                logger.debug("Available stories: {}", count);
                return count;
            } catch (Exception e) {
                logger.error("Error counting available stories", e);
                throw new RuntimeException("Failed to count available stories", e);
            }
        });
    }
}
