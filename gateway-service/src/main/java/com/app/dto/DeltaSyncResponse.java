package com.app.dto;

import com.app.model.Story;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Response DTO for delta sync endpoint.
 * Returns only changed/new stories and IDs of deleted stories.
 * 
 * This enables efficient batch sync by:
 * 1. Only returning stories that have changed (based on checksum comparison)
 * 2. Including deleted story IDs so client can remove them from cache
 * 3. Providing all version info in one response
 */
public class DeltaSyncResponse {

    @JsonProperty("serverVersion")
    private int serverVersion;

    @JsonProperty("assetVersion")
    private int assetVersion;

    @JsonProperty("stories")
    private List<Story> stories;

    @JsonProperty("deletedStoryIds")
    private List<String> deletedStoryIds;

    @JsonProperty("storyChecksums")
    private Map<String, String> storyChecksums;

    @JsonProperty("totalStories")
    private int totalStories;

    @JsonProperty("updatedCount")
    private int updatedCount;

    @JsonProperty("lastUpdated")
    private long lastUpdated;

    public DeltaSyncResponse() {
        this.stories = new ArrayList<>();
        this.deletedStoryIds = new ArrayList<>();
        this.storyChecksums = new HashMap<>();
    }

    public int getServerVersion() {
        return serverVersion;
    }

    public void setServerVersion(int serverVersion) {
        this.serverVersion = serverVersion;
    }

    public int getAssetVersion() {
        return assetVersion;
    }

    public void setAssetVersion(int assetVersion) {
        this.assetVersion = assetVersion;
    }

    public List<Story> getStories() {
        return stories;
    }

    public void setStories(List<Story> stories) {
        this.stories = stories;
        this.updatedCount = stories != null ? stories.size() : 0;
    }

    public List<String> getDeletedStoryIds() {
        return deletedStoryIds;
    }

    public void setDeletedStoryIds(List<String> deletedStoryIds) {
        this.deletedStoryIds = deletedStoryIds;
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

    public int getUpdatedCount() {
        return updatedCount;
    }

    public void setUpdatedCount(int updatedCount) {
        this.updatedCount = updatedCount;
    }

    public long getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(long lastUpdated) {
        this.lastUpdated = lastUpdated;
    }
}

