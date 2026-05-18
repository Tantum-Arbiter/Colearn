package com.app.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.cloud.firestore.annotation.PropertyName;

import java.util.Objects;

/**
 * Jigsaw puzzle configuration for a story page.
 * Turns the page's background image into a puzzle that must be reassembled.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class JigsawPuzzle {

    @JsonProperty("enabled")
    @PropertyName("enabled")
    private boolean enabled;

    @JsonProperty("gridSize")
    @PropertyName("gridSize")
    private String gridSize; // "4x4", "6x6", or "8x8"

    @JsonProperty("promptText")
    @PropertyName("promptText")
    private String promptText;

    @JsonProperty("allowSkip")
    @PropertyName("allowSkip")
    private boolean allowSkip;

    public JigsawPuzzle() {
        this.enabled = true;
        this.gridSize = "4x4";
        this.allowSkip = true;
    }

    @PropertyName("enabled")
    public boolean isEnabled() { return enabled; }
    @PropertyName("enabled")
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    @PropertyName("gridSize")
    public String getGridSize() { return gridSize; }
    @PropertyName("gridSize")
    public void setGridSize(String gridSize) { this.gridSize = gridSize; }

    @PropertyName("promptText")
    public String getPromptText() { return promptText; }
    @PropertyName("promptText")
    public void setPromptText(String promptText) { this.promptText = promptText; }

    @PropertyName("allowSkip")
    public boolean isAllowSkip() { return allowSkip; }
    @PropertyName("allowSkip")
    public void setAllowSkip(boolean allowSkip) { this.allowSkip = allowSkip; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        JigsawPuzzle that = (JigsawPuzzle) o;
        return enabled == that.enabled &&
                allowSkip == that.allowSkip &&
                Objects.equals(gridSize, that.gridSize) &&
                Objects.equals(promptText, that.promptText);
    }

    @Override
    public int hashCode() {
        return Objects.hash(enabled, gridSize, promptText, allowSkip);
    }

    @Override
    public String toString() {
        return "JigsawPuzzle{" +
                "enabled=" + enabled +
                ", gridSize='" + gridSize + '\'' +
                ", promptText='" + promptText + '\'' +
                ", allowSkip=" + allowSkip +
                '}';
    }
}
