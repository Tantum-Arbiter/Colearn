package com.app.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class AssetVersion {

    @JsonProperty("id")
    private String id;

    @JsonProperty("version")
    private int version;

    @JsonProperty("lastUpdated")
    private Instant lastUpdated;

    @JsonProperty("assetChecksums")
    private Map<String, String> assetChecksums;

    @JsonProperty("totalAssets")
    private int totalAssets;

    @JsonProperty("totalSizeBytes")
    private long totalSizeBytes;

    public AssetVersion() {
        this.id = "current";
        this.version = 1;
        this.lastUpdated = Instant.now();
        this.assetChecksums = new HashMap<>();
        this.totalAssets = 0;
        this.totalSizeBytes = 0;
    }

    public void incrementVersion() {
        this.version++;
        this.lastUpdated = Instant.now();
    }

    public void updateAssetChecksum(String assetPath, String checksum) {
        this.assetChecksums.put(assetPath, checksum);
        this.totalAssets = this.assetChecksums.size();
        incrementVersion();
    }

    public void removeAssetChecksum(String assetPath) {
        this.assetChecksums.remove(assetPath);
        this.totalAssets = this.assetChecksums.size();
        incrementVersion();
    }

    public boolean hasAssetChanged(String assetPath, String checksum) {
        String existingChecksum = assetChecksums.get(assetPath);
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

    public Instant getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(Instant lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    public Map<String, String> getAssetChecksums() {
        return assetChecksums;
    }

    public void setAssetChecksums(Map<String, String> assetChecksums) {
        this.assetChecksums = assetChecksums;
        this.totalAssets = assetChecksums != null ? assetChecksums.size() : 0;
    }

    public int getTotalAssets() {
        return totalAssets;
    }

    public void setTotalAssets(int totalAssets) {
        this.totalAssets = totalAssets;
    }

    public long getTotalSizeBytes() {
        return totalSizeBytes;
    }

    public void setTotalSizeBytes(long totalSizeBytes) {
        this.totalSizeBytes = totalSizeBytes;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AssetVersion that = (AssetVersion) o;
        return version == that.version && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, version);
    }

    @Override
    public String toString() {
        return "AssetVersion{id='" + id + "', version=" + version + 
               ", totalAssets=" + totalAssets + ", lastUpdated=" + lastUpdated + "}";
    }
}

