package com.app.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class UserPreferences {

    @JsonProperty("notifications")
    private NotificationPreferences notifications;

    @JsonProperty("screenTime")
    private ScreenTimePreferences screenTime;

    @JsonProperty("audio")
    private AudioPreferences audio;

    @JsonProperty("privacy")
    private PrivacyPreferences privacy;

    @JsonProperty("language")
    private String language = "en";

    @JsonProperty("timezone")
    private String timezone = "UTC";

    @JsonProperty("theme")
    private String theme = "auto"; // "light", "dark", "auto"

    @JsonProperty("parentalControls")
    private ParentalControlPreferences parentalControls;

    @JsonProperty("customSettings")
    private Map<String, Object> customSettings = new HashMap<>();

    public UserPreferences() {
        this.notifications = new NotificationPreferences();
        this.screenTime = new ScreenTimePreferences();
        this.audio = new AudioPreferences();
        this.privacy = new PrivacyPreferences();
        this.parentalControls = new ParentalControlPreferences();
    }

    public NotificationPreferences getNotifications() {
        return notifications;
    }

    public void setNotifications(NotificationPreferences notifications) {
        this.notifications = notifications;
    }

    public ScreenTimePreferences getScreenTime() {
        return screenTime;
    }

    public void setScreenTime(ScreenTimePreferences screenTime) {
        this.screenTime = screenTime;
    }

    public AudioPreferences getAudio() {
        return audio;
    }

    public void setAudio(AudioPreferences audio) {
        this.audio = audio;
    }

    public PrivacyPreferences getPrivacy() {
        return privacy;
    }

    public void setPrivacy(PrivacyPreferences privacy) {
        this.privacy = privacy;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public String getTheme() {
        return theme;
    }

    public void setTheme(String theme) {
        this.theme = theme;
    }

    public ParentalControlPreferences getParentalControls() {
        return parentalControls;
    }

    public void setParentalControls(ParentalControlPreferences parentalControls) {
        this.parentalControls = parentalControls;
    }

    public Map<String, Object> getCustomSettings() {
        return customSettings;
    }

    public void setCustomSettings(Map<String, Object> customSettings) {
        this.customSettings = customSettings;
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class NotificationPreferences {
        @JsonProperty("pushEnabled")
        private boolean pushEnabled = true;

        @JsonProperty("emailEnabled")
        private boolean emailEnabled = true;

        @JsonProperty("reminderEnabled")
        private boolean reminderEnabled = true;

        @JsonProperty("quietHours")
        private QuietHours quietHours = new QuietHours();

        public boolean isPushEnabled() { return pushEnabled; }
        public void setPushEnabled(boolean pushEnabled) { this.pushEnabled = pushEnabled; }

        public boolean isEmailEnabled() { return emailEnabled; }
        public void setEmailEnabled(boolean emailEnabled) { this.emailEnabled = emailEnabled; }

        public boolean isReminderEnabled() { return reminderEnabled; }
        public void setReminderEnabled(boolean reminderEnabled) { this.reminderEnabled = reminderEnabled; }

        public QuietHours getQuietHours() { return quietHours; }
        public void setQuietHours(QuietHours quietHours) { this.quietHours = quietHours; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class QuietHours {
        @JsonProperty("enabled")
        private boolean enabled = false;

        @JsonProperty("startTime")
        private String startTime = "20:00";

        @JsonProperty("endTime")
        private String endTime = "08:00";

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }

        public String getStartTime() { return startTime; }
        public void setStartTime(String startTime) { this.startTime = startTime; }

        public String getEndTime() { return endTime; }
        public void setEndTime(String endTime) { this.endTime = endTime; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ScreenTimePreferences {
        @JsonProperty("dailyLimitMinutes")
        private int dailyLimitMinutes = 120;

        @JsonProperty("warningMinutes")
        private int warningMinutes = 15;

        @JsonProperty("bedtimeEnabled")
        private boolean bedtimeEnabled = false;

        @JsonProperty("bedtimeStart")
        private String bedtimeStart = "19:00";

        @JsonProperty("bedtimeEnd")
        private String bedtimeEnd = "07:00";

        public int getDailyLimitMinutes() { return dailyLimitMinutes; }
        public void setDailyLimitMinutes(int dailyLimitMinutes) { this.dailyLimitMinutes = dailyLimitMinutes; }

        public int getWarningMinutes() { return warningMinutes; }
        public void setWarningMinutes(int warningMinutes) { this.warningMinutes = warningMinutes; }

        public boolean isBedtimeEnabled() { return bedtimeEnabled; }
        public void setBedtimeEnabled(boolean bedtimeEnabled) { this.bedtimeEnabled = bedtimeEnabled; }

        public String getBedtimeStart() { return bedtimeStart; }
        public void setBedtimeStart(String bedtimeStart) { this.bedtimeStart = bedtimeStart; }

        public String getBedtimeEnd() { return bedtimeEnd; }
        public void setBedtimeEnd(String bedtimeEnd) { this.bedtimeEnd = bedtimeEnd; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AudioPreferences {
        @JsonProperty("musicVolume")
        private double musicVolume = 0.6;

        @JsonProperty("effectsVolume")
        private double effectsVolume = 0.8;

        @JsonProperty("voiceVolume")
        private double voiceVolume = 1.0;

        @JsonProperty("backgroundMusicEnabled")
        private boolean backgroundMusicEnabled = true;

        @JsonProperty("soundEffectsEnabled")
        private boolean soundEffectsEnabled = true;

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
    public static class PrivacyPreferences {
        @JsonProperty("dataCollectionEnabled")
        private boolean dataCollectionEnabled = true;

        @JsonProperty("analyticsEnabled")
        private boolean analyticsEnabled = true;

        @JsonProperty("crashReportingEnabled")
        private boolean crashReportingEnabled = true;

        @JsonProperty("personalizedContentEnabled")
        private boolean personalizedContentEnabled = true;

        public boolean isDataCollectionEnabled() { return dataCollectionEnabled; }
        public void setDataCollectionEnabled(boolean dataCollectionEnabled) { this.dataCollectionEnabled = dataCollectionEnabled; }

        public boolean isAnalyticsEnabled() { return analyticsEnabled; }
        public void setAnalyticsEnabled(boolean analyticsEnabled) { this.analyticsEnabled = analyticsEnabled; }

        public boolean isCrashReportingEnabled() { return crashReportingEnabled; }
        public void setCrashReportingEnabled(boolean crashReportingEnabled) { this.crashReportingEnabled = crashReportingEnabled; }

        public boolean isPersonalizedContentEnabled() { return personalizedContentEnabled; }
        public void setPersonalizedContentEnabled(boolean personalizedContentEnabled) { this.personalizedContentEnabled = personalizedContentEnabled; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ParentalControlPreferences {
        @JsonProperty("contentFilterEnabled")
        private boolean contentFilterEnabled = true;

        @JsonProperty("allowedAgeRanges")
        private List<String> allowedAgeRanges = new ArrayList<>();

        @JsonProperty("blockedCategories")
        private List<String> blockedCategories = new ArrayList<>();

        @JsonProperty("requireParentApproval")
        private boolean requireParentApproval = false;

        public ParentalControlPreferences() {
            allowedAgeRanges.add("2-3");
            allowedAgeRanges.add("3-4");
            allowedAgeRanges.add("4-5");
        }

        public boolean isContentFilterEnabled() { return contentFilterEnabled; }
        public void setContentFilterEnabled(boolean contentFilterEnabled) { this.contentFilterEnabled = contentFilterEnabled; }

        public List<String> getAllowedAgeRanges() { return allowedAgeRanges; }
        public void setAllowedAgeRanges(List<String> allowedAgeRanges) { this.allowedAgeRanges = allowedAgeRanges; }

        public List<String> getBlockedCategories() { return blockedCategories; }
        public void setBlockedCategories(List<String> blockedCategories) { this.blockedCategories = blockedCategories; }

        public boolean isRequireParentApproval() { return requireParentApproval; }
        public void setRequireParentApproval(boolean requireParentApproval) { this.requireParentApproval = requireParentApproval; }
    }
}
