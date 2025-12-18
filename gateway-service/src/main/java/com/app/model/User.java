package com.app.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * User entity model for Firebase Firestore
 * Represents a parent/guardian user in the Grow with Freya app
 *
 * PII-free design: No email, name, or personally identifying information is stored.
 * User identification relies on provider + providerId for cross-device sync.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class User {

    @JsonProperty("id")
    private String id;

    @JsonProperty("provider")
    private String provider; // "google", "apple"

    @JsonProperty("providerId")
    private String providerId; // OAuth provider's user ID (opaque identifier)

    @JsonProperty("isActive")
    private boolean isActive = true;

    @JsonProperty("lastLoginAt")
    private Instant lastLoginAt;

    @JsonProperty("createdAt")
    private Instant createdAt;

    @JsonProperty("updatedAt")
    private Instant updatedAt;

    @JsonProperty("preferences")
    private UserPreferences preferences;

    @JsonProperty("children")
    private List<ChildProfile> children = new ArrayList<>();

    @JsonProperty("metadata")
    private Map<String, Object> metadata = new HashMap<>();

    // Default constructor for Firebase
    public User() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        this.preferences = new UserPreferences();
    }

    // Constructor for new user creation
    public User(String id, String provider, String providerId) {
        this();
        this.id = id;
        this.provider = provider;
        this.providerId = providerId;
        this.lastLoginAt = Instant.now();
    }

    // Getters and Setters
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

    public UserPreferences getPreferences() {
        return preferences;
    }

    public void setPreferences(UserPreferences preferences) {
        this.preferences = preferences;
    }

    public List<ChildProfile> getChildren() {
        return children;
    }

    public void setChildren(List<ChildProfile> children) {
        this.children = children;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }

    // Helper methods
    public void updateLastLogin() {
        this.lastLoginAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public void addChild(ChildProfile child) {
        if (this.children == null) {
            this.children = new ArrayList<>();
        }
        this.children.add(child);
        this.updatedAt = Instant.now();
    }

    public boolean removeChild(String childId) {
        if (this.children != null) {
            boolean removed = this.children.removeIf(child -> child.getId().equals(childId));
            if (removed) {
                this.updatedAt = Instant.now();
            }
            return removed;
        }
        return false;
    }

    public ChildProfile getChildById(String childId) {
        if (this.children != null) {
            return this.children.stream()
                    .filter(child -> child.getId().equals(childId))
                    .findFirst()
                    .orElse(null);
        }
        return null;
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
                ", childrenCount=" + (children != null ? children.size() : 0) +
                '}';
    }
}
