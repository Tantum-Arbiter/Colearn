package com.app.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Data Transfer Objects for User Management
 */
public class UserDTOs {

    /**
     * User profile response DTO
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class UserProfileResponse {
        @JsonProperty("id")
        private String id;

        @JsonProperty("email")
        private String email;

        @JsonProperty("name")
        private String name;

        @JsonProperty("picture")
        private String picture;

        @JsonProperty("provider")
        private String provider;

        @JsonProperty("isActive")
        private boolean isActive;

        @JsonProperty("isEmailVerified")
        private boolean isEmailVerified;

        @JsonProperty("lastLoginAt")
        private Instant lastLoginAt;

        @JsonProperty("createdAt")
        private Instant createdAt;

        @JsonProperty("children")
        private List<ChildProfileResponse> children;

        @JsonProperty("preferences")
        private UserPreferencesResponse preferences;

        // Getters and Setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getPicture() { return picture; }
        public void setPicture(String picture) { this.picture = picture; }

        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider; }

        public boolean isActive() { return isActive; }
        public void setActive(boolean active) { isActive = active; }

        public boolean isEmailVerified() { return isEmailVerified; }
        public void setEmailVerified(boolean emailVerified) { isEmailVerified = emailVerified; }

        public Instant getLastLoginAt() { return lastLoginAt; }
        public void setLastLoginAt(Instant lastLoginAt) { this.lastLoginAt = lastLoginAt; }

        public Instant getCreatedAt() { return createdAt; }
        public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

        public List<ChildProfileResponse> getChildren() { return children; }
        public void setChildren(List<ChildProfileResponse> children) { this.children = children; }

        public UserPreferencesResponse getPreferences() { return preferences; }
        public void setPreferences(UserPreferencesResponse preferences) { this.preferences = preferences; }
    }

    /**
     * Child profile response DTO
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ChildProfileResponse {
        @JsonProperty("id")
        private String id;

        @JsonProperty("name")
        private String name;

        @JsonProperty("avatar")
        private String avatar;

        @JsonProperty("ageInMonths")
        private int ageInMonths;

        @JsonProperty("ageRange")
        private String ageRange;

        @JsonProperty("isActive")
        private boolean isActive;

        @JsonProperty("createdAt")
        private Instant createdAt;

        @JsonProperty("progress")
        private ChildProgressResponse progress;

        @JsonProperty("screenTime")
        private ScreenTimeResponse screenTime;

        @JsonProperty("favorites")
        private List<String> favorites;

        // Getters and Setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getAvatar() { return avatar; }
        public void setAvatar(String avatar) { this.avatar = avatar; }

        public int getAgeInMonths() { return ageInMonths; }
        public void setAgeInMonths(int ageInMonths) { this.ageInMonths = ageInMonths; }

        public String getAgeRange() { return ageRange; }
        public void setAgeRange(String ageRange) { this.ageRange = ageRange; }

        public boolean isActive() { return isActive; }
        public void setActive(boolean active) { isActive = active; }

        public Instant getCreatedAt() { return createdAt; }
        public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

        public ChildProgressResponse getProgress() { return progress; }
        public void setProgress(ChildProgressResponse progress) { this.progress = progress; }

        public ScreenTimeResponse getScreenTime() { return screenTime; }
        public void setScreenTime(ScreenTimeResponse screenTime) { this.screenTime = screenTime; }

        public List<String> getFavorites() { return favorites; }
        public void setFavorites(List<String> favorites) { this.favorites = favorites; }
    }

    /**
     * Child progress response DTO
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ChildProgressResponse {
        @JsonProperty("storiesCompleted")
        private int storiesCompleted;

        @JsonProperty("totalTimeSpentMinutes")
        private int totalTimeSpentMinutes;

        @JsonProperty("currentStreak")
        private int currentStreak;

        @JsonProperty("longestStreak")
        private int longestStreak;

        @JsonProperty("achievements")
        private List<String> achievements;

        @JsonProperty("lastActivityAt")
        private Instant lastActivityAt;

        // Getters and Setters
        public int getStoriesCompleted() { return storiesCompleted; }
        public void setStoriesCompleted(int storiesCompleted) { this.storiesCompleted = storiesCompleted; }

        public int getTotalTimeSpentMinutes() { return totalTimeSpentMinutes; }
        public void setTotalTimeSpentMinutes(int totalTimeSpentMinutes) { this.totalTimeSpentMinutes = totalTimeSpentMinutes; }

        public int getCurrentStreak() { return currentStreak; }
        public void setCurrentStreak(int currentStreak) { this.currentStreak = currentStreak; }

        public int getLongestStreak() { return longestStreak; }
        public void setLongestStreak(int longestStreak) { this.longestStreak = longestStreak; }

        public List<String> getAchievements() { return achievements; }
        public void setAchievements(List<String> achievements) { this.achievements = achievements; }

        public Instant getLastActivityAt() { return lastActivityAt; }
        public void setLastActivityAt(Instant lastActivityAt) { this.lastActivityAt = lastActivityAt; }
    }

    /**
     * Screen time response DTO
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ScreenTimeResponse {
        @JsonProperty("todayMinutes")
        private int todayMinutes;

        @JsonProperty("weekMinutes")
        private int weekMinutes;

        @JsonProperty("monthMinutes")
        private int monthMinutes;

        @JsonProperty("dailyLimitMinutes")
        private int dailyLimitMinutes;

        @JsonProperty("remainingMinutes")
        private int remainingMinutes;

        // Getters and Setters
        public int getTodayMinutes() { return todayMinutes; }
        public void setTodayMinutes(int todayMinutes) { this.todayMinutes = todayMinutes; }

        public int getWeekMinutes() { return weekMinutes; }
        public void setWeekMinutes(int weekMinutes) { this.weekMinutes = weekMinutes; }

        public int getMonthMinutes() { return monthMinutes; }
        public void setMonthMinutes(int monthMinutes) { this.monthMinutes = monthMinutes; }

        public int getDailyLimitMinutes() { return dailyLimitMinutes; }
        public void setDailyLimitMinutes(int dailyLimitMinutes) { this.dailyLimitMinutes = dailyLimitMinutes; }

        public int getRemainingMinutes() { return remainingMinutes; }
        public void setRemainingMinutes(int remainingMinutes) { this.remainingMinutes = remainingMinutes; }
    }

    /**
     * User preferences response DTO
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class UserPreferencesResponse {
        @JsonProperty("language")
        private String language;

        @JsonProperty("timezone")
        private String timezone;

        @JsonProperty("theme")
        private String theme;

        @JsonProperty("notifications")
        private NotificationPreferencesResponse notifications;

        @JsonProperty("screenTime")
        private ScreenTimePreferencesResponse screenTime;

        @JsonProperty("audio")
        private AudioPreferencesResponse audio;

        @JsonProperty("privacy")
        private PrivacyPreferencesResponse privacy;

        // Getters and Setters
        public String getLanguage() { return language; }
        public void setLanguage(String language) { this.language = language; }

        public String getTimezone() { return timezone; }
        public void setTimezone(String timezone) { this.timezone = timezone; }

        public String getTheme() { return theme; }
        public void setTheme(String theme) { this.theme = theme; }

        public NotificationPreferencesResponse getNotifications() { return notifications; }
        public void setNotifications(NotificationPreferencesResponse notifications) { this.notifications = notifications; }

        public ScreenTimePreferencesResponse getScreenTime() { return screenTime; }
        public void setScreenTime(ScreenTimePreferencesResponse screenTime) { this.screenTime = screenTime; }

        public AudioPreferencesResponse getAudio() { return audio; }
        public void setAudio(AudioPreferencesResponse audio) { this.audio = audio; }

        public PrivacyPreferencesResponse getPrivacy() { return privacy; }
        public void setPrivacy(PrivacyPreferencesResponse privacy) { this.privacy = privacy; }
    }

    // Nested preference response DTOs
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class NotificationPreferencesResponse {
        @JsonProperty("pushEnabled")
        private boolean pushEnabled;

        @JsonProperty("emailEnabled")
        private boolean emailEnabled;

        @JsonProperty("reminderEnabled")
        private boolean reminderEnabled;

        // Getters and Setters
        public boolean isPushEnabled() { return pushEnabled; }
        public void setPushEnabled(boolean pushEnabled) { this.pushEnabled = pushEnabled; }

        public boolean isEmailEnabled() { return emailEnabled; }
        public void setEmailEnabled(boolean emailEnabled) { this.emailEnabled = emailEnabled; }

        public boolean isReminderEnabled() { return reminderEnabled; }
        public void setReminderEnabled(boolean reminderEnabled) { this.reminderEnabled = reminderEnabled; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ScreenTimePreferencesResponse {
        @JsonProperty("dailyLimitMinutes")
        private int dailyLimitMinutes;

        @JsonProperty("warningMinutes")
        private int warningMinutes;

        @JsonProperty("bedtimeEnabled")
        private boolean bedtimeEnabled;

        // Getters and Setters
        public int getDailyLimitMinutes() { return dailyLimitMinutes; }
        public void setDailyLimitMinutes(int dailyLimitMinutes) { this.dailyLimitMinutes = dailyLimitMinutes; }

        public int getWarningMinutes() { return warningMinutes; }
        public void setWarningMinutes(int warningMinutes) { this.warningMinutes = warningMinutes; }

        public boolean isBedtimeEnabled() { return bedtimeEnabled; }
        public void setBedtimeEnabled(boolean bedtimeEnabled) { this.bedtimeEnabled = bedtimeEnabled; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AudioPreferencesResponse {
        @JsonProperty("musicVolume")
        private double musicVolume;

        @JsonProperty("effectsVolume")
        private double effectsVolume;

        @JsonProperty("voiceVolume")
        private double voiceVolume;

        @JsonProperty("backgroundMusicEnabled")
        private boolean backgroundMusicEnabled;

        @JsonProperty("soundEffectsEnabled")
        private boolean soundEffectsEnabled;

        // Getters and Setters
        public double getMusicVolume() { return musicVolume; }
        public void setMusicVolume(double musicVolume) { this.musicVolume = musicVolume; }

        public double getEffectsVolume() { return effectsVolume; }
        public void setEffectsVolume(double effectsVolume) { this.effectsVolume = effectsVolume; }

        public double getVoiceVolume() { return voiceVolume; }
        public void setVoiceVolume(double voiceVolume) { this.voiceVolume = voiceVolume; }

        public boolean isBackgroundMusicEnabled() { return backgroundMusicEnabled; }
        public void setBackgroundMusicEnabled(boolean backgroundMusicEnabled) { this.backgroundMusicEnabled = backgroundMusicEnabled; }

        public boolean isSoundEffectsEnabled() { return soundEffectsEnabled; }
        public void setSoundEffectsEnabled(boolean soundEffectsEnabled) { this.soundEffectsEnabled = soundEffectsEnabled; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PrivacyPreferencesResponse {
        @JsonProperty("dataCollectionEnabled")
        private boolean dataCollectionEnabled;

        @JsonProperty("analyticsEnabled")
        private boolean analyticsEnabled;

        @JsonProperty("crashReportingEnabled")
        private boolean crashReportingEnabled;

        @JsonProperty("personalizedContentEnabled")
        private boolean personalizedContentEnabled;

        // Getters and Setters
        public boolean isDataCollectionEnabled() { return dataCollectionEnabled; }
        public void setDataCollectionEnabled(boolean dataCollectionEnabled) { this.dataCollectionEnabled = dataCollectionEnabled; }

        public boolean isAnalyticsEnabled() { return analyticsEnabled; }
        public void setAnalyticsEnabled(boolean analyticsEnabled) { this.analyticsEnabled = analyticsEnabled; }

        public boolean isCrashReportingEnabled() { return crashReportingEnabled; }
        public void setCrashReportingEnabled(boolean crashReportingEnabled) { this.crashReportingEnabled = crashReportingEnabled; }

        public boolean isPersonalizedContentEnabled() { return personalizedContentEnabled; }
        public void setPersonalizedContentEnabled(boolean personalizedContentEnabled) { this.personalizedContentEnabled = personalizedContentEnabled; }
    }

    // Request DTOs

    /**
     * Create child profile request DTO
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CreateChildProfileRequest {
        @JsonProperty("name")
        private String name;

        @JsonProperty("avatar")
        private String avatar;

        @JsonProperty("birthDate")
        private LocalDate birthDate;

        // Getters and Setters
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getAvatar() { return avatar; }
        public void setAvatar(String avatar) { this.avatar = avatar; }

        public LocalDate getBirthDate() { return birthDate; }
        public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }
    }

    /**
     * Update user preferences request DTO
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class UpdateUserPreferencesRequest {
        @JsonProperty("language")
        private String language;

        @JsonProperty("timezone")
        private String timezone;

        @JsonProperty("theme")
        private String theme;

        @JsonProperty("notifications")
        private Map<String, Object> notifications;

        @JsonProperty("screenTime")
        private Map<String, Object> screenTime;

        @JsonProperty("audio")
        private Map<String, Object> audio;

        @JsonProperty("privacy")
        private Map<String, Object> privacy;

        // Getters and Setters
        public String getLanguage() { return language; }
        public void setLanguage(String language) { this.language = language; }

        public String getTimezone() { return timezone; }
        public void setTimezone(String timezone) { this.timezone = timezone; }

        public String getTheme() { return theme; }
        public void setTheme(String theme) { this.theme = theme; }

        public Map<String, Object> getNotifications() { return notifications; }
        public void setNotifications(Map<String, Object> notifications) { this.notifications = notifications; }

        public Map<String, Object> getScreenTime() { return screenTime; }
        public void setScreenTime(Map<String, Object> screenTime) { this.screenTime = screenTime; }

        public Map<String, Object> getAudio() { return audio; }
        public void setAudio(Map<String, Object> audio) { this.audio = audio; }

        public Map<String, Object> getPrivacy() { return privacy; }
        public void setPrivacy(Map<String, Object> privacy) { this.privacy = privacy; }
    }

    /**
     * Update child profile request DTO
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class UpdateChildProfileRequest {
        @JsonProperty("name")
        private String name;

        @JsonProperty("avatar")
        private String avatar;

        @JsonProperty("birthDate")
        private LocalDate birthDate;

        @JsonProperty("preferences")
        private Map<String, Object> preferences;

        // Getters and Setters
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getAvatar() { return avatar; }
        public void setAvatar(String avatar) { this.avatar = avatar; }

        public LocalDate getBirthDate() { return birthDate; }
        public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }

        public Map<String, Object> getPreferences() { return preferences; }
        public void setPreferences(Map<String, Object> preferences) { this.preferences = preferences; }
    }

    /**
     * Record screen time request DTO
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RecordScreenTimeRequest {
        @JsonProperty("childId")
        private String childId;

        @JsonProperty("sessionDurationMinutes")
        private int sessionDurationMinutes;

        @JsonProperty("activities")
        private List<String> activities;

        @JsonProperty("timestamp")
        private Instant timestamp;

        // Getters and Setters
        public String getChildId() { return childId; }
        public void setChildId(String childId) { this.childId = childId; }

        public int getSessionDurationMinutes() { return sessionDurationMinutes; }
        public void setSessionDurationMinutes(int sessionDurationMinutes) { this.sessionDurationMinutes = sessionDurationMinutes; }

        public List<String> getActivities() { return activities; }
        public void setActivities(List<String> activities) { this.activities = activities; }

        public Instant getTimestamp() { return timestamp; }
        public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
    }
}
