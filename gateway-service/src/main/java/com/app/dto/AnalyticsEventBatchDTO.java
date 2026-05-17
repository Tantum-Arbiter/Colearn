package com.app.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

/**
 * DTO for receiving a batch of anonymous analytics events from the app.
 * 
 * Privacy-safe by design:
 * - sessionId is a non-persistent UUID generated per app launch (not stored, not linkable)
 * - No userId, no deviceId, no IP address forwarded
 * - Duration values are bucketed on the client side
 * - All data is used solely for Prometheus counter increments (no persistence)
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class AnalyticsEventBatchDTO {

    @NotBlank(message = "sessionId is required")
    @JsonProperty("sessionId")
    private String sessionId;

    @NotBlank(message = "platform is required")
    @JsonProperty("platform")
    private String platform;

    @JsonProperty("appVersion")
    private String appVersion;

    @JsonProperty("locale")
    private String locale;

    @NotEmpty(message = "events list must not be empty")
    @Size(max = 500, message = "events batch must not exceed 500 events")
    @Valid
    @JsonProperty("events")
    private List<AnalyticsEvent> events;

    // Getters and Setters
    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }

    public String getAppVersion() { return appVersion; }
    public void setAppVersion(String appVersion) { this.appVersion = appVersion; }

    public String getLocale() { return locale; }
    public void setLocale(String locale) { this.locale = locale; }

    public List<AnalyticsEvent> getEvents() { return events; }
    public void setEvents(List<AnalyticsEvent> events) { this.events = events; }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AnalyticsEvent {

        @NotBlank(message = "event name is required")
        @JsonProperty("event")
        private String event;

        /** Flexible properties bag — different events carry different fields.
         *  e.g. storyId, category, storyType, instrumentId, durationBucket, trigger, step, etc.
         *  No PII should ever appear here — the app enforces this client-side. */
        @JsonProperty("properties")
        private Map<String, String> properties;

        public String getEvent() { return event; }
        public void setEvent(String event) { this.event = event; }

        public Map<String, String> getProperties() { return properties; }
        public void setProperties(Map<String, String> properties) { this.properties = properties; }
    }
}
