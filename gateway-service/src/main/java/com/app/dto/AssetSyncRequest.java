package com.app.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.HashMap;
import java.util.Map;

/**
 * Request DTO for asset sync endpoint.
 * Client sends their current asset checksums to get delta updates.
 */
public class AssetSyncRequest {

    /**
     * Maximum number of asset checksums allowed in a single request.
     * This prevents memory exhaustion from maliciously large requests.
     */
    public static final int MAX_ASSET_CHECKSUMS = 10000;

    @JsonProperty("clientVersion")
    @NotNull(message = "clientVersion is required")
    private Integer clientVersion;

    @JsonProperty("assetChecksums")
    @NotNull(message = "assetChecksums is required")
    @Size(max = MAX_ASSET_CHECKSUMS, message = "assetChecksums cannot exceed " + MAX_ASSET_CHECKSUMS + " entries")
    private Map<String, String> assetChecksums; // assetPath -> checksum

    @JsonProperty("lastSyncTimestamp")
    @NotNull(message = "lastSyncTimestamp is required")
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

