package com.app.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Tracks content versions for delta-sync
 * Stores checksums of all stories to enable efficient sync
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ContentVersion {

    @JsonProperty("id")
    private String id; // Always "current" for singleton pattern

    @JsonProperty("version")
    private int version; // Incremented on any story change

    @JsonProperty("lastUpdated")
    private Instant lastUpdated;

    @JsonProperty("storyChecksums")
    private Map<String, String> storyChecksums; // storyId -> SHA-256 checksum

    @JsonProperty("totalStories")
    private int totalStories;

    // Constructors
    public ContentVersion() {
        this.id = "current";
        this.version = 1;
        this.lastUpdated = Instant.now();
        this.storyChecksums = new HashMap<>();
        this.totalStories = 0;
    }

    // Helper methods
    public void incrementVersion() {
        this.version++;
        this.lastUpdated = Instant.now();
    }

    public void updateStoryChecksum(String storyId, String checksum) {
        this.storyChecksums.put(storyId, checksum);
        this.totalStories = this.storyChecksums.size();
        incrementVersion();
    }

    public void removeStoryChecksum(String storyId) {
        this.storyChecksums.remove(storyId);
        this.totalStories = this.storyChecksums.size();
        incrementVersion();
    }

    public boolean hasStoryChanged(String storyId, String checksum) {
        String existingChecksum = storyChecksums.get(storyId);
        return existingChecksum == null || !existingChecksum.equals(checksum);
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public Instant getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(Instant lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    public Map<String, String> getStoryChecksums() {
        return storyChecksums;
    }

    public void setStoryChecksums(Map<String, String> storyChecksums) {
        this.storyChecksums = storyChecksums;
        this.totalStories = storyChecksums != null ? storyChecksums.size() : 0;
    }

    public int getTotalStories() {
        return totalStories;
    }

    public void setTotalStories(int totalStories) {
        this.totalStories = totalStories;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ContentVersion that = (ContentVersion) o;
        return version == that.version &&
                Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, version);
    }

    @Override
    public String toString() {
        return "ContentVersion{" +
                "id='" + id + '\'' +
                ", version=" + version +
                ", totalStories=" + totalStories +
                ", lastUpdated=" + lastUpdated +
                '}';
    }
}

