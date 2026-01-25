package com.app.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.annotation.Exclude;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class ContentVersion {

    @JsonProperty("id")
    private String id;

    @JsonProperty("version")
    private int version;

    @JsonIgnore
    private Timestamp lastUpdated;

    @JsonProperty("storyChecksums")
    private Map<String, String> storyChecksums;

    @JsonProperty("totalStories")
    private int totalStories;

    public ContentVersion() {
        this.id = "current";
        this.version = 1;
        this.lastUpdated = Timestamp.now();
        this.storyChecksums = new HashMap<>();
        this.totalStories = 0;
    }

    public void incrementVersion() {
        this.version++;
        this.lastUpdated = Timestamp.now();
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

    public Timestamp getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(Timestamp lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    @Exclude
    @JsonProperty("lastUpdated")
    public String getLastUpdatedIso() {
        return lastUpdated != null ? lastUpdated.toDate().toInstant().toString() : null;
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

