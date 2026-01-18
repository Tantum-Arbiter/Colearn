package com.app.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.cloud.firestore.annotation.Exclude;


import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * User session model for Firebase Firestore
 * Tracks active user sessions and refresh tokens
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserSession {

    @JsonProperty("id")
    private String id; // Session ID

    @JsonProperty("userId")
    private String userId;

    @JsonProperty("refreshToken")
    private String refreshToken;

    @JsonProperty("deviceId")
    private String deviceId;

    @JsonProperty("deviceType")
    private String deviceType; // "mobile", "tablet", "desktop"

    @JsonProperty("platform")
    private String platform; // "ios", "android", "web"

    @JsonProperty("appVersion")
    private String appVersion;

    @JsonProperty("isActive")
    private boolean isActive = true;

    @JsonProperty("createdAt")
    private Instant createdAt;

    @JsonProperty("lastAccessedAt")
    private Instant lastAccessedAt;

    @JsonProperty("expiresAt")
    private Instant expiresAt;

    @JsonProperty("revokedAt")
    private Instant revokedAt;

    /**
     * COPPA COMPLIANCE WARNING: This field must NOT contain any PII.
     * Only store anonymous, non-identifying technical data if needed.
     * Currently unused - kept for future extensibility.
     */
    @JsonProperty("metadata")
    private Map<String, Object> metadata = new HashMap<>();

    // Default constructor
    public UserSession() {
        this.createdAt = Instant.now();
        this.lastAccessedAt = Instant.now();
    }

    // Constructor for new session
    public UserSession(String id, String userId, String refreshToken, String deviceId) {
        this();
        this.id = id;
        this.userId = userId;
        this.refreshToken = refreshToken;
        this.deviceId = deviceId;

        // Set expiration to 7 days from now (default refresh token expiry)
        this.expiresAt = Instant.now().plusSeconds(7 * 24 * 60 * 60);
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getRefreshToken() {
        return refreshToken;
    }

    public void setRefreshToken(String refreshToken) {
        this.refreshToken = refreshToken;
    }

    public String getDeviceId() {
        return deviceId;
    }

    public void setDeviceId(String deviceId) {
        this.deviceId = deviceId;
    }

    public String getDeviceType() {
        return deviceType;
    }

    public void setDeviceType(String deviceType) {
        this.deviceType = deviceType;
    }

    public String getPlatform() {
        return platform;
    }

    public void setPlatform(String platform) {
        this.platform = platform;
    }

    public String getAppVersion() {
        return appVersion;
    }

    public void setAppVersion(String appVersion) {
        this.appVersion = appVersion;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getLastAccessedAt() {
        return lastAccessedAt;
    }

    public void setLastAccessedAt(Instant lastAccessedAt) {
        this.lastAccessedAt = lastAccessedAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(Instant revokedAt) {
        this.revokedAt = revokedAt;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }

    // Helper methods - excluded from Firestore serialization (computed properties)
    @Exclude
    @JsonIgnore
    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }

    @Exclude
    @JsonIgnore
    public boolean isRevoked() {
        return revokedAt != null;
    }

    @Exclude
    @JsonIgnore
    public boolean isValid() {
        return isActive && !isExpired() && !isRevoked();
    }

    public void updateLastAccessed() {
        this.lastAccessedAt = Instant.now();
    }

    public void revoke() {
        this.isActive = false;
        this.revokedAt = Instant.now();
    }

    public void extend(long additionalSeconds) {
        if (this.expiresAt != null) {
            this.expiresAt = this.expiresAt.plusSeconds(additionalSeconds);
        } else {
            this.expiresAt = Instant.now().plusSeconds(additionalSeconds);
        }
    }

    @Exclude
    @JsonIgnore
    public long getTimeUntilExpiry() {
        if (expiresAt == null) return Long.MAX_VALUE;
        return expiresAt.getEpochSecond() - Instant.now().getEpochSecond();
    }

    public void addMetadata(String key, Object value) {
        if (this.metadata == null) {
            this.metadata = new HashMap<>();
        }
        this.metadata.put(key, value);
    }

    public Object getMetadata(String key) {
        return this.metadata != null ? this.metadata.get(key) : null;
    }

    @Override
    public String toString() {
        return "UserSession{" +
                "id='" + id + '\'' +
                ", userId='" + userId + '\'' +
                ", deviceId='" + deviceId + '\'' +
                ", deviceType='" + deviceType + '\'' +
                ", platform='" + platform + '\'' +
                ", isActive=" + isActive +
                ", isExpired=" + isExpired() +
                ", isRevoked=" + isRevoked() +
                ", createdAt=" + createdAt +
                ", lastAccessedAt=" + lastAccessedAt +
                ", expiresAt=" + expiresAt +
                '}';
    }
}
