package com.app.dto;

import java.util.List;
import java.util.Map;

/**
 * Data Transfer Objects for Content Management System
 */
public class ContentDTOs {

    public static class StoryMetadata {
        private String id;
        private String title;
        private String category;
        private String tag;
        private String emoji;
        private String coverImage;
        private boolean isAvailable;
        private String ageRange;
        private int duration;
        private String description;
        private List<StoryPageMetadata> pages;
        private String createdAt;
        private String updatedAt;

        // Getters and setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public String getTag() { return tag; }
        public void setTag(String tag) { this.tag = tag; }
        public String getEmoji() { return emoji; }
        public void setEmoji(String emoji) { this.emoji = emoji; }
        public String getCoverImage() { return coverImage; }
        public void setCoverImage(String coverImage) { this.coverImage = coverImage; }
        public boolean isAvailable() { return isAvailable; }
        public void setAvailable(boolean available) { isAvailable = available; }
        public String getAgeRange() { return ageRange; }
        public void setAgeRange(String ageRange) { this.ageRange = ageRange; }
        public int getDuration() { return duration; }
        public void setDuration(int duration) { this.duration = duration; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public List<StoryPageMetadata> getPages() { return pages; }
        public void setPages(List<StoryPageMetadata> pages) { this.pages = pages; }
        public String getCreatedAt() { return createdAt; }
        public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
        public String getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
    }

    public static class StoryPageMetadata {
        private String id;
        private int pageNumber;
        private String backgroundImage;
        private String text;
        private String audioFile;
        private List<AnimationMetadata> animations;

        // Getters and setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public int getPageNumber() { return pageNumber; }
        public void setPageNumber(int pageNumber) { this.pageNumber = pageNumber; }
        public String getBackgroundImage() { return backgroundImage; }
        public void setBackgroundImage(String backgroundImage) { this.backgroundImage = backgroundImage; }
        public String getText() { return text; }
        public void setText(String text) { this.text = text; }
        public String getAudioFile() { return audioFile; }
        public void setAudioFile(String audioFile) { this.audioFile = audioFile; }
        public List<AnimationMetadata> getAnimations() { return animations; }
        public void setAnimations(List<AnimationMetadata> animations) { this.animations = animations; }
    }

    public static class AnimationMetadata {
        private String type;
        private String element;
        private Integer duration;
        private Integer delay;

        // Getters and setters
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getElement() { return element; }
        public void setElement(String element) { this.element = element; }
        public Integer getDuration() { return duration; }
        public void setDuration(Integer duration) { this.duration = duration; }
        public Integer getDelay() { return delay; }
        public void setDelay(Integer delay) { this.delay = delay; }
    }

    public static class CMSContent {
        private List<StoryMetadata> stories;
        private List<ContentCategory> categories;
        private AppSettings settings;
        private String version;
        private String lastUpdated;

        // Getters and setters
        public List<StoryMetadata> getStories() { return stories; }
        public void setStories(List<StoryMetadata> stories) { this.stories = stories; }
        public List<ContentCategory> getCategories() { return categories; }
        public void setCategories(List<ContentCategory> categories) { this.categories = categories; }
        public AppSettings getSettings() { return settings; }
        public void setSettings(AppSettings settings) { this.settings = settings; }
        public String getVersion() { return version; }
        public void setVersion(String version) { this.version = version; }
        public String getLastUpdated() { return lastUpdated; }
        public void setLastUpdated(String lastUpdated) { this.lastUpdated = lastUpdated; }
    }

    public static class ContentCategory {
        private String id;
        private String name;
        private String emoji;
        private String description;
        private int sortOrder;
        private boolean isActive;

        // Getters and setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getEmoji() { return emoji; }
        public void setEmoji(String emoji) { this.emoji = emoji; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public int getSortOrder() { return sortOrder; }
        public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
        public boolean isActive() { return isActive; }
        public void setActive(boolean active) { isActive = active; }
    }

    public static class AppSettings {
        private boolean maintenanceMode;
        private String minAppVersion;
        private int maxDailyUsage;
        private List<String> featuresEnabled;
        private List<Announcement> announcements;

        // Getters and setters
        public boolean isMaintenanceMode() { return maintenanceMode; }
        public void setMaintenanceMode(boolean maintenanceMode) { this.maintenanceMode = maintenanceMode; }
        public String getMinAppVersion() { return minAppVersion; }
        public void setMinAppVersion(String minAppVersion) { this.minAppVersion = minAppVersion; }
        public int getMaxDailyUsage() { return maxDailyUsage; }
        public void setMaxDailyUsage(int maxDailyUsage) { this.maxDailyUsage = maxDailyUsage; }
        public List<String> getFeaturesEnabled() { return featuresEnabled; }
        public void setFeaturesEnabled(List<String> featuresEnabled) { this.featuresEnabled = featuresEnabled; }
        public List<Announcement> getAnnouncements() { return announcements; }
        public void setAnnouncements(List<Announcement> announcements) { this.announcements = announcements; }
    }

    public static class Announcement {
        private String id;
        private String title;
        private String message;
        private String type;
        private String startDate;
        private String endDate;
        private List<String> targetAudience;

        // Getters and setters
        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getStartDate() { return startDate; }
        public void setStartDate(String startDate) { this.startDate = startDate; }
        public String getEndDate() { return endDate; }
        public void setEndDate(String endDate) { this.endDate = endDate; }
        public List<String> getTargetAudience() { return targetAudience; }
        public void setTargetAudience(List<String> targetAudience) { this.targetAudience = targetAudience; }
    }

    public static class UserPreferences {
        private String childName;
        private Integer childAge;
        private boolean screenTimeEnabled;
        private boolean notificationsEnabled;
        private int musicVolume;
        private String preferredLanguage;
        private String theme;

        // Getters and setters
        public String getChildName() { return childName; }
        public void setChildName(String childName) { this.childName = childName; }
        public Integer getChildAge() { return childAge; }
        public void setChildAge(Integer childAge) { this.childAge = childAge; }
        public boolean isScreenTimeEnabled() { return screenTimeEnabled; }
        public void setScreenTimeEnabled(boolean screenTimeEnabled) { this.screenTimeEnabled = screenTimeEnabled; }
        public boolean isNotificationsEnabled() { return notificationsEnabled; }
        public void setNotificationsEnabled(boolean notificationsEnabled) { this.notificationsEnabled = notificationsEnabled; }
        public int getMusicVolume() { return musicVolume; }
        public void setMusicVolume(int musicVolume) { this.musicVolume = musicVolume; }
        public String getPreferredLanguage() { return preferredLanguage; }
        public void setPreferredLanguage(String preferredLanguage) { this.preferredLanguage = preferredLanguage; }
        public String getTheme() { return theme; }
        public void setTheme(String theme) { this.theme = theme; }
    }

    public static class APIError {
        private String error;
        private String message;
        private int statusCode;
        private String timestamp;
        private String path;
        private Map<String, Object> details;

        // Getters and setters
        public String getError() { return error; }
        public void setError(String error) { this.error = error; }
        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public int getStatusCode() { return statusCode; }
        public void setStatusCode(int statusCode) { this.statusCode = statusCode; }
        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
        public String getPath() { return path; }
        public void setPath(String path) { this.path = path; }
        public Map<String, Object> getDetails() { return details; }
        public void setDetails(Map<String, Object> details) { this.details = details; }
    }
}
