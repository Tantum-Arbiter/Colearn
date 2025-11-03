package com.app.repository;

import com.app.model.Story;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Repository interface for Story operations
 */
public interface StoryRepository {
    
    /**
     * Save a story
     */
    CompletableFuture<Story> save(Story story);
    
    /**
     * Find story by ID
     */
    CompletableFuture<Optional<Story>> findById(String id);
    
    /**
     * Find all stories
     */
    CompletableFuture<List<Story>> findAll();
    
    /**
     * Find stories by category
     */
    CompletableFuture<List<Story>> findByCategory(String category);
    
    /**
     * Find available stories
     */
    CompletableFuture<List<Story>> findByAvailable(boolean available);
    
    /**
     * Find stories updated after timestamp
     */
    CompletableFuture<List<Story>> findUpdatedAfter(Instant timestamp);
    
    /**
     * Find stories with pagination
     */
    CompletableFuture<List<Story>> findWithPagination(int page, int size);
    
    /**
     * Count total stories
     */
    CompletableFuture<Long> count();
    
    /**
     * Count stories by category
     */
    CompletableFuture<Long> countByCategory(String category);
    
    /**
     * Count available stories
     */
    CompletableFuture<Long> countByAvailable(boolean available);
    
    /**
     * Delete story by ID
     */
    CompletableFuture<Boolean> deleteById(String id);
    
    /**
     * Find stories by multiple IDs
     */
    CompletableFuture<List<Story>> findByIds(List<String> ids);
    
    /**
     * Find popular stories (high download count)
     */
    CompletableFuture<List<Story>> findPopularStories(int limit);
    
    /**
     * Find highly rated stories
     */
    CompletableFuture<List<Story>> findHighRatedStories(double minRating, int limit);
    
    /**
     * Find stories by age range
     */
    CompletableFuture<List<Story>> findByAgeRange(String ageRange);
    
    /**
     * Find stories by tags
     */
    CompletableFuture<List<Story>> findByTags(List<String> tags);
    
    /**
     * Update story availability
     */
    CompletableFuture<Boolean> updateAvailability(String id, boolean available);
    
    /**
     * Increment download count
     */
    CompletableFuture<Boolean> incrementDownloadCount(String id);
    
    /**
     * Update story rating
     */
    CompletableFuture<Boolean> updateRating(String id, double rating);
    
    /**
     * Find stories for bulk sync
     */
    CompletableFuture<List<Story>> findForBulkSync(Instant lastSync, int limit, String cursor);
    
    /**
     * Get story statistics
     */
    CompletableFuture<StoryStats> getStoryStats();
    
    /**
     * Story statistics inner class
     */
    class StoryStats {
        private long totalStories;
        private long availableStories;
        private long unavailableStories;
        private long totalDownloads;
        private double averageRating;
        private String mostPopularCategory;
        
        public StoryStats() {}
        
        public StoryStats(long totalStories, long availableStories, long unavailableStories, 
                         long totalDownloads, double averageRating, String mostPopularCategory) {
            this.totalStories = totalStories;
            this.availableStories = availableStories;
            this.unavailableStories = unavailableStories;
            this.totalDownloads = totalDownloads;
            this.averageRating = averageRating;
            this.mostPopularCategory = mostPopularCategory;
        }
        
        // Getters and Setters
        public long getTotalStories() {
            return totalStories;
        }
        
        public void setTotalStories(long totalStories) {
            this.totalStories = totalStories;
        }
        
        public long getAvailableStories() {
            return availableStories;
        }
        
        public void setAvailableStories(long availableStories) {
            this.availableStories = availableStories;
        }
        
        public long getUnavailableStories() {
            return unavailableStories;
        }
        
        public void setUnavailableStories(long unavailableStories) {
            this.unavailableStories = unavailableStories;
        }
        
        public long getTotalDownloads() {
            return totalDownloads;
        }
        
        public void setTotalDownloads(long totalDownloads) {
            this.totalDownloads = totalDownloads;
        }
        
        public double getAverageRating() {
            return averageRating;
        }
        
        public void setAverageRating(double averageRating) {
            this.averageRating = averageRating;
        }
        
        public String getMostPopularCategory() {
            return mostPopularCategory;
        }
        
        public void setMostPopularCategory(String mostPopularCategory) {
            this.mostPopularCategory = mostPopularCategory;
        }
    }
}
