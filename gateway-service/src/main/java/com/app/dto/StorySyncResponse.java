package com.app.dto;

import com.app.model.Story;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Response DTO for story sync endpoint
 * Returns stories that need to be updated and current version info
 *
 * Includes asset version to allow mobile app to check both versions in one call.
 * This prevents the edge case where assets change but stories don't.
 */
public class StorySyncResponse {

    @JsonProperty("serverVersion")
    private int serverVersion;

    @JsonProperty("assetVersion")
    private int assetVersion;

    @JsonProperty("stories")
    private List<Story> stories;

    @JsonProperty("storyChecksums")
    private Map<String, String> storyChecksums;

    @JsonProperty("totalStories")
    private int totalStories;

    @JsonProperty("updatedStories")
    private int updatedStories;

    @JsonProperty("lastUpdated")
    private Long lastUpdated;

    public StorySyncResponse() {
        this.stories = new ArrayList<>();
        this.storyChecksums = new HashMap<>();
        this.assetVersion = 0;
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
        this.updatedStories = stories.size();
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

    public int getUpdatedStories() {
        return updatedStories;
    }

    public void setUpdatedStories(int updatedStories) {
        this.updatedStories = updatedStories;
    }

    public Long getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(Long lastUpdated) {
        this.lastUpdated = lastUpdated;
    }
}

