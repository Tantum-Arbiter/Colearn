package com.app.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.cloud.firestore.annotation.PropertyName;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@JsonInclude(JsonInclude.Include.NON_NULL)
public class StoryPage {

    @JsonProperty("id")
    @PropertyName("id")
    private String id;

    @JsonProperty("pageNumber")
    @PropertyName("pageNumber")
    private int pageNumber;

    @JsonProperty("type")
    @PropertyName("type")
    private String type;

    @JsonProperty("text")
    @PropertyName("text")
    private String text;

    @JsonProperty("localizedText")
    @PropertyName("localizedText")
    private LocalizedText localizedText;

    @JsonProperty("backgroundImage")
    @PropertyName("backgroundImage")
    private String backgroundImage;

    @JsonProperty("characterImage")
    @PropertyName("characterImage")
    private String characterImage;

    @JsonProperty("interactiveElements")
    @PropertyName("interactiveElements")
    private List<InteractiveElement> interactiveElements;

    public StoryPage() {
        this.interactiveElements = new ArrayList<>();
    }

    public StoryPage(String id, int pageNumber, String text) {
        this();
        this.id = id;
        this.pageNumber = pageNumber;
        this.text = text;
    }

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

    public LocalizedText getLocalizedText() {
        return localizedText;
    }

    public void setLocalizedText(LocalizedText localizedText) {
        this.localizedText = localizedText;
    }

    public String getTextForLanguage(String languageCode) {
        if (localizedText != null) {
            String localized = localizedText.getText(languageCode);
            if (localized != null) return localized;
        }
        return text;
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

    public List<InteractiveElement> getInteractiveElements() {
        return interactiveElements;
    }

    public void setInteractiveElements(List<InteractiveElement> interactiveElements) {
        this.interactiveElements = interactiveElements;
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

