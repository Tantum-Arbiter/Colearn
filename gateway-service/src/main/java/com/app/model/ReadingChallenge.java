package com.app.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.cloud.firestore.annotation.PropertyName;

import java.util.List;
import java.util.Objects;

/**
 * Reading challenge configuration for a story page.
 * Supports two modes:
 *   - fill_in_blank: words are removed from the story text and the user must tap them in order
 *   - spell_word: the user spells a target word by selecting letters
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ReadingChallenge {

    @JsonProperty("enabled")
    @PropertyName("enabled")
    private boolean enabled;

    @JsonProperty("mode")
    @PropertyName("mode")
    private String mode; // "fill_in_blank" or "spell_word"

    @JsonProperty("promptText")
    @PropertyName("promptText")
    private String promptText;

    @JsonProperty("allowSkip")
    @PropertyName("allowSkip")
    private boolean allowSkip;

    @JsonProperty("blankWordIndices")
    @PropertyName("blankWordIndices")
    private List<Integer> blankWordIndices;

    @JsonProperty("targetWord")
    @PropertyName("targetWord")
    private String targetWord;

    @JsonProperty("distractorLetters")
    @PropertyName("distractorLetters")
    private List<String> distractorLetters;

    public ReadingChallenge() {
        this.enabled = true;
        this.mode = "fill_in_blank";
        this.allowSkip = true;
    }

    @PropertyName("enabled")
    public boolean isEnabled() { return enabled; }
    @PropertyName("enabled")
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    @PropertyName("mode")
    public String getMode() { return mode; }
    @PropertyName("mode")
    public void setMode(String mode) { this.mode = mode; }

    @PropertyName("promptText")
    public String getPromptText() { return promptText; }
    @PropertyName("promptText")
    public void setPromptText(String promptText) { this.promptText = promptText; }

    @PropertyName("allowSkip")
    public boolean isAllowSkip() { return allowSkip; }
    @PropertyName("allowSkip")
    public void setAllowSkip(boolean allowSkip) { this.allowSkip = allowSkip; }

    @PropertyName("blankWordIndices")
    public List<Integer> getBlankWordIndices() { return blankWordIndices; }
    @PropertyName("blankWordIndices")
    public void setBlankWordIndices(List<Integer> blankWordIndices) { this.blankWordIndices = blankWordIndices; }

    @PropertyName("targetWord")
    public String getTargetWord() { return targetWord; }
    @PropertyName("targetWord")
    public void setTargetWord(String targetWord) { this.targetWord = targetWord; }

    @PropertyName("distractorLetters")
    public List<String> getDistractorLetters() { return distractorLetters; }
    @PropertyName("distractorLetters")
    public void setDistractorLetters(List<String> distractorLetters) { this.distractorLetters = distractorLetters; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ReadingChallenge that = (ReadingChallenge) o;
        return enabled == that.enabled &&
                allowSkip == that.allowSkip &&
                Objects.equals(mode, that.mode) &&
                Objects.equals(promptText, that.promptText) &&
                Objects.equals(blankWordIndices, that.blankWordIndices) &&
                Objects.equals(targetWord, that.targetWord) &&
                Objects.equals(distractorLetters, that.distractorLetters);
    }

    @Override
    public int hashCode() {
        return Objects.hash(enabled, mode, promptText, allowSkip, blankWordIndices, targetWord, distractorLetters);
    }

    @Override
    public String toString() {
        return "ReadingChallenge{" +
                "enabled=" + enabled +
                ", mode='" + mode + '\'' +
                ", promptText='" + promptText + '\'' +
                ", allowSkip=" + allowSkip +
                ", blankWordIndices=" + blankWordIndices +
                ", targetWord='" + targetWord + '\'' +
                ", distractorLetters=" + distractorLetters +
                '}';
    }
}
