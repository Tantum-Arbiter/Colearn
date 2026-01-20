package com.app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

/**
 * Response DTO for version check endpoint.
 * Combines story and asset versions for unified version tracking.
 * This prevents edge cases where assets change but stories don't.
 */
public class ContentVersionResponse {

    @JsonProperty("id")
    private String id;

    @JsonProperty("version")
    private int version;

    @JsonProperty("assetVersion")
    private int assetVersion;

    @JsonProperty("lastUpdated")
    private long lastUpdated;

    @JsonProperty("storyChecksums")
    private Map<String, String> storyChecksums;

    @JsonProperty("totalStories")
    private int totalStories;

    public ContentVersionResponse() {
        this.id = "current";
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

    public int getAssetVersion() {
        return assetVersion;
    }

    public void setAssetVersion(int assetVersion) {
        this.assetVersion = assetVersion;
    }

    public long getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(long lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    public Map<String, String> getStoryChecksums() {
        return storyChecksums;
    }

    public void setStoryChecksums(Map<String, String> storyChecksums) {
        this.storyChecksums = storyChecksums;
    }

    public int getTotalStories() {
        return totalStories;
    }

    public void setTotalStories(int totalStories) {
        this.totalStories = totalStories;
    }
}

