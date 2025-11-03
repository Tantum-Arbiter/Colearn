package com.app.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;

/**
 * Story entity representing a story in the system
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Story {
    
    private String id;
    private String title;
    private String category;
    private String tag;
    private String emoji;
    private String coverImage;
    private boolean isAvailable;
    private String ageRange;
    private Integer duration; // in minutes
    private String description;
    private List<StoryPage> pages;
    private Instant createdAt;
    private Instant updatedAt;
    private String version; // For versioning/caching
    private Long downloadCount;
    private Double rating;
    private List<String> tags; // Additional tags for filtering
    
    // Constructors
    public Story() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        this.isAvailable = true;
        this.downloadCount = 0L;
        this.rating = 0.0;
    }
    
    public Story(String id, String title, String category) {
        this();
        this.id = id;
        this.title = title;
        this.category = category;
    }
    
    // Getters and Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
        this.updatedAt = Instant.now();
    }
    
    public String getCategory() {
        return category;
    }
    
    public void setCategory(String category) {
        this.category = category;
        this.updatedAt = Instant.now();
    }
    
    public String getTag() {
        return tag;
    }
    
    public void setTag(String tag) {
        this.tag = tag;
    }
    
    public String getEmoji() {
        return emoji;
    }
    
    public void setEmoji(String emoji) {
        this.emoji = emoji;
    }
    
    public String getCoverImage() {
        return coverImage;
    }
    
    public void setCoverImage(String coverImage) {
        this.coverImage = coverImage;
    }
    
    public boolean isAvailable() {
        return isAvailable;
    }
    
    public void setAvailable(boolean available) {
        isAvailable = available;
        this.updatedAt = Instant.now();
    }
    
    public String getAgeRange() {
        return ageRange;
    }
    
    public void setAgeRange(String ageRange) {
        this.ageRange = ageRange;
    }
    
    public Integer getDuration() {
        return duration;
    }
    
    public void setDuration(Integer duration) {
        this.duration = duration;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public List<StoryPage> getPages() {
        return pages;
    }
    
    public void setPages(List<StoryPage> pages) {
        this.pages = pages;
        this.updatedAt = Instant.now();
    }
    
    public Instant getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
    
    public Instant getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public String getVersion() {
        return version;
    }
    
    public void setVersion(String version) {
        this.version = version;
    }
    
    public Long getDownloadCount() {
        return downloadCount;
    }
    
    public void setDownloadCount(Long downloadCount) {
        this.downloadCount = downloadCount;
    }
    
    public void incrementDownloadCount() {
        this.downloadCount = (this.downloadCount == null ? 0L : this.downloadCount) + 1;
        this.updatedAt = Instant.now();
    }
    
    public Double getRating() {
        return rating;
    }
    
    public void setRating(Double rating) {
        this.rating = rating;
    }
    
    public List<String> getTags() {
        return tags;
    }
    
    public void setTags(List<String> tags) {
        this.tags = tags;
    }
    
    // Helper methods
    public boolean hasPages() {
        return pages != null && !pages.isEmpty();
    }
    
    public int getPageCount() {
        return pages != null ? pages.size() : 0;
    }
    
    public boolean isPopular() {
        return downloadCount != null && downloadCount > 100;
    }
    
    public boolean isHighRated() {
        return rating != null && rating >= 4.0;
    }
    
    @Override
    public String toString() {
        return "Story{" +
                "id='" + id + '\'' +
                ", title='" + title + '\'' +
                ", category='" + category + '\'' +
                ", isAvailable=" + isAvailable +
                ", downloadCount=" + downloadCount +
                ", rating=" + rating +
                '}';
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Story story = (Story) o;
        return id != null && id.equals(story.id);
    }
    
    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : 0;
    }
}
