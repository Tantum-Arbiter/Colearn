package com.app.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.annotation.IgnoreExtraProperties;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@IgnoreExtraProperties
public class Child {

    private String childId;
    private String nickname;
    private String avatarType;
    private String avatarId;
    private String ageBucket;
    private String language;
    private Double textSizeScale;
    private Favorites favorites = new Favorites();
    private Map<String, StoryProgressEntry> storyProgress = new HashMap<>();
    private List<String> finishedStoryIds = new ArrayList<>();
    private Map<String, Long> challengeCounts = new HashMap<>();
    private List<String> achievements = new ArrayList<>();
    private Settings settings = new Settings();
    private long version;
    private Timestamp updatedAt;

    public String getChildId() { return childId; }
    public void setChildId(String childId) { this.childId = childId; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public String getAvatarType() { return avatarType; }
    public void setAvatarType(String avatarType) { this.avatarType = avatarType; }
    public String getAvatarId() { return avatarId; }
    public void setAvatarId(String avatarId) { this.avatarId = avatarId; }
    public String getAgeBucket() { return ageBucket; }
    public void setAgeBucket(String ageBucket) { this.ageBucket = ageBucket; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
    public Double getTextSizeScale() { return textSizeScale; }
    public void setTextSizeScale(Double textSizeScale) { this.textSizeScale = textSizeScale; }
    public Favorites getFavorites() { return favorites; }
    public void setFavorites(Favorites favorites) { this.favorites = favorites; }
    public Map<String, StoryProgressEntry> getStoryProgress() { return storyProgress; }
    public void setStoryProgress(Map<String, StoryProgressEntry> storyProgress) { this.storyProgress = storyProgress; }
    public List<String> getFinishedStoryIds() { return finishedStoryIds; }
    public void setFinishedStoryIds(List<String> finishedStoryIds) { this.finishedStoryIds = finishedStoryIds; }
    public Map<String, Long> getChallengeCounts() { return challengeCounts; }
    public void setChallengeCounts(Map<String, Long> challengeCounts) { this.challengeCounts = challengeCounts; }
    public List<String> getAchievements() { return achievements; }
    public void setAchievements(List<String> achievements) { this.achievements = achievements; }
    public Settings getSettings() { return settings; }
    public void setSettings(Settings settings) { this.settings = settings; }
    public long getVersion() { return version; }
    public void setVersion(long version) { this.version = version; }

    @JsonIgnore
    public Timestamp getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Timestamp updatedAt) { this.updatedAt = updatedAt; }

    public static class Favorites {
        private List<String> stories = new ArrayList<>();
        private List<String> activities = new ArrayList<>();
        private List<String> songs = new ArrayList<>();

        public List<String> getStories() { return stories; }
        public void setStories(List<String> stories) { this.stories = stories; }
        public List<String> getActivities() { return activities; }
        public void setActivities(List<String> activities) { this.activities = activities; }
        public List<String> getSongs() { return songs; }
        public void setSongs(List<String> songs) { this.songs = songs; }
    }

    public static class StoryProgressEntry {
        private long pageIndex;
        private long totalPages;
        private long finishedCount;

        public long getPageIndex() { return pageIndex; }
        public void setPageIndex(long pageIndex) { this.pageIndex = pageIndex; }
        public long getTotalPages() { return totalPages; }
        public void setTotalPages(long totalPages) { this.totalPages = totalPages; }
        public long getFinishedCount() { return finishedCount; }
        public void setFinishedCount(long finishedCount) { this.finishedCount = finishedCount; }
    }

    public static class Settings {
        private Boolean screenTimeEnabled;
        private Boolean smartRemindersEnabled;
        private List<Reminder> customReminders = new ArrayList<>();

        public Boolean getScreenTimeEnabled() { return screenTimeEnabled; }
        public void setScreenTimeEnabled(Boolean screenTimeEnabled) { this.screenTimeEnabled = screenTimeEnabled; }
        public Boolean getSmartRemindersEnabled() { return smartRemindersEnabled; }
        public void setSmartRemindersEnabled(Boolean smartRemindersEnabled) { this.smartRemindersEnabled = smartRemindersEnabled; }
        public List<Reminder> getCustomReminders() { return customReminders; }
        public void setCustomReminders(List<Reminder> customReminders) { this.customReminders = customReminders; }
    }

    public static class Reminder {
        private String id;
        private String title;
        private String message;
        private long dayOfWeek;
        private String time;
        private boolean active;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public long getDayOfWeek() { return dayOfWeek; }
        public void setDayOfWeek(long dayOfWeek) { this.dayOfWeek = dayOfWeek; }
        public String getTime() { return time; }
        public void setTime(String time) { this.time = time; }
        public boolean isActive() { return active; }
        public void setActive(boolean active) { this.active = active; }
    }
}
