package com.app.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Child profile model for Firebase Firestore
 * Represents a child's profile within a parent's account
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class ChildProfile {

    @JsonProperty("id")
    private String id;

    @JsonProperty("name")
    private String name;

    @JsonProperty("avatar")
    private String avatar; // "boy" or "girl" or custom avatar URL

    @JsonProperty("ageRange")
    private String ageRange; // e.g., "2-3", "4-5", "6+"

    @JsonProperty("isActive")
    private boolean isActive = true;

    @JsonProperty("createdAt")
    private Instant createdAt;

    @JsonProperty("updatedAt")
    private Instant updatedAt;

    @JsonProperty("preferences")
    private ChildPreferences preferences;

    @JsonProperty("progress")
    private ChildProgress progress;

    @JsonProperty("screenTime")
    private ScreenTimeData screenTime;

    @JsonProperty("favorites")
    private List<String> favorites = new ArrayList<>(); // Story IDs

    @JsonProperty("metadata")
    private Map<String, Object> metadata = new HashMap<>();

    // Default constructor
    public ChildProfile() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        this.preferences = new ChildPreferences();
        this.progress = new ChildProgress();
        this.screenTime = new ScreenTimeData();
    }

    // Constructor for new child
    public ChildProfile(String id, String name, String avatar) {
        this();
        this.id = id;
        this.name = name;
        this.avatar = avatar;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
        this.updatedAt = Instant.now();
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
        this.updatedAt = Instant.now();
    }

    public String getAgeRange() {
        return ageRange;
    }

    public void setAgeRange(String ageRange) {
        this.ageRange = ageRange;
        this.updatedAt = Instant.now();
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
        this.updatedAt = Instant.now();
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

    public ChildPreferences getPreferences() {
        return preferences;
    }

    public void setPreferences(ChildPreferences preferences) {
        this.preferences = preferences;
    }

    public ChildProgress getProgress() {
        return progress;
    }

    public void setProgress(ChildProgress progress) {
        this.progress = progress;
    }

    public ScreenTimeData getScreenTime() {
        return screenTime;
    }

    public void setScreenTime(ScreenTimeData screenTime) {
        this.screenTime = screenTime;
    }

    public List<String> getFavorites() {
        return favorites;
    }

    public void setFavorites(List<String> favorites) {
        this.favorites = favorites;
    }

    public Map<String, Object> getMetadata() {
        return metadata;
    }

    public void setMetadata(Map<String, Object> metadata) {
        this.metadata = metadata;
    }

    // Helper methods
    public void addFavorite(String storyId) {
        if (this.favorites == null) {
            this.favorites = new ArrayList<>();
        }
        if (!this.favorites.contains(storyId)) {
            this.favorites.add(storyId);
            this.updatedAt = Instant.now();
        }
    }

    public void removeFavorite(String storyId) {
        if (this.favorites != null) {
            this.favorites.remove(storyId);
            this.updatedAt = Instant.now();
        }
    }

    public boolean isFavorite(String storyId) {
        return this.favorites != null && this.favorites.contains(storyId);
    }

    // Nested classes
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ChildPreferences {
        @JsonProperty("favoriteColors")
        private List<String> favoriteColors = new ArrayList<>();

        @JsonProperty("favoriteAnimals")
        private List<String> favoriteAnimals = new ArrayList<>();

        @JsonProperty("difficultyLevel")
        private String difficultyLevel = "beginner"; // "beginner", "intermediate", "advanced"

        @JsonProperty("autoplayEnabled")
        private boolean autoplayEnabled = true;

        @JsonProperty("subtitlesEnabled")
        private boolean subtitlesEnabled = false;

        // Getters and Setters
        public List<String> getFavoriteColors() { return favoriteColors; }
        public void setFavoriteColors(List<String> favoriteColors) { this.favoriteColors = favoriteColors; }

        public List<String> getFavoriteAnimals() { return favoriteAnimals; }
        public void setFavoriteAnimals(List<String> favoriteAnimals) { this.favoriteAnimals = favoriteAnimals; }

        public String getDifficultyLevel() { return difficultyLevel; }
        public void setDifficultyLevel(String difficultyLevel) { this.difficultyLevel = difficultyLevel; }

        public boolean isAutoplayEnabled() { return autoplayEnabled; }
        public void setAutoplayEnabled(boolean autoplayEnabled) { this.autoplayEnabled = autoplayEnabled; }

        public boolean isSubtitlesEnabled() { return subtitlesEnabled; }
        public void setSubtitlesEnabled(boolean subtitlesEnabled) { this.subtitlesEnabled = subtitlesEnabled; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ChildProgress {
        @JsonProperty("storiesCompleted")
        private int storiesCompleted = 0;

        @JsonProperty("totalTimeSpentMinutes")
        private int totalTimeSpentMinutes = 0;

        @JsonProperty("currentStreak")
        private int currentStreak = 0;

        @JsonProperty("longestStreak")
        private int longestStreak = 0;

        @JsonProperty("achievements")
        private List<String> achievements = new ArrayList<>();

        @JsonProperty("completedStories")
        private Map<String, Instant> completedStories = new HashMap<>();

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

        public Map<String, Instant> getCompletedStories() { return completedStories; }
        public void setCompletedStories(Map<String, Instant> completedStories) { this.completedStories = completedStories; }

        public Instant getLastActivityAt() { return lastActivityAt; }
        public void setLastActivityAt(Instant lastActivityAt) { this.lastActivityAt = lastActivityAt; }

        // Helper methods
        public void completeStory(String storyId) {
            if (completedStories == null) {
                completedStories = new HashMap<>();
            }
            if (!completedStories.containsKey(storyId)) {
                completedStories.put(storyId, Instant.now());
                storiesCompleted++;
            }
            lastActivityAt = Instant.now();
        }

        public boolean hasCompletedStory(String storyId) {
            return completedStories != null && completedStories.containsKey(storyId);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ScreenTimeData {
        @JsonProperty("todayMinutes")
        private int todayMinutes = 0;

        @JsonProperty("weekMinutes")
        private int weekMinutes = 0;

        @JsonProperty("monthMinutes")
        private int monthMinutes = 0;

        @JsonProperty("lastResetDate")
        private LocalDate lastResetDate = LocalDate.now();

        @JsonProperty("sessions")
        private List<SessionData> sessions = new ArrayList<>();

        // Getters and Setters
        public int getTodayMinutes() { return todayMinutes; }
        public void setTodayMinutes(int todayMinutes) { this.todayMinutes = todayMinutes; }

        public int getWeekMinutes() { return weekMinutes; }
        public void setWeekMinutes(int weekMinutes) { this.weekMinutes = weekMinutes; }

        public int getMonthMinutes() { return monthMinutes; }
        public void setMonthMinutes(int monthMinutes) { this.monthMinutes = monthMinutes; }

        public LocalDate getLastResetDate() { return lastResetDate; }
        public void setLastResetDate(LocalDate lastResetDate) { this.lastResetDate = lastResetDate; }

        public List<SessionData> getSessions() { return sessions; }
        public void setSessions(List<SessionData> sessions) { this.sessions = sessions; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SessionData {
        @JsonProperty("startTime")
        private Instant startTime;

        @JsonProperty("endTime")
        private Instant endTime;

        @JsonProperty("durationMinutes")
        private int durationMinutes;

        @JsonProperty("activities")
        private List<String> activities = new ArrayList<>();

        // Getters and Setters
        public Instant getStartTime() { return startTime; }
        public void setStartTime(Instant startTime) { this.startTime = startTime; }

        public Instant getEndTime() { return endTime; }
        public void setEndTime(Instant endTime) { this.endTime = endTime; }

        public int getDurationMinutes() { return durationMinutes; }
        public void setDurationMinutes(int durationMinutes) { this.durationMinutes = durationMinutes; }

        public List<String> getActivities() { return activities; }
        public void setActivities(List<String> activities) { this.activities = activities; }
    }

    @Override
    public String toString() {
        return "ChildProfile{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", avatar='" + avatar + '\'' +
                ", isActive=" + isActive +
                ", storiesCompleted=" + (progress != null ? progress.getStoriesCompleted() : 0) +
                '}';
    }
}
