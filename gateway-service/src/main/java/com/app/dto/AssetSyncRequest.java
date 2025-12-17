package com.app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.HashMap;
import java.util.Map;

/**
 * Request DTO for asset sync endpoint.
 * Client sends their current asset checksums to get delta updates.
 */
public class AssetSyncRequest {

    @JsonProperty("clientVersion")
    private Integer clientVersion;

    @JsonProperty("assetChecksums")
    private Map<String, String> assetChecksums; // assetPath -> checksum

    @JsonProperty("lastSyncTimestamp")
    private Long lastSyncTimestamp;

    public AssetSyncRequest() {
        this.assetChecksums = new HashMap<>();
    }

    public Integer getClientVersion() {
        return clientVersion;
    }

    public void setClientVersion(Integer clientVersion) {
        this.clientVersion = clientVersion;
    }

    public Map<String, String> getAssetChecksums() {
        return assetChecksums;
    }

    public void setAssetChecksums(Map<String, String> assetChecksums) {
        this.assetChecksums = assetChecksums;
    }

    public Long getLastSyncTimestamp() {
        return lastSyncTimestamp;
    }

    public void setLastSyncTimestamp(Long lastSyncTimestamp) {
        this.lastSyncTimestamp = lastSyncTimestamp;
    }
}

