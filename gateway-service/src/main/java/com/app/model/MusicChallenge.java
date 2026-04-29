package com.app.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.cloud.firestore.annotation.PropertyName;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Music challenge configuration for a story page.
 * Defines the instrument, required note sequence, and success behavior.
 * All referenced assets (instrument, song) are local on device.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MusicChallenge {

    @JsonProperty("enabled")
    @PropertyName("enabled")
    private boolean enabled;

    @JsonProperty("instrumentId")
    @PropertyName("instrumentId")
    private String instrumentId;

    @JsonProperty("promptText")
    @PropertyName("promptText")
    private String promptText;

    @JsonProperty("mode")
    @PropertyName("mode")
    private String mode; // "guided" or "free_play_optional"

    @JsonProperty("requiredSequence")
    @PropertyName("requiredSequence")
    private List<String> requiredSequence;

    @JsonProperty("successSongId")
    @PropertyName("successSongId")
    private String successSongId;

    @JsonProperty("successStateId")
    @PropertyName("successStateId")
    private String successStateId;

    @JsonProperty("autoPlaySuccessSong")
    @PropertyName("autoPlaySuccessSong")
    private boolean autoPlaySuccessSong;

    @JsonProperty("allowSkip")
    @PropertyName("allowSkip")
    private boolean allowSkip;

    @JsonProperty("micRequired")
    @PropertyName("micRequired")
    private boolean micRequired;

    @JsonProperty("fallbackAllowed")
    @PropertyName("fallbackAllowed")
    private boolean fallbackAllowed;

    @JsonProperty("hintLevel")
    @PropertyName("hintLevel")
    private String hintLevel; // "none", "minimal", "standard", "verbose"

    public MusicChallenge() {
        this.enabled = true;
        this.mode = "guided";
        this.requiredSequence = new ArrayList<>();
        this.autoPlaySuccessSong = true;
        this.allowSkip = false;
        this.micRequired = true;
        this.fallbackAllowed = true;
        this.hintLevel = "standard";
    }

    // Getters and setters

    @PropertyName("enabled")
    public boolean isEnabled() { return enabled; }
    @PropertyName("enabled")
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    @PropertyName("instrumentId")
    public String getInstrumentId() { return instrumentId; }
    @PropertyName("instrumentId")
    public void setInstrumentId(String instrumentId) { this.instrumentId = instrumentId; }

    @PropertyName("promptText")
    public String getPromptText() { return promptText; }
    @PropertyName("promptText")
    public void setPromptText(String promptText) { this.promptText = promptText; }

    @PropertyName("mode")
    public String getMode() { return mode; }
    @PropertyName("mode")
    public void setMode(String mode) { this.mode = mode; }

    @PropertyName("requiredSequence")
    public List<String> getRequiredSequence() { return requiredSequence; }
    @PropertyName("requiredSequence")
    public void setRequiredSequence(List<String> requiredSequence) { this.requiredSequence = requiredSequence; }

    @PropertyName("successSongId")
    public String getSuccessSongId() { return successSongId; }
    @PropertyName("successSongId")
    public void setSuccessSongId(String successSongId) { this.successSongId = successSongId; }

    @PropertyName("successStateId")
    public String getSuccessStateId() { return successStateId; }
    @PropertyName("successStateId")
    public void setSuccessStateId(String successStateId) { this.successStateId = successStateId; }

    @PropertyName("autoPlaySuccessSong")
    public boolean isAutoPlaySuccessSong() { return autoPlaySuccessSong; }
    @PropertyName("autoPlaySuccessSong")
    public void setAutoPlaySuccessSong(boolean autoPlaySuccessSong) { this.autoPlaySuccessSong = autoPlaySuccessSong; }

    @PropertyName("allowSkip")
    public boolean isAllowSkip() { return allowSkip; }
    @PropertyName("allowSkip")
    public void setAllowSkip(boolean allowSkip) { this.allowSkip = allowSkip; }

    @PropertyName("micRequired")
    public boolean isMicRequired() { return micRequired; }
    @PropertyName("micRequired")
    public void setMicRequired(boolean micRequired) { this.micRequired = micRequired; }

    @PropertyName("fallbackAllowed")
    public boolean isFallbackAllowed() { return fallbackAllowed; }
    @PropertyName("fallbackAllowed")
    public void setFallbackAllowed(boolean fallbackAllowed) { this.fallbackAllowed = fallbackAllowed; }

    @PropertyName("hintLevel")
    public String getHintLevel() { return hintLevel; }
    @PropertyName("hintLevel")
    public void setHintLevel(String hintLevel) { this.hintLevel = hintLevel; }


    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        MusicChallenge that = (MusicChallenge) o;
        return enabled == that.enabled &&
                Objects.equals(instrumentId, that.instrumentId) &&
                Objects.equals(successSongId, that.successSongId) &&
                Objects.equals(requiredSequence, that.requiredSequence);
    }

    @Override
    public int hashCode() {
        return Objects.hash(enabled, instrumentId, successSongId, requiredSequence);
    }

    @Override
    public String toString() {
        return "MusicChallenge{" +
                "enabled=" + enabled +
                ", instrumentId='" + instrumentId + '\'' +
                ", mode='" + mode + '\'' +
                ", requiredSequence=" + requiredSequence +
                ", successSongId='" + successSongId + '\'' +
                '}';
    }
}