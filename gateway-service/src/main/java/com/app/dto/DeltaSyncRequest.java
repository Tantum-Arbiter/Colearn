package com.app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.HashMap;
import java.util.Map;

/**
 * Request DTO for delta sync endpoint.
 * Simplified version of StorySyncRequest for batch processing.
 * 
 * Client sends their current version and story checksums to get only changed content.
 */
public class DeltaSyncRequest {

    /**
     * Maximum number of story checksums allowed per request.
     */
    public static final int MAX_STORY_CHECKSUMS = 500;

    @JsonProperty("clientVersion")
    @NotNull(message = "clientVersion is required")
    private Integer clientVersion;

    @JsonProperty("storyChecksums")
    @Size(max = MAX_STORY_CHECKSUMS, message = "storyChecksums cannot exceed " + MAX_STORY_CHECKSUMS + " entries")
    private Map<String, String> storyChecksums;

    public DeltaSyncRequest() {
        this.storyChecksums = new HashMap<>();
    }

    public Integer getClientVersion() {
        return clientVersion;
    }

    public void setClientVersion(Integer clientVersion) {
        this.clientVersion = clientVersion;
    }

    public Map<String, String> getStoryChecksums() {
        return storyChecksums != null ? storyChecksums : new HashMap<>();
    }

    public void setStoryChecksums(Map<String, String> storyChecksums) {
        this.storyChecksums = storyChecksums;
    }
}

