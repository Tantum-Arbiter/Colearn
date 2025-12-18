package com.app.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * User profile model for Firebase Firestore
 * Stores non-PII user preferences and settings that sync across devices
 * Separate from User model to maintain privacy compliance
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserProfile {

    @JsonProperty("userId")
    private String userId;

    @JsonProperty("nickname")
    private String nickname;

    @JsonProperty("avatarType")
    private String avatarType; // "boy" or "girl"

    @JsonProperty("avatarId")
    private String avatarId; // e.g., "boy_1", "girl_2"

    @JsonProperty("notifications")
    private Map<String, Object> notifications = new HashMap<>();

    @JsonProperty("schedule")
    private Map<String, Object> schedule = new HashMap<>();

    @JsonProperty("createdAt")
    private Instant createdAt;

    @JsonProperty("updatedAt")
    private Instant updatedAt;

    @JsonProperty("version")
    private int version = 1;

    // Default constructor
    public UserProfile() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        this.notifications = createDefaultNotifications();
        this.schedule = createDefaultSchedule();
    }

    // Constructor with userId
    public UserProfile(String userId) {
        this();
        this.userId = userId;
    }

    // Getters and Setters
    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getAvatarType() {
        return avatarType;
    }

    public void setAvatarType(String avatarType) {
        this.avatarType = avatarType;
    }

    public String getAvatarId() {
        return avatarId;
    }

    public void setAvatarId(String avatarId) {
        this.avatarId = avatarId;
    }

    public Map<String, Object> getNotifications() {
        return notifications;
    }

    public void setNotifications(Map<String, Object> notifications) {
        this.notifications = notifications;
    }

    public Map<String, Object> getSchedule() {
        return schedule;
    }

    public void setSchedule(Map<String, Object> schedule) {
        this.schedule = schedule;
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

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    // Helper methods
    public void updateTimestamp() {
        this.updatedAt = Instant.now();
    }

    /**
     * Validate profile data
     * @return true if profile is valid, false otherwise
     */
    public boolean isValid() {
        // userId is required
        if (userId == null || userId.trim().isEmpty()) {
            return false;
        }

        // nickname is required and must be 1-20 characters
        if (nickname == null || nickname.trim().isEmpty() || nickname.length() > 20) {
            return false;
        }

        // avatarType must be "boy" or "girl"
        if (avatarType == null || (!avatarType.equals("boy") && !avatarType.equals("girl"))) {
            return false;
        }

        // avatarId is required
        if (avatarId == null || avatarId.trim().isEmpty()) {
            return false;
        }

        // notifications and schedule must not be null
        if (notifications == null || schedule == null) {
            return false;
        }

        return true;
    }

    /**
     * Create default notifications structure
     * @return Map with default notification settings
     */
    public static Map<String, Object> createDefaultNotifications() {
        Map<String, Object> notifications = new HashMap<>();
        notifications.put("enabled", true);
        notifications.put("storyReminders", true);
        notifications.put("emotionCheckIns", true);
        notifications.put("bedtimeReminders", true);
        notifications.put("soundEnabled", true);
        notifications.put("vibrationEnabled", false);
        return notifications;
    }

    /**
     * Create default schedule structure
     * @return Empty map (user must configure schedule)
     */
    public static Map<String, Object> createDefaultSchedule() {
        return new HashMap<>();
    }

    @Override
    public String toString() {
        return "UserProfile{" +
                "userId='" + userId + '\'' +
                ", nickname='" + nickname + '\'' +
                ", avatarType='" + avatarType + '\'' +
                ", avatarId='" + avatarId + '\'' +
                ", version=" + version +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }
}
