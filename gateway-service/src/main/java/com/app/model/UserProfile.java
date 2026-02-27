package com.app.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.cloud.firestore.annotation.Exclude;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class UserProfile {

    @JsonProperty("userId")
    private String userId;

    @JsonProperty("nickname")
    private String nickname;

    @JsonProperty("avatarType")
    private String avatarType;

    @JsonProperty("avatarId")
    private String avatarId;

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

    public UserProfile() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        this.notifications = createDefaultNotifications();
        this.schedule = createDefaultSchedule();
    }

    public UserProfile(String userId) {
        this();
        this.userId = userId;
    }

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

    public void updateTimestamp() {
        this.updatedAt = Instant.now();
    }

    @Exclude
    @JsonIgnore
    public boolean isValid() {
        if (userId == null || userId.trim().isEmpty()) {
            return false;
        }
        if (nickname == null || nickname.trim().isEmpty() || nickname.length() > 20) {
            return false;
        }
        if (avatarType == null || (!avatarType.equals("boy") && !avatarType.equals("girl"))) {
            return false;
        }
        if (avatarId == null || avatarId.trim().isEmpty()) {
            return false;
        }
        if (notifications == null || schedule == null) {
            return false;
        }
        return true;
    }

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
