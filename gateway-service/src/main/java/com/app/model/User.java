package com.app.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.cloud.firestore.annotation.IgnoreExtraProperties;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
@IgnoreExtraProperties
public class User {

    @JsonProperty("id")
    private String id;

    @JsonProperty("provider")
    private String provider;

    @JsonProperty("providerId")
    private String providerId;

    @JsonProperty("isActive")
    private boolean isActive = true;

    @JsonProperty("lastLoginAt")
    private Instant lastLoginAt;

    @JsonProperty("createdAt")
    private Instant createdAt;

    @JsonProperty("updatedAt")
    private Instant updatedAt;

    @JsonProperty("metadata")
    private Map<String, Object> metadata = new HashMap<>();

    public User() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public User(String id, String provider, String providerId) {
        this();
        this.id = id;
        this.provider = provider;
        this.providerId = providerId;
        this.lastLoginAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getProviderId() {
        return providerId;
    }

    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public Instant getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(Instant lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }

    public void updateLastLogin() {
        this.lastLoginAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void addMetadata(String key, Object value) {
        if (this.metadata == null) {
            this.metadata = new HashMap<>();
        }
        this.metadata.put(key, value);
        this.updatedAt = Instant.now();
    }

    @Override
    public String toString() {
        return "User{" +
                "id='" + id + '\'' +
                ", provider='" + provider + '\'' +
                ", isActive=" + isActive +
                ", lastLoginAt=" + lastLoginAt +
                ", createdAt=" + createdAt +
                '}';
    }
}
