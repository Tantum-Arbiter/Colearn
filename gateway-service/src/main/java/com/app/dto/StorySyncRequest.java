package com.app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.HashMap;
import java.util.Map;

/**
 * Request DTO for story sync endpoint
 * Client sends their current story checksums to get delta updates
 */
public class StorySyncRequest {

    @JsonProperty("clientVersion")
    private Integer clientVersion;

    @JsonProperty("storyChecksums")
    private Map<String, String> storyChecksums;

    @JsonProperty("lastSyncTimestamp")
    private Long lastSyncTimestamp;

    public StorySyncRequest() {
        this.storyChecksums = new HashMap<>();
    }

    public Integer getClientVersion() {
        return clientVersion;
    }

    public void setClientVersion(Integer clientVersion) {
        this.clientVersion = clientVersion;
    }

    public Map<String, String> getStoryChecksums() {
        return storyChecksums;
    }

    public void setStoryChecksums(Map<String, String> storyChecksums) {
        this.storyChecksums = storyChecksums;
    }

    public Long getLastSyncTimestamp() {
        return lastSyncTimestamp;
    }

    public void setLastSyncTimestamp(Long lastSyncTimestamp) {
        this.lastSyncTimestamp = lastSyncTimestamp;
    }
}

