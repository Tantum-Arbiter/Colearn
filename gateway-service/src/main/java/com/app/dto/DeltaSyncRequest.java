package com.app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.HashMap;
import java.util.Map;

public class DeltaSyncRequest {

    public static final int MAX_STORY_CHECKSUMS = 500;
    public static final int MAX_ACHIEVEMENT_CHECKSUMS = 500;

    @JsonProperty("clientVersion")
    @NotNull(message = "clientVersion is required")
    private Integer clientVersion;

    @JsonProperty("storyChecksums")
    @Size(max = MAX_STORY_CHECKSUMS, message = "storyChecksums cannot exceed " + MAX_STORY_CHECKSUMS + " entries")
    private Map<String, String> storyChecksums;

    @JsonProperty("achievementChecksums")
    @Size(max = MAX_ACHIEVEMENT_CHECKSUMS, message = "achievementChecksums cannot exceed " + MAX_ACHIEVEMENT_CHECKSUMS + " entries")
    private Map<String, String> achievementChecksums;

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

    public Map<String, String> getAchievementChecksums() {
        return achievementChecksums != null ? achievementChecksums : new HashMap<>();
    }

    public void setAchievementChecksums(Map<String, String> achievementChecksums) {
        this.achievementChecksums = achievementChecksums;
    }
}
