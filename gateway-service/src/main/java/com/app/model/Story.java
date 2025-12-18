package com.app.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Represents a story with metadata and pages
 * Visual assets (images, audio) are stored in iOS/Android asset packs
 * This model contains only metadata and text content
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class Story {

    @JsonProperty("id")
    private String id;

    @JsonProperty("title")
    private String title;

    @JsonProperty("category")
    private String category; // bedtime, adventure, friendship, etc.

    @JsonProperty("tag")
    private String tag; // Display tag like "🌙 Bedtime"

    @JsonProperty("emoji")
    private String emoji;

    @JsonProperty("coverImage")
    private String coverImage; // Asset path reference

    @JsonProperty("isAvailable")
    private boolean available;

    @JsonProperty("ageRange")
    private String ageRange; // e.g., "2-5"

    @JsonProperty("duration")
    private Integer duration; // Number of pages

    @JsonProperty("description")
    private String description;

    @JsonProperty("pages")
    private List<StoryPage> pages;

    @JsonProperty("isPremium")
    private boolean isPremium;

    @JsonProperty("author")
    private String author;

    @JsonProperty("tags")
    private List<String> tags;

    @JsonProperty("createdAt")
    private Instant createdAt;

    @JsonProperty("updatedAt")
    private Instant updatedAt;

    @JsonProperty("version")
    private int version; // For delta-sync

    @JsonProperty("checksum")
    private String checksum; // SHA-256 hash of content for delta-sync

    // Constructors
    public Story() {
        this.pages = new ArrayList<>();
        this.tags = new ArrayList<>();
        this.available = true;
        this.isPremium = false;
        this.version = 1;
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public Story(String id, String title, String category) {
        this();
        this.id = id;
        this.title = title;
        this.category = category;
    }

    // Helper methods
    public void updateTimestamp() {
        this.updatedAt = Instant.now();
        this.version++;
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
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
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
        return available;
    }

    public void setAvailable(boolean available) {
        this.available = available;
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
    }

    public boolean isPremium() {
        return isPremium;
    }

    public void setPremium(boolean premium) {
        isPremium = premium;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
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

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public String getChecksum() {
        return checksum;
    }

    public void setChecksum(String checksum) {
        this.checksum = checksum;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Story story = (Story) o;
        return Objects.equals(id, story.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Story{" +
                "id='" + id + '\'' +
                ", title='" + title + '\'' +
                ", category='" + category + '\'' +
                ", version=" + version +
                '}';
    }
}

