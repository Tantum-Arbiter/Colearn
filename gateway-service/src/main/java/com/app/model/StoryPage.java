package com.app.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Objects;

/**
 * Represents a single page in a story
 * Contains text and references to visual assets (stored in iOS/Android asset packs)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class StoryPage {

    @JsonProperty("id")
    private String id;

    @JsonProperty("pageNumber")
    private int pageNumber;

    @JsonProperty("type")
    private String type; // e.g., "cover", "story"

    @JsonProperty("text")
    private String text;

    @JsonProperty("backgroundImage")
    private String backgroundImage; // Asset path reference (not URL)

    @JsonProperty("characterImage")
    private String characterImage; // Asset path reference (not URL)

    // Constructors
    public StoryPage() {
    }

    public StoryPage(String id, int pageNumber, String text) {
        this.id = id;
        this.pageNumber = pageNumber;
        this.text = text;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public int getPageNumber() {
        return pageNumber;
    }

    public void setPageNumber(int pageNumber) {
        this.pageNumber = pageNumber;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getBackgroundImage() {
        return backgroundImage;
    }

    public void setBackgroundImage(String backgroundImage) {
        this.backgroundImage = backgroundImage;
    }

    public String getCharacterImage() {
        return characterImage;
    }

    public void setCharacterImage(String characterImage) {
        this.characterImage = characterImage;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        StoryPage storyPage = (StoryPage) o;
        return pageNumber == storyPage.pageNumber &&
                Objects.equals(id, storyPage.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, pageNumber);
    }

    @Override
    public String toString() {
        return "StoryPage{" +
                "id='" + id + '\'' +
                ", pageNumber=" + pageNumber +
                ", type='" + type + '\'' +
                ", text='" + text + '\'' +
                '}';
    }
}

