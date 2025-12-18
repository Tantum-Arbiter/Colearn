package com.app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Response DTO for asset sync endpoint.
 * Returns signed URLs for assets that need to be updated.
 */
public class AssetSyncResponse {

    @JsonProperty("serverVersion")
    private int serverVersion;

    @JsonProperty("updatedAssets")
    private List<AssetInfo> updatedAssets;

    @JsonProperty("assetChecksums")
    private Map<String, String> assetChecksums;

    @JsonProperty("totalAssets")
    private int totalAssets;

    @JsonProperty("updatedCount")
    private int updatedCount;

    @JsonProperty("lastUpdated")
    private Long lastUpdated;

    public AssetSyncResponse() {
        this.updatedAssets = new ArrayList<>();
        this.assetChecksums = new HashMap<>();
    }

    public int getServerVersion() {
        return serverVersion;
    }

    public void setServerVersion(int serverVersion) {
        this.serverVersion = serverVersion;
    }

    public List<AssetInfo> getUpdatedAssets() {
        return updatedAssets;
    }

    public void setUpdatedAssets(List<AssetInfo> updatedAssets) {
        this.updatedAssets = updatedAssets;
        this.updatedCount = updatedAssets != null ? updatedAssets.size() : 0;
    }

    public Map<String, String> getAssetChecksums() {
        return assetChecksums;
    }

    public void setAssetChecksums(Map<String, String> assetChecksums) {
        this.assetChecksums = assetChecksums;
    }

    public int getTotalAssets() {
        return totalAssets;
    }

    public void setTotalAssets(int totalAssets) {
        this.totalAssets = totalAssets;
    }

    public int getUpdatedCount() {
        return updatedCount;
    }

    public void setUpdatedCount(int updatedCount) {
        this.updatedCount = updatedCount;
    }

    public Long getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(Long lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    /**
     * Information about a single asset including its signed URL.
     */
    public static class AssetInfo {
        @JsonProperty("path")
        private String path;

        @JsonProperty("signedUrl")
        private String signedUrl;

        @JsonProperty("checksum")
        private String checksum;

        @JsonProperty("sizeBytes")
        private long sizeBytes;

        @JsonProperty("contentType")
        private String contentType;

        public AssetInfo() {}

        public AssetInfo(String path, String signedUrl, String checksum) {
            this.path = path;
            this.signedUrl = signedUrl;
            this.checksum = checksum;
        }

        public String getPath() { return path; }
        public void setPath(String path) { this.path = path; }

        public String getSignedUrl() { return signedUrl; }
        public void setSignedUrl(String signedUrl) { this.signedUrl = signedUrl; }

        public String getChecksum() { return checksum; }
        public void setChecksum(String checksum) { this.checksum = checksum; }

        public long getSizeBytes() { return sizeBytes; }
        public void setSizeBytes(long sizeBytes) { this.sizeBytes = sizeBytes; }

        public String getContentType() { return contentType; }
        public void setContentType(String contentType) { this.contentType = contentType; }
    }
}

