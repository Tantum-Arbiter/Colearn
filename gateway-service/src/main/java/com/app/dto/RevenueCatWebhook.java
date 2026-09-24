package com.app.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class RevenueCatWebhook {

    private Event event;

    public Event getEvent() { return event; }
    public void setEvent(Event event) { this.event = event; }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Event {

        private String type;
        @JsonProperty("app_user_id")
        private String appUserId;
        @JsonProperty("original_app_user_id")
        private String originalAppUserId;
        private List<String> aliases;
        @JsonProperty("entitlement_ids")
        private List<String> entitlementIds;
        @JsonProperty("expiration_at_ms")
        private Long expirationAtMs;
        @JsonProperty("event_timestamp_ms")
        private long eventTimestampMs;
        private String environment;
        @JsonProperty("transferred_from")
        private List<String> transferredFrom;
        @JsonProperty("transferred_to")
        private List<String> transferredTo;

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getAppUserId() { return appUserId; }
        public void setAppUserId(String appUserId) { this.appUserId = appUserId; }
        public String getOriginalAppUserId() { return originalAppUserId; }
        public void setOriginalAppUserId(String originalAppUserId) { this.originalAppUserId = originalAppUserId; }
        public List<String> getAliases() { return aliases; }
        public void setAliases(List<String> aliases) { this.aliases = aliases; }
        public List<String> getEntitlementIds() { return entitlementIds; }
        public void setEntitlementIds(List<String> entitlementIds) { this.entitlementIds = entitlementIds; }
        public Long getExpirationAtMs() { return expirationAtMs; }
        public void setExpirationAtMs(Long expirationAtMs) { this.expirationAtMs = expirationAtMs; }
        public long getEventTimestampMs() { return eventTimestampMs; }
        public void setEventTimestampMs(long eventTimestampMs) { this.eventTimestampMs = eventTimestampMs; }
        public String getEnvironment() { return environment; }
        public void setEnvironment(String environment) { this.environment = environment; }
        public List<String> getTransferredFrom() { return transferredFrom; }
        public void setTransferredFrom(List<String> transferredFrom) { this.transferredFrom = transferredFrom; }
        public List<String> getTransferredTo() { return transferredTo; }
        public void setTransferredTo(List<String> transferredTo) { this.transferredTo = transferredTo; }
    }
}
