package com.app.repository.impl;

import com.app.model.Story;
import com.app.repository.StoryRepository;
import com.app.service.ApplicationMetricsService;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Firebase Firestore implementation of StoryRepository
 */
@Repository
public class FirebaseStoryRepository implements StoryRepository {
    
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
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                story.setUpdatedAt(Instant.now());
                if (story.getCreatedAt() == null) {
                    story.setCreatedAt(Instant.now());
                }
                
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(story.getId());
                ApiFuture<WriteResult> future = docRef.set(story);
                WriteResult result = future.get();
                
                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "save", true, duration);
                
                return story;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "save", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "save", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to save story", e);
            }
        });
    }
    
    @Override
    public CompletableFuture<Optional<Story>> findById(String id) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
                ApiFuture<DocumentSnapshot> future = docRef.get();
                DocumentSnapshot document = future.get();
                
                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findById", true, duration);
                
                if (document.exists()) {
                    Story story = document.toObject(Story.class);
                    return Optional.ofNullable(story);
                } else {
                    return Optional.empty();
                }
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findById", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "findById", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to find story by id", e);
            }
        });
    }
    
    @Override
    public CompletableFuture<List<Story>> findAll() {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                CollectionReference collection = firestore.collection(COLLECTION_NAME);
                ApiFuture<QuerySnapshot> future = collection.get();
                QuerySnapshot querySnapshot = future.get();
                
                List<Story> stories = querySnapshot.getDocuments().stream()
                        .map(doc -> doc.toObject(Story.class))
                        .collect(Collectors.toList());
                
                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findAll", true, duration);
                metricsService.recordFirestoreQueryPerformance(COLLECTION_NAME, "findAll", duration, stories.size());
                
                return stories;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findAll", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "findAll", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to find all stories", e);
            }
        });
    }
    
    @Override
    public CompletableFuture<List<Story>> findByCategory(String category) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                CollectionReference collection = firestore.collection(COLLECTION_NAME);
                Query query = collection.whereEqualTo("category", category);
                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();
                
                List<Story> stories = querySnapshot.getDocuments().stream()
                        .map(doc -> doc.toObject(Story.class))
                        .collect(Collectors.toList());
                
                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findByCategory", true, duration);
                metricsService.recordFirestoreQueryPerformance(COLLECTION_NAME, "findByCategory", duration, stories.size());
                
                return stories;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findByCategory", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "findByCategory", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to find stories by category", e);
            }
        });
    }
    
    @Override
    public CompletableFuture<List<Story>> findByAvailable(boolean available) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                CollectionReference collection = firestore.collection(COLLECTION_NAME);
                Query query = collection.whereEqualTo("available", available);
                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();
                
                List<Story> stories = querySnapshot.getDocuments().stream()
                        .map(doc -> doc.toObject(Story.class))
                        .collect(Collectors.toList());
                
                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findByAvailable", true, duration);
                metricsService.recordFirestoreQueryPerformance(COLLECTION_NAME, "findByAvailable", duration, stories.size());
                
                return stories;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findByAvailable", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "findByAvailable", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to find stories by availability", e);
            }
        });
    }
    
    @Override
    public CompletableFuture<List<Story>> findUpdatedAfter(Instant timestamp) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                CollectionReference collection = firestore.collection(COLLECTION_NAME);
                Query query = collection.whereGreaterThan("updatedAt", timestamp);
                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();
                
                List<Story> stories = querySnapshot.getDocuments().stream()
                        .map(doc -> doc.toObject(Story.class))
                        .collect(Collectors.toList());
                
                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findUpdatedAfter", true, duration);
                metricsService.recordFirestoreQueryPerformance(COLLECTION_NAME, "findUpdatedAfter", duration, stories.size());
                
                return stories;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findUpdatedAfter", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "findUpdatedAfter", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to find stories updated after timestamp", e);
            }
        });
    }
    
    @Override
    public CompletableFuture<List<Story>> findWithPagination(int page, int size) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                CollectionReference collection = firestore.collection(COLLECTION_NAME);
                Query query = collection.orderBy("createdAt").offset(page * size).limit(size);
                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();
                
                List<Story> stories = querySnapshot.getDocuments().stream()
                        .map(doc -> doc.toObject(Story.class))
                        .collect(Collectors.toList());
                
                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findWithPagination", true, duration);
                metricsService.recordFirestoreQueryPerformance(COLLECTION_NAME, "findWithPagination", duration, stories.size());
                
                return stories;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findWithPagination", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "findWithPagination", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to find stories with pagination", e);
            }
        });
    }

    @Override
    public CompletableFuture<Long> count() {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                CollectionReference collection = firestore.collection(COLLECTION_NAME);
                ApiFuture<QuerySnapshot> future = collection.get();
                QuerySnapshot querySnapshot = future.get();

                long count = querySnapshot.size();

                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "count", true, duration);

                return count;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "count", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "count", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to count stories", e);
            }
        });
    }

    @Override
    public CompletableFuture<Long> countByCategory(String category) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                CollectionReference collection = firestore.collection(COLLECTION_NAME);
                Query query = collection.whereEqualTo("category", category);
                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();

                long count = querySnapshot.size();

                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "countByCategory", true, duration);

                return count;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "countByCategory", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "countByCategory", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to count stories by category", e);
            }
        });
    }

    @Override
    public CompletableFuture<Long> countByAvailable(boolean available) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                CollectionReference collection = firestore.collection(COLLECTION_NAME);
                Query query = collection.whereEqualTo("available", available);
                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();

                long count = querySnapshot.size();

                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "countByAvailable", true, duration);

                return count;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "countByAvailable", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "countByAvailable", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to count stories by availability", e);
            }
        });
    }

    @Override
    public CompletableFuture<Boolean> deleteById(String id) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
                ApiFuture<WriteResult> future = docRef.delete();
                WriteResult result = future.get();

                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "deleteById", true, duration);

                return true;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "deleteById", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "deleteById", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to delete story", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<Story>> findByIds(List<String> ids) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                List<Story> stories = new ArrayList<>();

                // Firestore has a limit of 10 items for 'in' queries, so we batch them
                List<List<String>> batches = new ArrayList<>();
                for (int i = 0; i < ids.size(); i += 10) {
                    batches.add(ids.subList(i, Math.min(i + 10, ids.size())));
                }

                for (List<String> batch : batches) {
                    CollectionReference collection = firestore.collection(COLLECTION_NAME);
                    Query query = collection.whereIn(FieldPath.documentId(), batch);
                    ApiFuture<QuerySnapshot> future = query.get();
                    QuerySnapshot querySnapshot = future.get();

                    List<Story> batchStories = querySnapshot.getDocuments().stream()
                            .map(doc -> doc.toObject(Story.class))
                            .collect(Collectors.toList());

                    stories.addAll(batchStories);
                }

                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findByIds", true, duration);
                metricsService.recordFirestoreQueryPerformance(COLLECTION_NAME, "findByIds", duration, stories.size());

                return stories;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findByIds", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "findByIds", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to find stories by ids", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<Story>> findPopularStories(int limit) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                CollectionReference collection = firestore.collection(COLLECTION_NAME);
                Query query = collection.orderBy("downloadCount", Query.Direction.DESCENDING).limit(limit);
                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();

                List<Story> stories = querySnapshot.getDocuments().stream()
                        .map(doc -> doc.toObject(Story.class))
                        .collect(Collectors.toList());

                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findPopularStories", true, duration);
                metricsService.recordFirestoreQueryPerformance(COLLECTION_NAME, "findPopularStories", duration, stories.size());

                return stories;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findPopularStories", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "findPopularStories", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to find popular stories", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<Story>> findHighRatedStories(double minRating, int limit) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                CollectionReference collection = firestore.collection(COLLECTION_NAME);
                Query query = collection.whereGreaterThanOrEqualTo("rating", minRating)
                        .orderBy("rating", Query.Direction.DESCENDING)
                        .limit(limit);
                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();

                List<Story> stories = querySnapshot.getDocuments().stream()
                        .map(doc -> doc.toObject(Story.class))
                        .collect(Collectors.toList());

                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findHighRatedStories", true, duration);
                metricsService.recordFirestoreQueryPerformance(COLLECTION_NAME, "findHighRatedStories", duration, stories.size());

                return stories;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findHighRatedStories", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "findHighRatedStories", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to find high rated stories", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<Story>> findByAgeRange(String ageRange) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                CollectionReference collection = firestore.collection(COLLECTION_NAME);
                Query query = collection.whereEqualTo("ageRange", ageRange);
                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();

                List<Story> stories = querySnapshot.getDocuments().stream()
                        .map(doc -> doc.toObject(Story.class))
                        .collect(Collectors.toList());

                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findByAgeRange", true, duration);
                metricsService.recordFirestoreQueryPerformance(COLLECTION_NAME, "findByAgeRange", duration, stories.size());

                return stories;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findByAgeRange", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "findByAgeRange", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to find stories by age range", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<Story>> findByTags(List<String> tags) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                CollectionReference collection = firestore.collection(COLLECTION_NAME);
                Query query = collection.whereArrayContainsAny("tags", tags);
                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();

                List<Story> stories = querySnapshot.getDocuments().stream()
                        .map(doc -> doc.toObject(Story.class))
                        .collect(Collectors.toList());

                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findByTags", true, duration);
                metricsService.recordFirestoreQueryPerformance(COLLECTION_NAME, "findByTags", duration, stories.size());

                return stories;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findByTags", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "findByTags", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to find stories by tags", e);
            }
        });
    }

    @Override
    public CompletableFuture<Boolean> updateAvailability(String id, boolean available) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
                ApiFuture<WriteResult> future = docRef.update("available", available, "updatedAt", Instant.now());
                WriteResult result = future.get();

                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "updateAvailability", true, duration);

                return true;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "updateAvailability", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "updateAvailability", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to update story availability", e);
            }
        });
    }

    @Override
    public CompletableFuture<Boolean> incrementDownloadCount(String id) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
                ApiFuture<WriteResult> future = docRef.update("downloadCount", FieldValue.increment(1), "updatedAt", Instant.now());
                WriteResult result = future.get();

                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "incrementDownloadCount", true, duration);

                return true;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "incrementDownloadCount", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "incrementDownloadCount", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to increment download count", e);
            }
        });
    }

    @Override
    public CompletableFuture<Boolean> updateRating(String id, double rating) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                DocumentReference docRef = firestore.collection(COLLECTION_NAME).document(id);
                ApiFuture<WriteResult> future = docRef.update("rating", rating, "updatedAt", Instant.now());
                WriteResult result = future.get();

                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "updateRating", true, duration);

                return true;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "updateRating", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "updateRating", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to update story rating", e);
            }
        });
    }

    @Override
    public CompletableFuture<List<Story>> findForBulkSync(Instant lastSync, int limit, String cursor) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                CollectionReference collection = firestore.collection(COLLECTION_NAME);
                Query query = collection.whereGreaterThan("updatedAt", lastSync)
                        .orderBy("updatedAt")
                        .limit(limit);

                // Add cursor support if provided
                if (cursor != null && !cursor.trim().isEmpty()) {
                    // In a real implementation, you'd decode the cursor to get the last document
                    // For now, we'll use a simple timestamp-based cursor
                    try {
                        Instant cursorTime = Instant.parse(cursor);
                        query = query.startAfter(cursorTime);
                    } catch (Exception e) {
                        // Invalid cursor, ignore and proceed without it
                    }
                }

                ApiFuture<QuerySnapshot> future = query.get();
                QuerySnapshot querySnapshot = future.get();

                List<Story> stories = querySnapshot.getDocuments().stream()
                        .map(doc -> doc.toObject(Story.class))
                        .collect(Collectors.toList());

                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findForBulkSync", true, duration);
                metricsService.recordFirestoreQueryPerformance(COLLECTION_NAME, "findForBulkSync", duration, stories.size());

                return stories;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "findForBulkSync", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "findForBulkSync", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to find stories for bulk sync", e);
            }
        });
    }

    @Override
    public CompletableFuture<StoryStats> getStoryStats() {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            try {
                CollectionReference collection = firestore.collection(COLLECTION_NAME);
                ApiFuture<QuerySnapshot> future = collection.get();
                QuerySnapshot querySnapshot = future.get();

                List<Story> allStories = querySnapshot.getDocuments().stream()
                        .map(doc -> doc.toObject(Story.class))
                        .collect(Collectors.toList());

                // Calculate statistics
                long totalStories = allStories.size();
                long availableStories = allStories.stream().mapToLong(s -> s.isAvailable() ? 1 : 0).sum();
                long unavailableStories = totalStories - availableStories;
                long totalDownloads = allStories.stream().mapToLong(s -> s.getDownloadCount() != null ? s.getDownloadCount() : 0).sum();
                double averageRating = allStories.stream()
                        .filter(s -> s.getRating() != null && s.getRating() > 0)
                        .mapToDouble(Story::getRating)
                        .average()
                        .orElse(0.0);

                // Find most popular category
                String mostPopularCategory = allStories.stream()
                        .collect(Collectors.groupingBy(Story::getCategory, Collectors.counting()))
                        .entrySet().stream()
                        .max(Map.Entry.comparingByValue())
                        .map(Map.Entry::getKey)
                        .orElse("unknown");

                StoryStats stats = new StoryStats(totalStories, availableStories, unavailableStories,
                        totalDownloads, averageRating, mostPopularCategory);

                // Record metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "getStoryStats", true, duration);

                return stats;
            } catch (Exception e) {
                // Record error metrics
                long duration = System.currentTimeMillis() - startTime;
                metricsService.recordFirestoreOperation(COLLECTION_NAME, "getStoryStats", false, duration);
                metricsService.recordFirestoreError(COLLECTION_NAME, "getStoryStats", e.getClass().getSimpleName());
                throw new RuntimeException("Failed to get story statistics", e);
            }
        });
    }
}
